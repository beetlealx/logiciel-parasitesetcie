import { Resend } from 'resend'
import { generateInterventionPDF } from '@/lib/generate-pdf'
import type { SupabaseClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const TYPE_LABELS: Record<string, string> = {
  rats: 'Dératisation',
  frelons_guepes: 'Frelons & Guêpes',
  punaises_lit: 'Punaises de lit',
  fourmis: 'Fourmis',
  cafards: 'Cafards / Blattes',
  moustiques: 'Moustiques',
  mixte: 'Multi-nuisibles',
}

export function buildReportEmailHtml(data: {
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
  const typeLabel = data.type_intervention ? TYPE_LABELS[data.type_intervention] ?? data.type_intervention : null
  const synthese = data.synthese
    ? `<p style="margin:16px 0 0;color:#44403c;line-height:1.6">${data.synthese.replace(/\n/g, '<br>')}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f8;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4">
    <div style="background:#c0392b;padding:20px 28px">
      <div style="color:#fff;font-size:17px;font-weight:700;letter-spacing:-0.3px">Parasites et Compagnie</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:2px">Dératisation · Désinsectisation · Désinfection</div>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 4px;font-size:13px;color:#78716c;text-transform:uppercase;letter-spacing:.5px;font-weight:600">Compte rendu d'intervention</p>
      <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#1c1917">${data.reference}${typeLabel ? ` — ${typeLabel}` : ''}</h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#78716c;width:120px">Date</td><td style="padding:8px 0;color:#1c1917;font-weight:500">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#78716c">Client</td><td style="padding:8px 0;color:#1c1917;font-weight:500">${data.client_name}</td></tr>
        <tr><td style="padding:8px 0;color:#78716c">Technicien</td><td style="padding:8px 0;color:#1c1917;font-weight:500">${data.technician_name}</td></tr>
      </table>
      ${synthese}
      <p style="margin:24px 0 0;font-size:13px;color:#78716c">Le compte rendu complet est disponible en pièce jointe (PDF).</p>
    </div>
    <div style="background:#f9f9f8;padding:16px 28px;border-top:1px solid #e7e5e4;font-size:11.5px;color:#a8a29e">
      Parasites et Compagnie — interventions@parasites-compagnie.fr
    </div>
  </div>
</body>
</html>`
}

export async function sendInterventionEmail(
  interventionId: string,
  supabase: SupabaseClient,
  userId: string,
): Promise<{ sent: boolean; error?: string }> {
  const { data: iv } = await supabase
    .from('interventions')
    .select('reference, client_name, client_address, client_email, intervention_date, technician_name, type_intervention, synthese')
    .eq('id', interventionId)
    .eq('user_id', userId)
    .single()

  if (!iv?.client_email) return { sent: false }

  const pdf = await generateInterventionPDF(interventionId, supabase, userId)
  if (!pdf) return { sent: false, error: 'Échec génération PDF' }

  const { error } = await resend.emails.send({
    from: `Parasites et Compagnie <${process.env.RESEND_FROM_EMAIL ?? 'contact@parasites-compagnie.fr'}>`,
    to: iv.client_email,
    subject: `Compte rendu d'intervention — ${iv.reference}`,
    html: buildReportEmailHtml(iv),
    attachments: [{ filename: `${iv.reference}.pdf`, content: pdf.buffer.toString('base64') }],
  })

  if (error) {
    const msg = typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : JSON.stringify(error)
    return { sent: false, error: msg }
  }
  return { sent: true }
}
