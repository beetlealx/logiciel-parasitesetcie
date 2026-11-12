'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Technicien {
  id: string
  nom: string
  telephone: string | null
  email: string | null
  numero_certibiocide: string | null
  certibiocide_expire: string | null
  actif: boolean
}

export async function getTechniciens(actifOnly = false): Promise<Technicien[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('techniciens')
    .select('id, nom, telephone, email, numero_certibiocide, certibiocide_expire, actif')
    .order('nom')

  if (actifOnly) query = query.eq('actif', true)

  const { data } = await query
  return (data ?? []) as Technicien[]
}

export async function upsertTechnicien(
  payload: Omit<Technicien, 'id'> & { id?: string }
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const row = {
    nom: payload.nom.trim(),
    telephone: payload.telephone?.trim() || null,
    email: payload.email?.trim() || null,
    numero_certibiocide: payload.numero_certibiocide?.trim() || null,
    certibiocide_expire: payload.certibiocide_expire || null,
    actif: payload.actif,
    user_id: user.id,
  }

  const { error } = payload.id
    ? await supabase.from('techniciens').update(row).eq('id', payload.id)
    : await supabase.from('techniciens').insert(row)

  if (error) return { error: error.message }
  revalidatePath('/admin/techniciens')
  return { ok: true }
}

export async function deleteTechnicien(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('techniciens').delete().eq('id', id)
  revalidatePath('/admin/techniciens')
}
