'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type Niveau = 'nul' | 'faible' | 'moyen' | 'fort'

export interface ZoneRow {
  id: string
  label: string
  niveau: Niveau | null
  traitement: string | null
  constat: string | null
  ordre: number
}

async function ctx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return supabase
}

async function assertDraft(supabase: Awaited<ReturnType<typeof createClient>>, interventionId: string) {
  const { data } = await supabase.from('interventions').select('status').eq('id', interventionId).single()
  if (!data || data.status !== 'draft') throw new Error('Rapport signé : modification impossible')
}

export async function addZone(interventionId: string, label: string): Promise<ZoneRow> {
  const supabase = await ctx()
  await assertDraft(supabase, interventionId)
  const { count } = await supabase.from('zones').select('id', { count: 'exact', head: true }).eq('intervention_id', interventionId)
  const { data, error } = await supabase
    .from('zones')
    .insert({ intervention_id: interventionId, label: label.trim() || 'Zone', ordre: (count ?? 0) + 1 })
    .select('id, label, niveau, traitement, constat, ordre')
    .single()
  if (error || !data) throw new Error('Création de la zone impossible')
  return data as ZoneRow
}

export async function updateZone(
  id: string,
  patch: Partial<Pick<ZoneRow, 'label' | 'niveau' | 'traitement' | 'constat'>>,
): Promise<void> {
  const supabase = await ctx()
  const clean: Record<string, string | null> = {}
  if (patch.label !== undefined) clean.label = patch.label.trim() || 'Zone'
  if (patch.niveau !== undefined) clean.niveau = patch.niveau
  if (patch.traitement !== undefined) clean.traitement = patch.traitement?.trim() || null
  if (patch.constat !== undefined) clean.constat = patch.constat?.trim() || null
  await supabase.from('zones').update(clean).eq('id', id)
}

export async function deleteZone(id: string): Promise<void> {
  const supabase = await ctx()
  const { data: photos } = await supabase.from('photos').select('storage_path').eq('zone_id', id)
  const { data: deleted } = await supabase.from('zones').delete().eq('id', id).select('id')
  if (deleted && deleted.length > 0 && photos && photos.length > 0) {
    await createAdminClient().storage.from('photos').remove(photos.map(p => p.storage_path)).catch(() => null)
  }
}

/**
 * Passage n > 1 : reprend la liste des zones du passage précédent du même type
 * (libellés seulement — niveaux, traitements et photos restent à saisir).
 */
export async function reprendreZonesPrecedentes(interventionId: string): Promise<ZoneRow[]> {
  const supabase = await ctx()
  await assertDraft(supabase, interventionId)
  const { data: iv } = await supabase
    .from('interventions')
    .select('prestation_id, passage_numero')
    .eq('id', interventionId)
    .single()
  if (!iv?.prestation_id || !iv.passage_numero || iv.passage_numero < 2) return []

  const { data: prev } = await supabase
    .from('interventions')
    .select('id')
    .eq('prestation_id', iv.prestation_id)
    .lt('passage_numero', iv.passage_numero)
    .order('passage_numero', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!prev) return []

  const { data: source } = await supabase.from('zones').select('label, ordre').eq('intervention_id', prev.id).order('ordre')
  if (!source || source.length === 0) return []

  const { data: created } = await supabase
    .from('zones')
    .insert(source.map(z => ({ intervention_id: interventionId, label: z.label, ordre: z.ordre })))
    .select('id, label, niveau, traitement, constat, ordre')
  return (created ?? []) as ZoneRow[]
}
