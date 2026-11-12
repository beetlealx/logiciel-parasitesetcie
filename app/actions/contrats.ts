'use server'

import { createClient } from '@/lib/supabase/server'
import { getContractsByTiers } from '@/lib/dolibarr'
import { revalidatePath } from 'next/cache'

export interface ContratPayload {
  dolibarr_tiers_id: number
  dolibarr_contract_id?: number | null
  dolibarr_contract_ref?: string | null
  client_name: string
  client_address?: string | null
  intervention_type: string
  frequence: string
  date_debut: string
  date_fin?: string | null
  notes?: string | null
}

export async function createContrat(payload: ContratPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { error } = await supabase.from('contrats').insert({ ...payload, user_id: user.id })
  if (error) return { error: error.message }
  revalidatePath('/contrats')
  return { ok: true }
}

export async function updateContrat(id: string, payload: Partial<ContratPayload> & { actif?: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { error } = await supabase.from('contrats').update(payload).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contrats')
  revalidatePath(`/contrats/${id}`)
  return { ok: true }
}

export async function deleteContrat(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { error } = await supabase.from('contrats').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contrats')
  return { ok: true }
}

export async function getDolibarrContrats(tiersId: number) {
  return getContractsByTiers(tiersId)
}
