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
    .eq('user_id', user.id)

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

export interface ArticleRow {
  id: string
  label: string
  x: number
  y: number
  ordre: number
  article_type: string
  releves: Record<string, unknown>
  // Colonnes v1 conservées pour compatibilité (suppression en v3)
  etat: string | null
  consommation: string | null
  traces: string | null
  action: string | null
}

export type ReadingField = 'etat' | 'consommation' | 'traces' | 'action'

export async function updateArticleReadings(
  id: string,
  field: ReadingField,
  value: string | null
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('articles').update({ [field]: value || null }).eq('id', id)
}

export async function updateArticleReleves(
  id: string,
  releves: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('articles').update({ releves }).eq('id', id)
}

export async function bulkResetReadings(ids: string[]): Promise<void> {
  if (!ids.length) return
  const supabase = await createClient()
  const releves = { etat: 'Intact', consommation: 'Nulle', traces: 'Aucune', action: 'RAS' }
  await supabase
    .from('articles')
    .update({ releves })
    .in('id', ids)
}

export async function createArticle(
  interventionId: string,
  label: string,
  x: number,
  y: number,
  article_type: string = 'poste_appatage'
): Promise<ArticleRow | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { count } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .eq('intervention_id', interventionId)

  const ordre = (count ?? 0) + 1

  const { data, error } = await supabase
    .from('articles')
    .insert({ intervention_id: interventionId, label, x, y, ordre, article_type })
    .select('id, label, x, y, ordre, article_type, releves, etat, consommation, traces, action')
    .single()

  if (error || !data) return null
  return data as ArticleRow
}

export async function updateArticlePosition(id: string, x: number, y: number): Promise<void> {
  const supabase = await createClient()
  await supabase.from('articles').update({ x, y }).eq('id', id)
}

export async function updateArticleLabel(id: string, label: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('articles').update({ label }).eq('id', id)
}

export async function deleteArticle(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('articles').delete().eq('id', id)
}
