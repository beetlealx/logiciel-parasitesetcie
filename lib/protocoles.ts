import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PROTOCOLES, protocoleUrl } from '@/lib/protocoles-data'

export { PROTOCOLES, protocoleUrl }

// ------------------------------------------------------------
// Protocoles clients (fiches de préparation) envoyés avant l'intervention.
// Les PDF sont dans public/protocoles/ (une page par nuisible, issus de
// « Protocoles clients Parasites et Compagnie.pdf »). Pour changer une fiche,
// remplacer le fichier du même nom.
// ------------------------------------------------------------

/** Nombre de jours avant l'intervention où la fiche part automatiquement. */
export function joursAvant(): number {
  const n = parseInt(process.env.PROTOCOLE_JOURS_AVANT ?? '3', 10)
  return Number.isFinite(n) && n >= 1 && n <= 14 ? n : 3
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function buildHtml(d: { client_name: string; titre: string; date: string | null; url: string }) {
  const quand = d.date
    ? `prévue le <strong>${new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })}</strong>`
    : 'prochainement programmée'
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f8;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4">
    <div style="background:#c0392b;padding:20px 28px">
      <div style="color:#fff;font-size:17px;font-weight:700">Parasites et Compagnie</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:2px">Dératisation · Désinsectisation · Désinfection</div>
    </div>
    <div style="padding:28px;color:#1c1917;font-size:14.5px;line-height:1.6">
      <p style="margin:0 0 14px">Bonjour ${escapeHtml(d.client_name)},</p>
      <p style="margin:0 0 14px">Votre intervention <strong>${escapeHtml(d.titre)}</strong> est ${quand}.</p>
      <p style="margin:0 0 14px">Pour qu'elle soit pleinement efficace, merci de lire la <strong>fiche de préparation</strong> jointe à ce message et de suivre ses consignes avant notre passage.</p>
      <p style="margin:0 0 22px"><a href="${d.url}" style="display:inline-block;background:#c0392b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Ouvrir la fiche de préparation</a></p>
      <p style="margin:0;color:#57534e">Une question ? Répondez simplement à cet e-mail ou appelez-nous au 04 82 53 06 98.</p>
    </div>
    <div style="background:#f9f9f8;padding:16px 28px;border-top:1px solid #e7e5e4;font-size:11.5px;color:#a8a29e">
      SARL Parasites et Compagnie · Certibiocide n° 115445 · contact@parasites-compagnie.fr
    </div>
  </div>
</body></html>`
}

export type EnvoiResult = { ok: true; email: string } | { ok: false; error: string }

/**
 * Envoie la fiche de préparation au client d'une intervention et la marque comme envoyée.
 * Les autres interventions du même devis et du même nuisible sont marquées aussi :
 * le client ne reçoit la fiche qu'une fois par traitement.
 */
export async function envoyerProtocole(
  admin: SupabaseClient,
  interventionId: string,
  opts: { force?: boolean } = {},
): Promise<EnvoiResult> {
  const { data: iv } = await admin
    .from('interventions')
    .select('id, client_name, client_email, intervention_type, intervention_date, protocole_envoye_at, devis_signe_id')
    .eq('id', interventionId)
    .single()
  if (!iv) return { ok: false, error: 'Intervention introuvable' }
  if (iv.protocole_envoye_at && !opts.force) return { ok: false, error: 'Fiche déjà envoyée' }
  const proto = PROTOCOLES[iv.intervention_type]
  const url = protocoleUrl(iv.intervention_type)
  if (!proto || !url) return { ok: false, error: 'Pas de fiche de préparation pour ce type d’intervention' }
  const email = iv.client_email?.trim()
  if (!email) return { ok: false, error: 'Pas d’e-mail client' }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'Parasites et Compagnie <noreply@parasites-compagnie.fr>',
    to: email,
    replyTo: 'contact@parasites-compagnie.fr',
    subject: `Votre intervention ${proto.titre.toLowerCase()} : fiche de préparation`,
    html: buildHtml({ client_name: iv.client_name, titre: proto.titre, date: iv.intervention_date, url }),
    attachments: [{ filename: `Parasites-et-Compagnie-${proto.fichier}`, path: url }],
  })
  if (error) return { ok: false, error: error.message }

  const now = new Date().toISOString()
  await admin.from('interventions').update({ protocole_envoye_at: now }).eq('id', iv.id)
  if (iv.devis_signe_id) {
    await admin
      .from('interventions')
      .update({ protocole_envoye_at: now })
      .eq('devis_signe_id', iv.devis_signe_id)
      .eq('intervention_type', iv.intervention_type)
      .is('protocole_envoye_at', null)
  }
  return { ok: true, email }
}
