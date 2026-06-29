'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = `Parasites et Compagnie <${process.env.RESEND_FROM_EMAIL ?? 'contact@parasites-compagnie.fr'}>`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function requestPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${SITE_URL}/auth/callback?next=/reset-password` },
  })

  // Ne pas révéler si l'email existe ou non
  if (error) {
    console.error('[Auth] generateLink:', error.message)
    return { ok: true }
  }

  const resetLink = `${SITE_URL}/reset-password?token_hash=${data.properties.hashed_token}&type=recovery`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Réinitialisation de votre mot de passe — Parasites et Compagnie',
    html: `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <div style="background:#c0392b;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <div style="color:#fff;font-weight:700;font-size:15px">Parasites et Compagnie</div>
        </div>
        <h2 style="color:#1c1917;margin:0 0 8px">Réinitialisation de mot de passe</h2>
        <p style="color:#44403c;margin:0 0 20px">Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <a href="${resetLink}" style="display:inline-block;background:#c0392b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Réinitialiser mon mot de passe</a>
        <p style="color:#a8a29e;font-size:12px;margin-top:24px">Ce lien expire dans 24 heures. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>
    `,
  })

  return { ok: true }
}
