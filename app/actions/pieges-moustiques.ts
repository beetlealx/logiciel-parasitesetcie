'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type PiegeType = 'bg-gat' | 'bg-protector' | 'bg-counter'

export interface PiegeMoustique {
  id: string
  user_id: string
  dolibarr_tiers_id: number | null
  client_name: string
  client_address: string | null
  type_piege: PiegeType
  numero: string
  installation_intervention_id: string | null
  date_installation: string
  date_dernier_gaz: string | null
  date_dernier_attractif: string | null
  date_derniere_plaque: string | null
  actif: boolean
  notes: string | null
}

export interface PiegesEnAlerte {
  gaz: PiegeMoustique[]
  attractif: PiegeMoustique[]
}

export async function getPiegesForClient(dolibarr_tiers_id: number | null): Promise<PiegeMoustique[]> {
  if (!dolibarr_tiers_id) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('pieges_moustiques')
    .select('*')
    .eq('dolibarr_tiers_id', dolibarr_tiers_id)
    .eq('actif', true)
    .order('date_installation', { ascending: true })
  return (data ?? []) as PiegeMoustique[]
}

export async function addPiege(input: {
  dolibarr_tiers_id: number | null
  client_name: string
  client_address?: string | null
  type_piege: PiegeType
  numero: string
  date_installation: string
  installation_intervention_id?: string | null
}): Promise<{ ok: boolean; error?: string; piege?: PiegeMoustique }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }

  const { data, error } = await supabase
    .from('pieges_moustiques')
    .insert({ user_id: user.id, ...input })
    .select('*')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard')
  return { ok: true, piege: data as PiegeMoustique }
}

export async function recordMaintenancePiege(id: string, maintenance: {
  gaz?: boolean
  attractif?: boolean
  plaque?: boolean
  date: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }

  const patch: Record<string, string> = {}
  if (maintenance.gaz)      patch.date_dernier_gaz        = maintenance.date
  if (maintenance.attractif) patch.date_dernier_attractif = maintenance.date
  if (maintenance.plaque)   patch.date_derniere_plaque    = maintenance.date

  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase
    .from('pieges_moustiques')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function archiverPiege(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }

  const { error } = await supabase
    .from('pieges_moustiques')
    .update({ actif: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function getPiegesEnAlerte(): Promise<PiegesEnAlerte> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('pieges_moustiques')
    .select('*')
    .eq('actif', true)

  const all = (data ?? []) as PiegeMoustique[]
  const today = new Date()
  const month = today.getMonth() + 1  // 1–12
  const isSaison = month >= 5 && month <= 10
  const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
  const thisMonthPrefix = `${today.getFullYear()}-${String(month).padStart(2, '0')}`

  // Gaz : mensuel uniquement en saison (mai–oct)
  // Alerte si aucun changement ce mois-ci
  const gaz = isSaison
    ? all.filter(p =>
        !p.date_dernier_gaz || p.date_dernier_gaz.substring(0, 7) !== thisMonthPrefix
      )
    : []

  // Attractif : tous les 2 mois
  // Alerte si date_dernier_attractif (ou date_installation) + 2 mois ≤ aujourd'hui + 14 jours
  const attractif = all.filter(p => {
    const base = p.date_dernier_attractif ?? p.date_installation
    const expiry = new Date(base)
    expiry.setMonth(expiry.getMonth() + 2)
    return expiry <= in14Days
  })

  return { gaz, attractif }
}
