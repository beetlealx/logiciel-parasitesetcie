'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SiteInfo {
  id: string
  tiers_id: number
  code_acces: string | null
  interlocuteur: string | null
  telephone_site: string | null
  instructions: string | null
  notes: string | null
}

export async function getSiteInfo(tiersId: number): Promise<SiteInfo | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('site_infos')
    .select('id, tiers_id, code_acces, interlocuteur, telephone_site, instructions, notes')
    .eq('user_id', user.id)
    .eq('tiers_id', tiersId)
    .single()

  return data ?? null
}

export async function saveSiteInfo(
  tiersId: number,
  payload: Pick<SiteInfo, 'code_acces' | 'interlocuteur' | 'telephone_site' | 'instructions' | 'notes'>
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { error } = await supabase
    .from('site_infos')
    .upsert({ ...payload, tiers_id: tiersId, user_id: user.id }, { onConflict: 'user_id,tiers_id' })

  if (error) return { error: error.message }
  revalidatePath(`/sites/${tiersId}`)
  return { ok: true }
}
