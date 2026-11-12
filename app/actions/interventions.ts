'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { InterventionType } from '@/lib/intervention-templates'
import { createCalendarEvent, updateCalendarEvent } from '@/lib/google-calendar'

export interface BiocideEntry {
  produit: string
  quantite: string
  numero_amm?: string
  substance_active?: string
  zone_traitee?: string
  mode_application?: string
  delai_reentree?: string
}

export interface InterventionDraft {
  dolibarr_tiers_id: number | null
  client_name: string
  client_address: string
  client_email: string
  intervention_date: string
  technician_name: string
  type_intervention: string
  synthese: string
  biocides: BiocideEntry[]
  extra_data: Record<string, unknown>
}

export async function setInterventionType(id: string, type: InterventionType): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }
  const { error } = await supabase
    .from('interventions')
    .update({ intervention_type: type })
    .eq('id', id)
    .eq('status', 'draft')
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function saveIntervention(id: string, data: InterventionDraft) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: updated, error } = await supabase
    .from('interventions')
    .update({
      dolibarr_tiers_id: data.dolibarr_tiers_id,
      client_name: data.client_name || 'Client à définir',
      client_address: data.client_address,
      client_email: data.client_email || null,
      intervention_date: data.intervention_date,
      technician_name: data.technician_name,
      type_intervention: data.type_intervention || null,
      synthese: data.synthese || null,
      biocides: data.biocides,
      extra_data: data.extra_data,
    })
    .eq('id', id)
    .eq('status', 'draft')
    .select('reference, google_event_id')
    .maybeSingle()

  if (error) throw new Error('Sauvegarde échouée')

  if (updated) {
    const ivForCal = {
      id,
      reference: updated.reference,
      client_name: data.client_name || 'Client à définir',
      client_address: data.client_address,
      technician_name: data.technician_name,
      intervention_type: data.type_intervention ?? null,
      intervention_date: data.intervention_date,
    }

    if (updated.google_event_id) {
      updateCalendarEvent(updated.google_event_id, ivForCal).catch(console.error)
    } else {
      ;(async () => {
        const eventId = await createCalendarEvent(ivForCal)
        if (eventId) {
          await supabase.from('interventions').update({ google_event_id: eventId }).eq('id', id)
        }
      })().catch(console.error)
    }
  }
}

export async function createIntervention(intervention_type: InterventionType = 'rats', intervention_date?: string, redirectTo?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const date = intervention_date ?? new Date().toISOString().split('T')[0]
  const year = new Date(date).getFullYear()

  const { data: lastRow } = await supabase
    .from('interventions')
    .select('reference')
    .like('reference', `INT-${year}-%`)
    .order('reference', { ascending: false })
    .limit(1)
    .maybeSingle()

  const baseNum = lastRow ? parseInt(lastRow.reference.split('-')[2], 10) : 0

  let interventionId: string | null = null

  for (let attempt = 0; attempt < 10; attempt++) {
    const reference = `INT-${year}-${String(baseNum + 1 + attempt).padStart(4, '0')}`

    const { data, error } = await supabase
      .from('interventions')
      .insert({
        user_id: user.id,
        reference,
        client_name: 'Client à définir',
        client_address: '',
        technician_name: 'Alex',
        status: 'draft',
        intervention_type,
        intervention_date: date,
      })
      .select('id')
      .single()

    if (data) {
      interventionId = data.id

      ;(async () => {
        const eventId = await createCalendarEvent({
          id: data.id,
          reference,
          client_name: 'Client à définir',
          client_address: '',
          technician_name: 'Alex',
          intervention_type: intervention_type,
          intervention_date: date,
        })
        if (eventId) {
          await supabase.from('interventions').update({ google_event_id: eventId }).eq('id', data.id)
        }
      })().catch(console.error)

      break
    }

    // 23505 = unique_violation — try the next number without re-reading
    if (error?.code !== '23505') {
      return { error: error?.message ?? "Impossible de créer l'intervention" }
    }
  }

  if (!interventionId) return { error: "Impossible de créer l'intervention, réessayez." }

  revalidatePath('/calendrier')
  redirect(redirectTo ?? `/interventions/${interventionId}`)
}

