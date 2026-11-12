'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteCalendarEvent } from '@/lib/google-calendar'
import { creerPassages, ingererDevis, loadReferentiels, synchroniserRecents, type IngestResult } from '@/lib/ingest-devis'
import { normalize, type LigneTypee } from '@/lib/typage'

async function auth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return supabase
}

const BASE = '/admin/devis-signes'

export interface AffectationLigne {
  index: number
  type_codes: string[]
  memoriserProduit: boolean
  motCle?: string
}

/** Typage manuel des lignes, puis création des interventions manquantes. */
export async function typerDevisSigne(
  dossierId: string,
  affectations: AffectationLigne[],
  modeFacturation: 'par_passage' | 'par_contrat',
): Promise<{ ok: true; passages: number } | { ok: false; error: string }> {
  const supabase = await auth()
  const admin = createAdminClient()

  const { data: dossier } = await supabase
    .from('devis_signes')
    .select('id, lignes, statut, dolibarr_propal_id, dolibarr_propal_ref, dolibarr_tiers_id, client_name, client_address, client_email, signed_at')
    .eq('id', dossierId)
    .single()
  if (!dossier) return { ok: false, error: 'Devis introuvable' }
  if (dossier.statut === 'annule') return { ok: false, error: 'Dossier annulé' }

  const lignes = [...(dossier.lignes as LigneTypee[])]
  const { types } = await loadReferentiels(admin)
  const valides = new Set(types.map(t => t.code))

  for (const a of affectations) {
    const ligne = lignes[a.index]
    if (!ligne) continue
    const codes = a.type_codes.filter(c => valides.has(c))
    if (codes.join(',') === ligne.type_codes.join(',')) continue
    lignes[a.index] = { ...ligne, type_codes: codes, source: codes.length ? 'manuel' : null }

    if (codes.length === 1 && a.memoriserProduit && ligne.product_ref) {
      await supabase.from('typage_produits').upsert({ dolibarr_product_ref: ligne.product_ref, intervention_type: codes[0] })
    }
    const mot = a.motCle ? normalize(a.motCle) : ''
    if (codes.length === 1 && mot) {
      const t = types.find(x => x.code === codes[0])
      if (t && !t.keywords.includes(mot)) {
        await supabase.from('typage_regles').update({ keywords: [...t.keywords, mot] }).eq('intervention_type', t.code)
      }
    }
  }

  const codes = [...new Set(lignes.flatMap(l => l.type_codes))]
  if (codes.length === 0) return { ok: false, error: 'Choisissez au moins un type d’intervention' }

  const { error } = await supabase
    .from('devis_signes')
    .update({ lignes, mode_facturation: modeFacturation, statut: dossier.statut === 'a_typer' ? 'actif' : dossier.statut })
    .eq('id', dossierId)
  if (error) return { ok: false, error: error.message }

  try {
    const passages = await creerPassages(admin, { ...dossier, lignes, mode_facturation: modeFacturation }, codes, types)
    revalidatePath(`${BASE}/${dossierId}`)
    revalidatePath(BASE)
    revalidatePath('/interventions')
    return { ok: true, passages }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function setModeFacturation(dossierId: string, mode: 'par_passage' | 'par_contrat') {
  const supabase = await auth()
  await supabase.from('devis_signes').update({ mode_facturation: mode }).eq('id', dossierId)
  revalidatePath(`${BASE}/${dossierId}`)
}

/** Annule le dossier : supprime les interventions encore en brouillon (et leur événement d'agenda). */
export async function annulerDevisSigne(dossierId: string): Promise<{ supprimees: number }> {
  const supabase = await auth()
  const { data: brouillons } = await supabase
    .from('interventions')
    .select('id, google_event_id')
    .eq('devis_signe_id', dossierId)
    .eq('status', 'draft')
  for (const b of brouillons ?? []) {
    if (b.google_event_id) await deleteCalendarEvent(b.google_event_id)
  }
  if (brouillons && brouillons.length) {
    await supabase.from('interventions').delete().in('id', brouillons.map(b => b.id))
  }
  await supabase.from('devis_signes').update({ statut: 'annule', alerte: null }).eq('id', dossierId)
  revalidatePath(`${BASE}/${dossierId}`)
  revalidatePath(BASE)
  revalidatePath('/interventions')
  return { supprimees: brouillons?.length ?? 0 }
}

export async function effacerAlerte(dossierId: string) {
  const supabase = await auth()
  await supabase.from('devis_signes').update({ alerte: null }).eq('id', dossierId)
  revalidatePath(`${BASE}/${dossierId}`)
}

export async function synchroniserMaintenant(): Promise<{ crees: number; erreurs: string[] }> {
  await auth()
  const results = await synchroniserRecents('manuel')
  revalidatePath(BASE)
  return {
    crees: results.filter(r => r.status === 'cree').length,
    erreurs: results.flatMap(r => (r.status === 'erreur' ? [`${r.ref} : ${r.message}`] : [])),
  }
}

export async function importerDevis(ref: string): Promise<IngestResult> {
  await auth()
  const clean = ref.trim().toUpperCase()
  if (!clean) return { status: 'erreur', ref: '', message: 'Référence vide' }
  const r = await ingererDevis({ ref: clean }, 'manuel')
  revalidatePath(BASE)
  return r
}

// ---------- Paramètres du typage ----------

export async function updateRegle(
  type: string,
  patch: { keywords: string; offsets: string; facturation: 'par_passage' | 'par_contrat' },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await auth()
  const keywords = [...new Set(patch.keywords.split(',').map(k => normalize(k)).filter(Boolean))]
  const offsets = patch.offsets.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n) && n >= 0 && n <= 730)
  if (offsets.length === 0) return { ok: false, error: 'Au moins un passage (ex. « 0, 15 »)' }
  const { error } = await supabase
    .from('typage_regles')
    .update({ keywords, schedule_offsets: [...new Set(offsets)].sort((a, b) => a - b), default_billing: patch.facturation })
    .eq('intervention_type', type)
  if (error) return { ok: false, error: error.message }
  revalidatePath(BASE)
  return { ok: true }
}

export async function addProduit(ref: string, type: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await auth()
  if (!ref.trim()) return { ok: false, error: 'Référence produit vide' }
  const { error } = await supabase.from('typage_produits').upsert({ dolibarr_product_ref: ref.trim(), intervention_type: type })
  if (error) return { ok: false, error: error.message }
  revalidatePath(BASE)
  return { ok: true }
}

export async function deleteProduit(ref: string) {
  const supabase = await auth()
  await supabase.from('typage_produits').delete().eq('dolibarr_product_ref', ref)
  revalidatePath(BASE)
}
