'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = `Parasites et Compagnie <${process.env.RESEND_FROM_EMAIL ?? 'contact@parasites-compagnie.fr'}>`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export interface AppUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

export async function listUsers(): Promise<{ users: AppUser[]; error?: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) return { users: [], error: error.message }
  return {
    users: data.users.map(u => ({
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    })),
  }
}

export async function inviteUser(email: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function sendPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${SITE_URL}/auth/callback?next=/reset-password` },
  })
  if (error) return { ok: false, error: error.message }

  const link = `${SITE_URL}/reset-password?token_hash=${data.properties.hashed_token}&type=recovery`
  const { error: emailError } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Réinitialisation de votre mot de passe — Parasites et Compagnie',
    html: `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <div style="background:#c0392b;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <div style="color:#fff;font-weight:700;font-size:15px">Parasites et Compagnie</div>
        </div>
        <h2 style="color:#1c1917;margin:0 0 8px">Réinitialisation de mot de passe</h2>
        <p style="color:#44403c;margin:0 0 20px">Un administrateur a demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
        <a href="${link}" style="display:inline-block;background:#c0392b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Réinitialiser mon mot de passe</a>
        <p style="color:#a8a29e;font-size:12px;margin-top:24px">Ce lien expire dans 24 heures. Si vous n'attendiez pas cet email, ignorez-le.</p>
      </div>
    `,
  })
  if (emailError) {
    const msg = typeof emailError === 'object' && 'message' in emailError ? String((emailError as { message: unknown }).message) : JSON.stringify(emailError)
    return { ok: false, error: msg }
  }
  return { ok: true }
}