export async function createInterventionFromDiagnostic(interventionLabel: string, especeNom: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const date = new Date().toISOString().split('T')[0]
  const year = new Date().getFullYear()

  const { data: lastRow } = await supabase
    .from('interventions')
    .select('reference')
    .like('reference', `INT-${year}-%`)
    .order('reference', { ascending: false })
    .limit(1)
    .maybeSingle()

  const baseNum = lastRow ? parseInt(lastRow.reference.split('-')[2], 10) : 0

  for (let attempt = 0; attempt < 10; attempt++) {
    const reference = `INT-${year}-${String(baseNum + 1 + attempt).padStart(4, '0')}`

    const { data, error } = await supabase
      .from('interventions')
      .insert({
        user_id: user.id,
        reference,
        client_name: 'Client à définir',
        client_address: '',
        technician_name: 'Alex',
        status: 'draft',
        intervention_type: interventionLabel,
        intervention_date: date,
        extra_data: { espece: especeNom },
      })
      .select('id')
      .single()

    if (data) {
      revalidatePath('/interventions')
      return { id: data.id }
    }
    if (error?.code !== '23505') return { error: error?.message ?? 'Erreur création' }
  }

  return { error: 'Impossible de créer l\'intervention, réessayez.' }
}

export async function reopenIntervention(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }
  const { error } = await supabase
    .from('interventions')
    .update({ status: 'draft' })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/interventions/${id}`)
  revalidatePath('/interventions')
  return { ok: true }
}

export interface LastInterventionSummary {
  id: string
  reference: string
  intervention_date: string
  intervention_type: string | null
  biocides: BiocideEntry[] | null
  synthese: string | null
  extra_data: Record<string, unknown> | null
  plan_image_path: string | null
  articles_count: number
  photos_count: number
}

export async function getLastInterventionForClient(
  tiersId: number,
  currentId: string
): Promise<{ data: LastInterventionSummary | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non authentifié' }

  const { data, error } = await supabase
    .from('interventions')
    .select('id, reference, intervention_date, intervention_type, biocides, synthese, extra_data, plan_image_path')
    .eq('dolibarr_tiers_id', tiersId)
    .neq('id', currentId)
    .in('status', ['signed', 'sent'])
    .order('intervention_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return { data: null, error: error?.message }

  const [{ count: articlesCount }, { count: photosCount }] = await Promise.all([
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('intervention_id', data.id),
    supabase.from('photos').select('*', { count: 'exact', head: true }).eq('intervention_id', data.id),
  ])

  return {
    data: {
      ...(data as Omit<LastInterventionSummary, 'articles_count' | 'photos_count'>),
      articles_count: articlesCount ?? 0,
      photos_count: photosCount ?? 0,
    },
  }
}

export interface ImportResult {
  ok: boolean
  error?: string
  articles?: Array<{ id: string; label: string; x: number; y: number; ordre: number; article_type: string; releves: Record<string, unknown>; etat: string | null; consommation: string | null; traces: string | null; action: string | null }>
  planSignedUrl?: string
  biocides?: BiocideEntry[] | null
  synthese?: string | null
  extra_data?: Record<string, unknown> | null
  type_intervention?: string | null
}

export async function importFromPreviousIntervention(
  previousId: string,
  currentId: string
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }

  const admin = createAdminClient()

  // 1. Données texte + plan de l'intervention de référence
  const { data: prev, error: prevError } = await admin
    .from('interventions')
    .select('biocides, synthese, extra_data, type_intervention, plan_image_path, dolibarr_tiers_id')
    .eq('id', previousId)
    .single()

  if (prevError || !prev) return { ok: false, error: `Introuvable: ${prevError?.message}` }

  // 2. Articles de l'intervention de référence
  const { data: prevArticles } = await admin
    .from('articles')
    .select('label, x, y, ordre, article_type')
    .eq('intervention_id', previousId)
    .order('ordre')

  let articlesSource = prevArticles ?? []
  let planSource = prev.plan_image_path

  // Fallback : chercher dans toutes les interventions du client (tout statut)
  // pour trouver la plus récente qui a des postes d'appâtage
  if (!articlesSource.length) {
    // Récupérer le tiers_id depuis prev ou depuis l'intervention courante
    let tiersId = prev.dolibarr_tiers_id
    if (!tiersId) {
      const { data: cur } = await admin
        .from('interventions')
        .select('dolibarr_tiers_id')
        .eq('id', currentId)
        .single()
      tiersId = cur?.dolibarr_tiers_id ?? null
    }

    if (tiersId) {
      const { data: allIvs } = await admin
        .from('interventions')
        .select('id, plan_image_path')
        .eq('dolibarr_tiers_id', tiersId)
        .neq('id', currentId)
        .order('intervention_date', { ascending: false })

      for (const iv of allIvs ?? []) {
        const { data: arts } = await admin
          .from('articles')
          .select('label, x, y, ordre, article_type')
          .eq('intervention_id', iv.id)
          .order('ordre')
        if (arts?.length) {
          articlesSource = arts
          planSource = iv.plan_image_path ?? planSource
          break
        }
      }
    }
  }

  // 3. Photos de l'intervention de référence
  const { data: prevPhotos } = await admin
    .from('photos')
    .select('storage_path, caption')
    .eq('intervention_id', previousId)

  // 4. Mise à jour des champs texte
  const { error: updateErr } = await admin
    .from('interventions')
    .update({
      biocides: prev.biocides,
      synthese: prev.synthese,
      extra_data: prev.extra_data,
      type_intervention: prev.type_intervention,
    })
    .eq('id', currentId)

  if (updateErr) return { ok: false, error: `Mise à jour: ${updateErr.message}` }

  // 5. Copie du plan (Storage) — supprimer l'existant d'abord pour éviter "already exists"
  if (planSource) {
    const ext = planSource.split('.').pop() ?? 'jpg'
    const newPlanPath = `${user.id}/${currentId}/plan.${ext}`
    await admin.storage.from('plans').remove([newPlanPath])
    const { error: copyErr } = await admin.storage.from('plans').copy(planSource, newPlanPath)
    if (!copyErr) {
      await admin.from('interventions').update({ plan_image_path: newPlanPath }).eq('id', currentId)
    }
  }

  // 6. Articles — supprimer les existants, insérer les précédents (relevés remis à zéro)
  await admin.from('articles').delete().eq('intervention_id', currentId)

  let insertedArticles = 0
  if (articlesSource.length) {
    const defaultReleves = { etat: 'Intact', consommation: 'Nulle', traces: 'Aucune', action: 'RAS' }
    const { data: inserted, error: insertErr } = await admin.from('articles').insert(
      articlesSource.map(a => ({
        intervention_id: currentId,
        label: a.label,
        x: a.x,
        y: a.y,
        ordre: a.ordre,
        article_type: a.article_type,
        releves: defaultReleves,
      }))
    ).select('id')
    if (insertErr) return { ok: false, error: `Articles: ${insertErr.message}` }
    insertedArticles = inserted?.length ?? 0
  }

  // 7. Photos — supprimer toutes les existantes puis copier depuis la référence
  const { data: existingPhotos } = await admin
    .from('photos')
    .select('id, storage_path')
    .eq('intervention_id', currentId)

  if (existingPhotos?.length) {
    await admin.storage.from('photos').remove(existingPhotos.map(p => p.storage_path))
    await admin.from('photos').delete().eq('intervention_id', currentId)
  }

  for (const photo of prevPhotos ?? []) {
    const ext = photo.storage_path.split('.').pop() ?? 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const newPath = `${user.id}/${currentId}/${filename}`
    const { error: copyErr } = await admin.storage.from('photos').copy(photo.storage_path, newPath)
    if (!copyErr) {
      await admin.from('photos').insert({
        intervention_id: currentId,
        storage_path: newPath,
        caption: photo.caption,
      })
    }
  }

  // Lire les articles insérés avec leurs IDs pour la mise à jour d'état côté client
  const { data: insertedRows } = await admin
    .from('articles')
    .select('id, label, x, y, ordre, article_type, releves, etat, consommation, traces, action')
    .eq('intervention_id', currentId)
    .order('ordre')

  // Générer une URL signée pour le nouveau plan
  let planSignedUrl: string | undefined
  if (planSource) {
    const ext = planSource.split('.').pop() ?? 'jpg'
    const newPlanPath = `${user.id}/${currentId}/plan.${ext}`
    const { data: signed } = await admin.storage.from('plans').createSignedUrl(newPlanPath, 7200)
    planSignedUrl = signed?.signedUrl ?? undefined
  }

  revalidatePath(`/interventions/${currentId}`)

  return {
    ok: true,
    articles: (insertedRows ?? []) as ImportResult['articles'],
    planSignedUrl,
    biocides: prev.biocides as BiocideEntry[] | null,
    synthese: prev.synthese,
    extra_data: prev.extra_data as Record<string, unknown> | null,
    type_intervention: prev.type_intervention,
  }
}
