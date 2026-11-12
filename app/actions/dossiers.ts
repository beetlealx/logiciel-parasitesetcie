'use server'

import { revalidatePath } from 'next/cache'
import { requireGerant } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { creerPassages, ingererDevis, loadReferentiels, synchroniserRecents, type IngestResult } from '@/lib/ingest'
import { normalize, type LigneTypee } from '@/lib/typage'

export interface AffectationLigne {
  index: number            // position de la ligne dans dossiers.lignes
  type_codes: string[]
  memoriserProduit: boolean // enregistre la correspondance « réf. produit → type »
  motCle?: string          // ajoute un mot-clé au type choisi (texte libre)
}

/** Typage manuel des lignes d'un dossier, puis création des passages manquants. */
export async function typerDossier(
  dossierId: string,
  affectations: AffectationLigne[],
  modeFacturation: 'par_passage' | 'par_contrat',
): Promise<{ ok: true; passages: number } | { ok: false; error: string }> {
  const { supabase } = await requireGerant()
  const admin = createAdminClient()

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('id, lignes, statut, dolibarr_propal_ref, dolibarr_tiers_id, client_name, client_address, client_email, signed_at')
    .eq('id', dossierId)
    .single()
  if (!dossier) return { ok: false, error: 'Dossier introuvable' }
  if (dossier.statut === 'annule') return { ok: false, error: 'Dossier annulé' }

  const lignes = [...(dossier.lignes as LigneTypee[])]
  const { types } = await loadReferentiels(admin)
  const validCodes = new Set(types.map(t => t.code))

  for (const a of affectations) {
    const ligne = lignes[a.index]
    if (!ligne) continue
    const codes = a.type_codes.filter(c => validCodes.has(c))
    if (codes.join(',') === ligne.type_codes.join(',')) continue // inchangée : on garde sa source
    lignes[a.index] ={ ...ligne, type_codes: codes, source: codes.length ? 'manuel' : null, ignoree: codes.length ? undefined : ligne.ignoree }

    if (codes.length === 1 && a.memoriserProduit && ligne.product_ref) {
      await supabase.from('product_mappings').upsert({ dolibarr_product_ref: ligne.product_ref, prestation_code: codes[0] })
    }
    const mot = a.motCle ? normalize(a.motCle) : ''
    if (codes.length === 1 && mot) {
      const type = types.find(t => t.code === codes[0])
      if (type && !type.keywords.includes(mot)) {
        await supabase.from('prestation_types').update({ keywords: [...type.keywords, mot] }).eq('code', type.code)
      }
    }
  }

  const codes = [...new Set(lignes.flatMap(l => l.type_codes))]
  if (codes.length === 0) return { ok: false, error: 'Choisissez au moins un type de prestation' }

  const { error } = await supabase
    .from('dossiers')
    .update({ lignes, mode_facturation: modeFacturation, statut: dossier.statut === 'a_typer' ? 'actif' : dossier.statut })
    .eq('id', dossierId)
  if (error) return { ok: false, error: error.message }

  try {
    const passages = await creerPassages(admin, dossier, codes, types)
    revalidatePath(`/dossiers/${dossierId}`)
    revalidatePath('/dossiers')
    return { ok: true, passages }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function setModeFacturation(dossierId: string, mode: 'par_passage' | 'par_contrat') {
  const { supabase } = await requireGerant()
  await supabase.from('dossiers').update({ mode_facturation: mode }).eq('id', dossierId)
  revalidatePath(`/dossiers/${dossierId}`)
}

/** Annule le dossier et ses passages non réalisés (les rapports déjà signés sont conservés). */
export async function annulerDossier(dossierId: string) {
  const { supabase } = await requireGerant()
  await supabase.from('dossiers').update({ statut: 'annule', alerte: null }).eq('id', dossierId)
  await supabase
    .from('interventions')
    .update({ planning_status: 'annule' })
    .eq('dossier_id', dossierId)
    .eq('status', 'draft')
    .neq('planning_status', 'realise')
  revalidatePath(`/dossiers/${dossierId}`)
  revalidatePath('/dossiers')
}

export async function effacerAlerte(dossierId: string) {
  const { supabase } = await requireGerant()
  await supabase.from('dossiers').update({ alerte: null }).eq('id', dossierId)
  revalidatePath(`/dossiers/${dossierId}`)
}

export async function synchroniserMaintenant(): Promise<{ crees: number; erreurs: string[] }> {
  await requireGerant()
  const results = await synchroniserRecents('manuel')
  revalidatePath('/dossiers')
  revalidatePath('/parametres')
  return {
    crees: results.filter(r => r.status === 'cree').length,
    erreurs: results.flatMap(r => (r.status === 'erreur' ? [`${r.ref} : ${r.message}`] : [])),
  }
}

/** Import manuel d'un devis par sa référence (ex. PR2611-0012) : utile pour tester ou rattraper. */
export async function importerDevis(ref: string): Promise<IngestResult> {
  await requireGerant()
  const clean = ref.trim().toUpperCase()
  if (!clean) return { status: 'erreur', ref: '', message: 'Référence vide' }
  const result = await ingererDevis({ ref: clean }, 'manuel')
  revalidatePath('/dossiers')
  return result
}
