'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function uploadPlanImage(
  interventionId: string,
  formData: FormData
): Promise<{ path: string; url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('file') as File | null
  if (!file) return { error: 'Fichier manquant' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/${interventionId}/plan.${ext}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('plans')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  await supabase
    .from('interventions')
    .update({ plan_image_path: path })
    .eq('id', interventionId)

  const { data: signed } = await admin.storage
    .from('plans')
    .createSignedUrl(path, 7200)

  return { path, url: signed?.signedUrl ?? '' }
}

export async function getSignedPlanUrl(path: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin.storage.from('plans').createSignedUrl(path, 7200)
  return data?.signedUrl ?? ''
}

export interface PosteRow {
  id: string
  label: string
  x: number
  y: number
  ordre: number
  etat: string | null
  consommation: string | null
  traces: string | null
  action: string | null
}

export type ReadingField = 'etat' | 'consommation' | 'traces' | 'action'

export async function updatePosteReadings(
  id: string,
  field: ReadingField,
  value: string | null
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('postes').update({ [field]: value || null }).eq('id', id)
}

export async function bulkResetReadings(ids: string[]): Promise<void> {
  if (!ids.length) return
  const supabase = await createClient()
  await supabase
    .from('postes')
    .update({ etat: 'Intact', consommation: 'Nulle', traces: 'Aucune', action: 'RAS' })
    .in('id', ids)
}

export async function createPoste(
  interventionId: string,
  label: string,
  x: number,
  y: number
): Promise<PosteRow | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { count } = await supabase
    .from('postes')
    .select('*', { count: 'exact', head: true })
    .eq('intervention_id', interventionId)

  const ordre = (count ?? 0) + 1

  const { data, error } = await supabase
    .from('postes')
    .insert({ intervention_id: interventionId, label, x, y, ordre })
    .select('id, label, x, y, ordre, etat, consommation, traces, action')
    .single()

  if (error || !data) return null
  return data as PosteRow
}

export async function updatePostePosition(id: string, x: number, y: number): Promise<void> {
  const supabase = await createClient()
  await supabase.from('postes').update({ x, y }).eq('id', id)
}

export async function updatePosteLabel(id: string, label: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('postes').update({ label }).eq('id', id)
}

export async function deletePoste(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('postes').delete().eq('id', id)
}
