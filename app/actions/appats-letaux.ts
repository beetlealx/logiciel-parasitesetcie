'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AppatsLetal {
  id: string
  user_id: string
  dolibarr_tiers_id: number | null
  client_name: string
  client_address: string | null
  emplacement: string
  intervention_pose_id: string | null
  date_pose: string
  date_releve_prevue: string
  date_releve_effective: string | null
  intervention_releve_id: string | null
  indice_presence: 'positif' | 'negatif' | null
  statut: 'en_attente' | 'relevé' | 'archivé'
  notes: string | null
}

export async function getAppatsForClient(dolibarr_tiers_id: number | null): Promise<AppatsLetal[]> {
  if (!dolibarr_tiers_id) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('appats_letaux')
    .select('*')
    .eq('dolibarr_tiers_id', dolibarr_tiers_id)
    .eq('statut', 'en_attente')
    .order('date_pose', { ascending: true })
  return (data ?? []) as AppatsLetal[]
}

export async function addAppatsLetal(input: {
  dolibarr_tiers_id: number | null
  client_name: string
  client_address?: string | null
  emplacement: string
  date_pose: string
  intervention_pose_id?: string | null
}): Promise<{ ok: boolean; error?: string; appat?: AppatsLetal }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }

  const d = new Date(input.date_pose)
  d.setDate(d.getDate() + 35)
  const date_releve_prevue = d.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('appats_letaux')
    .insert({ user_id: user.id, ...input, date_releve_prevue })
    .select('*')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard')
  return { ok: true, appat: data as AppatsLetal }
}

export async function releverAppatsLetal(id: string, input: {
  date_releve_effective: string
  indice_presence: 'positif' | 'negatif'
  intervention_releve_id?: string | null
  notes?: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }

  const { error } = await supabase
    .from('appats_letaux')
    .update({ ...input, statut: 'relevé' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function archiverAppatsLetal(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }

  const { error } = await supabase
    .from('appats_letaux')
    .update({ statut: 'archivé' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function getAppatsEnAlerte(): Promise<AppatsLetal[]> {
  const admin = createAdminClient()
  const in7Days = new Date()
  in7Days.setDate(in7Days.getDate() + 7)

  const { data } = await admin
    .from('appats_letaux')
    .select('*')
    .eq('statut', 'en_attente')
    .lte('date_releve_prevue', in7Days.toISOString().split('T')[0])
    .order('date_releve_prevue', { ascending: true })

  return (data ?? []) as AppatsLetal[]
}
