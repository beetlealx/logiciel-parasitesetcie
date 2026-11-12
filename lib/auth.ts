import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'gerant' | 'technicien'
  certibiocide: string | null
  active: boolean
}

/** Utilisateur connecté + son profil d'équipe. Redirige vers /login sinon. */
export async function requireProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, certibiocide, active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !profile.active) redirect('/login?error=acces')
  return { supabase, user, profile: profile as Profile }
}

/** Idem, réservé aux gérants. */
export async function requireGerant() {
  const ctx = await requireProfile()
  if (ctx.profile.role !== 'gerant') redirect('/interventions')
  return ctx
}

export function displayName(p: Pick<Profile, 'full_name' | 'email'>): string {
  return p.full_name?.trim() || p.email.split('@')[0]
}
