'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PhraseTemplate {
  id: string
  label: string
  content: string
  ordre: number
  intervention_types: string[]
  especes: string[]
}

export async function getPhraseTemplates(): Promise<PhraseTemplate[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('phrase_templates')
    .select('id, label, content, ordre, intervention_types, especes')
    .order('ordre')
  return (data ?? []).map(r => ({
    ...r,
    intervention_types: (r.intervention_types ?? []) as string[],
    especes: (r.especes ?? []) as string[],
  })) as PhraseTemplate[]
}

export async function createPhrase(label: string, content: string, intervention_types: string[] = [], especes: string[] = []): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { count } = await supabase
    .from('phrase_templates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  await supabase.from('phrase_templates').insert({
    user_id: user.id,
    label: label.trim(),
    content: content.trim(),
    ordre: (count ?? 0) + 1,
    intervention_types,
    especes,
  })

  revalidatePath('/phrases')
}

export async function updatePhrase(id: string, label: string, content: string, intervention_types: string[] = [], especes: string[] = []): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('phrase_templates')
    .update({ label: label.trim(), content: content.trim(), intervention_types, especes })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/phrases')
}

export async function deletePhrase(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('phrase_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/phrases')
}
