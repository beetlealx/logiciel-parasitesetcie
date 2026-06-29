'use server'

import { createClient } from '@/lib/supabase/server'
import { saveDolibarrProposal, createDolibarrInvoice, validateProposal, downloadProposalPdf, getProposalsByTiers, getProposalLines, type DocLine, type DevisItem } from '@/lib/dolibarr'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function buildDevisHtml(data: {
  ref: string
  client_name: string
  totalHT: number
  totalTTC: number
  lines: DocLine[]
}) {
  const fmtEur = (v: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)

  const rows = data.lines.map(l => `
    <tr>
      <td style="padding:8px 0;color:#1c1917;font-size:14px">${l.desc}</td>
      <td style="padding:8px 0;color:#78716c;font-size:14px;text-align:right">${l.qty} × ${fmtEur(l.subprice)} HT</td>
      <td style="padding:8px 0;color:#1c1917;font-size:14px;text-align:right;font-weight:500">${fmtEur(l.qty * l.subprice * (1 + l.tva_tx / 100))}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f8;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4">
    <div style="background:#c0392b;padding:20px 28px">
      <div style="color:#fff;font-size:17px;font-weight:700">Parasites et Compagnie</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:2px">Dératisation · Désinsectisation · Désinfection</div>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 4px;font-size:13px;color:#78716c;text-transform:uppercase;letter-spacing:.5px;font-weight:600">Devis</p>
      <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#1c1917">${data.ref}</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#44403c">Bonjour ${data.client_name},<br><br>Veuillez trouver ci-dessous le détail de votre devis.</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e7e5e4">
        ${rows}
      </table>
      <table style="width:100%;border-collapse:collapse;border-top:2px solid #e7e5e4;margin-top:12px">
        <tr>
          <td style="padding:8px 0;color:#78716c;font-size:13px">Total HT</td>
          <td style="padding:8px 0;text-align:right;color:#1c1917;font-size:13px">${fmtEur(data.totalHT)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#1c1917;font-size:15px;font-weight:700">Total TTC</td>
          <td style="padding:8px 0;text-align:right;color:#1c1917;font-size:15px;font-weight:700">${fmtEur(data.totalTTC)}</td>
        </tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#78716c">Pour toute question, n'hésitez pas à nous contacter.</p>
    </div>
    <div style="background:#f9f9f8;padding:16px 28px;border-top:1px solid #e7e5e4;font-size:11.5px;color:#a8a29e">
      Parasites et Compagnie — interventions@parasites-compagnie.fr
    </div>
  </div>
</body>
</html>`
}

async function getIntervention(interventionId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('interventions')
    .select('dolibarr_tiers_id, dolibarr_devis_id, dolibarr_devis_ref, dolibarr_lines, client_email')
    .eq('id', interventionId)
    .single()
  return data
}

export async function getClientDevis(
  interventionId: string
): Promise<{ items: DevisItem[]; error?: string }> {
  const intervention = await getIntervention(interventionId)
  if (!intervention?.dolibarr_tiers_id) return { items: [], error: 'Client non lié à Dolibarr' }
  const items = await getProposalsByTiers(intervention.dolibarr_tiers_id)
  return { items }
}

export async function linkExistingDevis(
  interventionId: string,
  devisId: number,
  devisRef: string,
  devisStatut: number
): Promise<{ ok: boolean; lines?: DocLine[]; error?: string }> {
  const lines = await getProposalLines(devisId)

  const supabase = await createClient()
  await supabase.from('interventions').update({
    dolibarr_devis_id: devisId,
    dolibarr_devis_ref: devisRef,
    dolibarr_devis_status: devisStatut >= 1 ? 1 : 0,
    dolibarr_lines: lines as unknown as Record<string, unknown>[],
  }).eq('id', interventionId)

  revalidatePath(`/interventions/${interventionId}`)
  return { ok: true, lines }
}

export async function saveDevis(
  interventionId: string,
  date: number,
  lines: DocLine[]
): Promise<{ ok: boolean; ref?: string; error?: string }> {
  const intervention = await getIntervention(interventionId)
  if (!intervention?.dolibarr_tiers_id) return { ok: false, error: 'Client non lié à Dolibarr' }

  const result = await saveDolibarrProposal(
    intervention.dolibarr_devis_id ?? null,
    intervention.dolibarr_tiers_id,
    date,
    lines
  )
  if ('error' in result) return { ok: false, error: result.error }

  const supabase = await createClient()
  await supabase
    .from('interventions')
    .update({
      dolibarr_devis_id: result.id,
      dolibarr_devis_ref: result.ref,
      dolibarr_devis_status: 0,
      dolibarr_lines: lines as unknown as Record<string, unknown>[],
    })
    .eq('id', interventionId)

  revalidatePath(`/interventions/${interventionId}`)
  return { ok: true, ref: result.ref }
}

export async function validateDevis(
  interventionId: string
): Promise<{ ok: boolean; error?: string }> {
  const intervention = await getIntervention(interventionId)
  if (!intervention?.dolibarr_devis_id) return { ok: false, error: 'Aucun devis à valider' }

  const result = await validateProposal(intervention.dolibarr_devis_id)
  if (!result.ok) return result

  const supabase = await createClient()
  await supabase.from('interventions').update({ dolibarr_devis_status: 1 }).eq('id', interventionId)
  revalidatePath(`/interventions/${interventionId}`)
  return { ok: true }
}

export async function sendDevisByEmail(
  interventionId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: iv } = await supabase
    .from('interventions')
    .select('client_name, client_email, dolibarr_devis_id, dolibarr_devis_ref, dolibarr_lines')
    .eq('id', interventionId)
    .single()

  if (!iv?.dolibarr_devis_id) return { ok: false, error: 'Aucun devis à envoyer' }
  if (!iv.client_email) return { ok: false, error: "Pas d'email client enregistré" }

  const lines = (iv.dolibarr_lines as DocLine[]) ?? []
  const totalHT = lines.reduce((s, l) => s + l.qty * l.subprice, 0)
  const totalTTC = lines.reduce((s, l) => s + l.qty * l.subprice * (1 + l.tva_tx / 100), 0)
  const ref = iv.dolibarr_devis_ref ?? 'Devis'

  const pdfBuffer = await downloadProposalPdf(iv.dolibarr_devis_id, ref)

  const { error } = await resend.emails.send({
    from: `Parasites et Compagnie <${process.env.RESEND_FROM_EMAIL ?? 'contact@parasites-compagnie.fr'}>`,
    to: iv.client_email,
    subject: `Votre devis ${ref} — Parasites et Compagnie`,
    html: buildDevisHtml({ ref, client_name: iv.client_name, totalHT, totalTTC, lines }),
    attachments: pdfBuffer
      ? [{ filename: `${ref}.pdf`, content: pdfBuffer.toString('base64') }]
      : [],
  })

  if (error) {
    const msg = typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : JSON.stringify(error)
    return { ok: false, error: msg }
  }
  return { ok: true }
}

export async function convertToFacture(
  interventionId: string,
  date: number
): Promise<{ ok: boolean; ref?: string; error?: string }> {
  const intervention = await getIntervention(interventionId)
  if (!intervention?.dolibarr_tiers_id) return { ok: false, error: 'Client non lié à Dolibarr' }

  const lines = (intervention.dolibarr_lines as unknown as DocLine[]) ?? []
  if (lines.length === 0) return { ok: false, error: 'Aucune ligne — enregistrez d\'abord le devis.' }

  const result = await createDolibarrInvoice(intervention.dolibarr_tiers_id, date, lines)
  if ('error' in result) return { ok: false, error: result.error }

  const supabase = await createClient()
  await supabase
    .from('interventions')
    .update({ dolibarr_facture_id: result.id, dolibarr_facture_ref: result.ref })
    .eq('id', interventionId)

  revalidatePath(`/interventions/${interventionId}`)
  return { ok: true, ref: result.ref }
}
