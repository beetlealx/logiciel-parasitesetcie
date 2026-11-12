'use server'

import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { generateInterventionPDF } from '@/lib/generate-pdf'
import { createActionCRM, createTiers } from '@/lib/dolibarr'
import { joindreAuDevis } from '@/lib/dolibarr-propal'

const resend = new Resend(process.env.RESEND_API_KEY)

function buildEmailHtml(data: {
  reference: string
  client_name: string
  intervention_date: string
  technician_name: string
  type_intervention: string | null
  synthese: string | null
}) {
  const dateStr = new Date(data.intervention_date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const type = data.type_intervention ? ` — ${data.type_intervention}` : ''
  const synthese = data.synthese
    ? `<p style="margin:16px 0 0;color:#44403c;line-height:1.6">${data.synthese.replace(/\n/g, '<br>')}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f8;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4">
    <div style="background:#c0392b;padding:20px 28px;display:flex;align-items:center;gap:12px">
      <div>
        <div style="color:#fff;font-size:17px;font-weight:700;letter-spacing:-0.3px">Parasites Compagnie</div>
        <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:2px">Dératisation · Désinsectisation · Désinfection</div>
      </div>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 4px;font-size:13px;color:#78716c;text-transform:uppercase;letter-spacing:.5px;font-weight:600">Compte rendu d'intervention</p>
      <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#1c1917">${data.reference}${type}</h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr>
          <td style="padding:8px 0;color:#78716c;width:120px">Date</td>
          <td style="padding:8px 0;color:#1c1917;font-weight:500">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#78716c">Client</td>
          <td style="padding:8px 0;color:#1c1917;font-weight:500">${data.client_name}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#78716c">Technicien</td>
          <td style="padding:8px 0;color:#1c1917;font-weight:500">${data.technician_name}</td>
        </tr>
      </table>
      ${synthese}
      <p style="margin:24px 0 0;font-size:13px;color:#78716c">Le compte rendu complet est disponible en pièce jointe (PDF).</p>
    </div>
    <div style="background:#f9f9f8;padding:16px 28px;border-top:1px solid #e7e5e4;font-size:11.5px;color:#a8a29e">
      Parasites Compagnie — interventions@parasites-compagnie.fr
    </div>
  </div>
</body>
</html>`
}

export type SendResult =
  | { ok: true; emailSent: boolean; crmCreated: boolean; tiersCreated: boolean; docJoint: boolean; emailError?: string; tiersError?: string }
  | { ok: false; error: string }

export async function sendReport(interventionId: string): Promise<SendResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch intervention metadata
  const { data: iv } = await supabase
    .from('interventions')
    .select('reference, status, dolibarr_tiers_id, client_name, client_address, client_email, intervention_date, technician_name, type_intervention, synthese')
    .eq('id', interventionId)
    .single()

  if (!iv) return { ok: false, error: 'Intervention introuvable' }
  if (iv.status === 'draft') return { ok: false, error: 'L\'intervention doit être signée avant envoi' }

  // Création du tiers Dolibarr si le client n'y est pas encore
  let tiersCreated = false
  let tiersError: string | undefined
  let tiersId = iv.dolibarr_tiers_id
  if (!tiersId) {
    const result = await createTiers({
      name: iv.client_name,
      address: iv.client_address ?? '',
      email: iv.client_email,
    })
    if (result.id) {
      tiersId = result.id
      tiersCreated = true
      // Lier toutes les interventions existantes du même client (même user, même nom)
      await supabase
        .from('interventions')
        .update({ dolibarr_tiers_id: result.id })
        .eq('client_name', iv.client_name)
        .is('dolibarr_tiers_id', null)
    } else {
      tiersError = result.error
    }
  }

  // Generate PDF
  const pdf = await generateInterventionPDF(interventionId, supabase)
  if (!pdf) return { ok: false, error: 'Échec de la génération du PDF' }

  // Send email
  let emailSent = false
  let emailError: string | undefined
  if (iv.client_email) {
    const { error: resendError } = await resend.emails.send({
      from: `Parasites Compagnie <${process.env.RESEND_FROM_EMAIL ?? 'contact@parasites-compagnie.fr'}>`,
      to: iv.client_email!,
      subject: `Compte rendu d'intervention — ${iv.reference}`,
      html: buildEmailHtml(iv),
      attachments: [
        {
          filename: `${iv.reference}.pdf`,
          content: pdf.buffer.toString('base64'),
        },
      ],
    })
    emailSent = !resendError
    if (resendError) {
      emailError = typeof resendError === 'object' && 'message' in resendError
        ? String((resendError as { message: unknown }).message)
        : JSON.stringify(resendError)
      console.error('[Resend] send error:', resendError)
    }
  }

  // CRM Dolibarr (non-bloquant)
  let crmCreated = false
  if (tiersId) {
    const ts = Math.floor(new Date(iv.intervention_date).getTime() / 1000)
    const actionId = await createActionCRM({
      label: `CR Intervention ${iv.reference}`,
      datep: ts,
      datef: ts,
      socid: tiersId,
      note: iv.synthese ?? '',
    })
    if (actionId) {
      crmCreated = true
      await supabase
        .from('interventions')
        .update({ dolibarr_action_id: actionId })
        .eq('id', interventionId)
    }
  }

  // PDF joint au devis Dolibarr (passages issus d'un devis signé) — non bloquant
  let docJoint = false
  if (pdf.dossierRef) {
    try {
      await joindreAuDevis(pdf.dossierRef, `${pdf.reference}.pdf`, pdf.buffer)
      docJoint = true
    } catch (e) {
      console.error('[Dolibarr] joindreAuDevis error:', e)
    }
  }

  // Mark as sent
  await supabase
    .from('interventions')
    .update({ status: 'sent' })
    .eq('id', interventionId)

  return { ok: true, emailSent, crmCreated, tiersCreated, docJoint, emailError, tiersError }
}
