'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface PortailToken {
  id: string
  token: string
  dolibarr_tiers_id: number
  client_name: string
  actif: boolean
  created_at: string
  expires_at: string | null
}

export async function getPortailTokens(): Promise<PortailToken[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('portail_tokens')
    .select('id, token, dolibarr_tiers_id, client_name, actif, created_at, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return (data ?? []) as PortailToken[]
}

export async function getPortailTokensByTiers(tiersId: number): Promise<PortailToken[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('portail_tokens')
    .select('id, token, dolibarr_tiers_id, client_name, actif, created_at, expires_at')
    .eq('user_id', user.id)
    .eq('dolibarr_tiers_id', tiersId)
    .order('created_at', { ascending: false })
  return (data ?? []) as PortailToken[]
}

export async function createPortailToken(tiersId: number, clientName: string): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }
  const { data, error } = await supabase
    .from('portail_tokens')
    .insert({ user_id: user.id, dolibarr_tiers_id: tiersId, client_name: clientName })
    .select('token')
    .single()
  if (error) return { error: error.message }
  revalidatePath(`/sites/${tiersId}`)
  return { token: data.token }
}

export async function togglePortailToken(id: string, actif: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('portail_tokens').update({ actif }).eq('id', id).eq('user_id', user.id)
  revalidatePath('/admin/portail')
}

export async function deletePortailToken(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('portail_tokens').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/admin/portail')
}

// Appelé sans auth — accès public via token
export async function getPortailData(token: string) {
  const admin = createAdminClient()

  const { data: portail } = await admin
    .from('portail_tokens')
    .select('id, dolibarr_tiers_id, client_name, actif, expires_at, user_id')
    .eq('token', token)
    .single()

  if (!portail || !portail.actif) return null
  if (portail.expires_at && new Date(portail.expires_at) < new Date()) return null

  const { data: interventions } = await admin
    .from('interventions')
    .select('id, reference, intervention_date, intervention_type, type_intervention, status, synthese, technician_name')
    .eq('dolibarr_tiers_id', portail.dolibarr_tiers_id)
    .eq('user_id', portail.user_id)
    .in('status', ['signed', 'sent'])
    .order('intervention_date', { ascending: false })
    .limit(50)

  return {
    client_name: portail.client_name,
    dolibarr_tiers_id: portail.dolibarr_tiers_id,
    interventions: interventions ?? [],
  }
}
