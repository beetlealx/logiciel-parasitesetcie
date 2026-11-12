import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  estSigne,
  getDevis,
  getDevisByRef,
  getTiersInfo,
  listDevisSignesRecents,
  type Devis,
} from '@/lib/dolibarr-propal'
import {
  datesPassages,
  modeFacturationParDefaut,
  typerDevis,
  type LigneTypee,
  type PrestationTypeDef,
} from '@/lib/typage'

// ------------------------------------------------------------
// Ingestion d'un devis signé Dolibarr → dossier + passages.
// Tout passe par le client admin (clé service) : appelé par le webhook,
// la vérification horaire et le bouton « Synchroniser maintenant ».
// ------------------------------------------------------------

export type SyncSource = 'webhook' | 'cron' | 'manuel'

export type IngestResult =
  | { status: 'cree'; dossierId: string; ref: string; aTyper: boolean; passages: number }
  | { status: 'existant'; dossierId: string; ref: string }
  | { status: 'ignore'; ref: string; raison: string }
  | { status: 'erreur'; ref: string; message: string }

/** Devis signés avant cette date : jamais importés par la vérification horaire. */
function syncFrom(): Date {
  const v = process.env.DOLIBARR_SYNC_FROM
  const d = v ? new Date(v) : new Date('2026-11-12')
  return Number.isNaN(d.getTime()) ? new Date('2026-11-12') : d
}

export async function log(
  admin: SupabaseClient,
  source: SyncSource,
  entry: { propal_id?: number | null; propal_ref?: string | null; ok: boolean; message: string },
) {
  await admin.from('sync_log').insert({ source, ...entry })
}

export async function loadReferentiels(admin: SupabaseClient) {
  const [{ data: types }, { data: maps }] = await Promise.all([
    admin.from('prestation_types').select('*').order('ordre'),
    admin.from('product_mappings').select('dolibarr_product_ref, prestation_code'),
  ])
  const mappings: Record<string, string> = {}
  for (const m of maps ?? []) mappings[m.dolibarr_product_ref] = m.prestation_code
  return { types: (types ?? []) as PrestationTypeDef[], mappings }
}

async function proprietaireParDefaut(admin: SupabaseClient): Promise<string> {
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'gerant')
    .eq('active', true)
    .order('created_at')
    .limit(1)
    .maybeSingle()
  if (!data) throw new Error('Aucun profil gérant actif : impossible de créer les passages')
  return data.id
}

/** Réserve `count` références INT-AAAA-NNNN consécutives. */
async function prochainesReferences(admin: SupabaseClient, count: number): Promise<string[]> {
  const year = new Date().getFullYear()
  const { data: last } = await admin
    .from('interventions')
    .select('reference')
    .like('reference', `INT-${year}-%`)
    .order('reference', { ascending: false })
    .limit(1)
    .maybeSingle()
  const start = last ? parseInt(last.reference.split('-')[2], 10) || 0 : 0
  return Array.from({ length: count }, (_, i) => `INT-${year}-${String(start + i + 1).padStart(4, '0')}`)
}

interface DossierRow {
  id: string
  dolibarr_propal_ref: string
  dolibarr_tiers_id: number | null
  client_name: string
  client_address: string
  client_email: string | null
  signed_at: string | null
}

/**
 * Crée les prestations et leurs passages pour les types donnés.
 * Un type déjà présent dans le dossier est ignoré (pas de doublon).
 */
export async function creerPassages(
  admin: SupabaseClient,
  dossier: DossierRow,
  codes: string[],
  types: PrestationTypeDef[],
): Promise<number> {
  const owner = await proprietaireParDefaut(admin)
  const signedAt = dossier.signed_at ? new Date(dossier.signed_at) : new Date()
  let total = 0

  for (const code of codes) {
    const type = types.find(t => t.code === code)
    if (!type) continue

    const { data: prestation, error } = await admin
      .from('prestations')
      .insert({ dossier_id: dossier.id, type_code: code })
      .select('id')
      .single()
    if (error || !prestation) continue // déjà créée (contrainte unique) → on ne double pas

    const dates = datesPassages(signedAt, type.schedule_offsets)
    const refs = await prochainesReferences(admin, dates.length)
    const rows = dates.map((date, i) => ({
      user_id: owner,
      reference: refs[i],
      dossier_id: dossier.id,
      prestation_id: prestation.id,
      prestation_type: code,
      passage_numero: i + 1,
      date_prevue: date,
      intervention_date: date,
      dolibarr_tiers_id: dossier.dolibarr_tiers_id,
      client_name: dossier.client_name,
      client_address: dossier.client_address,
      client_email: dossier.client_email,
      technician_name: 'À attribuer',
      type_intervention: dates.length > 1 ? `${type.label} — passage ${i + 1}/${dates.length}` : type.label,
      status: 'draft',
      planning_status: 'a_planifier',
    }))
    const { error: insErr } = await admin.from('interventions').insert(rows)
    if (insErr) throw new Error(`Création des passages ${type.label} : ${insErr.message}`)
    total += rows.length
  }
  return total
}

async function fetchDevis(input: { id?: number; ref?: string }): Promise<Devis> {
  if (input.id) return getDevis(input.id)
  if (input.ref) return getDevisByRef(input.ref)
  throw new Error('Devis non identifié (ni id ni référence)')
}

export async function ingererDevis(
  input: { id?: number; ref?: string },
  source: SyncSource,
  admin: SupabaseClient = createAdminClient(),
): Promise<IngestResult> {
  const label = input.ref ?? (input.id ? `#${input.id}` : '?')
  let devis: Devis
  try {
    devis = await fetchDevis(input)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await log(admin, source, { propal_id: input.id ?? null, propal_ref: input.ref ?? null, ok: false, message })
    return { status: 'erreur', ref: label, message }
  }

  if (!estSigne(devis.statut)) {
    const raison = `Devis au statut ${devis.statut}, non signé : ignoré`
    if (source !== 'cron') await log(admin, source, { propal_id: devis.id, propal_ref: devis.ref, ok: true, message: raison })
    return { status: 'ignore', ref: devis.ref, raison }
  }

  const { data: existing } = await admin
    .from('dossiers')
    .select('id')
    .eq('dolibarr_propal_ref', devis.ref)
    .maybeSingle()
  if (existing) return { status: 'existant', dossierId: existing.id, ref: devis.ref }

  if (source === 'cron' && devis.signed_at < syncFrom()) {
    return { status: 'ignore', ref: devis.ref, raison: 'Signé avant la mise en service de la V2' }
  }

  try {
    const { types, mappings } = await loadReferentiels(admin)
    const tiers = devis.socid ? await getTiersInfo(devis.socid) : null
    const typage = typerDevis(devis.lignes, types, mappings)

    const { data: dossier, error } = await admin
      .from('dossiers')
      .insert({
        dolibarr_propal_id: devis.id,
        dolibarr_propal_ref: devis.ref,
        dolibarr_tiers_id: devis.socid,
        client_name: tiers?.name ?? 'Client à définir',
        client_address: tiers?.address ?? '',
        client_email: tiers?.email ?? null,
        ref_client: devis.ref_client,
        note_public: devis.note_public,
        total_ht: devis.total_ht,
        lignes: typage.lignes satisfies LigneTypee[],
        mode_facturation: modeFacturationParDefaut(typage.type_codes, types),
        statut: typage.a_typer ? 'a_typer' : 'actif',
        source,
        signed_at: devis.signed_at.toISOString(),
      })
      .select('id, dolibarr_propal_ref, dolibarr_tiers_id, client_name, client_address, client_email, signed_at')
      .single()

    if (error || !dossier) {
      // 23505 = contrainte unique : un autre appel (webhook / cron) vient de le créer
      if (error?.code === '23505') {
        const { data: again } = await admin.from('dossiers').select('id').eq('dolibarr_propal_ref', devis.ref).single()
        return { status: 'existant', dossierId: again?.id ?? '', ref: devis.ref }
      }
      throw new Error(error?.message ?? 'Insertion du dossier impossible')
    }

    const passages = typage.a_typer ? 0 : await creerPassages(admin, dossier, typage.type_codes, types)
    const message = typage.a_typer
      ? 'Dossier créé — aucune ligne reconnue, à typer'
      : `Dossier créé — ${typage.type_codes.join(', ')} — ${passages} passage(s)` +
        (typage.lignes_non_typees > 0 ? ` — ${typage.lignes_non_typees} ligne(s) non rattachée(s)` : '')
    await log(admin, source, { propal_id: devis.id, propal_ref: devis.ref, ok: true, message })
    return { status: 'cree', dossierId: dossier.id, ref: devis.ref, aTyper: typage.a_typer, passages }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await log(admin, source, { propal_id: devis.id, propal_ref: devis.ref, ok: false, message })
    return { status: 'erreur', ref: devis.ref, message }
  }
}

/** Devis repassé à « non signé » ou supprimé : on alerte, on n'annule rien sans confirmation. */
export async function signalerDevisRetire(
  input: { id?: number; ref?: string },
  motif: string,
  source: SyncSource,
  admin: SupabaseClient = createAdminClient(),
) {
  const query = admin.from('dossiers').update({ alerte: motif })
  const { data } = input.ref
    ? await query.eq('dolibarr_propal_ref', input.ref).select('id')
    : await query.eq('dolibarr_propal_id', input.id ?? -1).select('id')
  if (data && data.length > 0) {
    await log(admin, source, { propal_id: input.id ?? null, propal_ref: input.ref ?? null, ok: true, message: motif })
  }
}

/** Vérification de rattrapage : importe les devis signés récents absents de la base. */
export async function synchroniserRecents(source: SyncSource): Promise<IngestResult[]> {
  const admin = createAdminClient()
  let recents: Devis[]
  try {
    recents = await listDevisSignesRecents(50)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await log(admin, source, { ok: false, message: `Liste des devis : ${message}` })
    return [{ status: 'erreur', ref: '—', message }]
  }

  const refs = recents.map(d => d.ref)
  const { data: known } = refs.length
    ? await admin.from('dossiers').select('dolibarr_propal_ref').in('dolibarr_propal_ref', refs)
    : { data: [] }
  const knownSet = new Set((known ?? []).map(k => k.dolibarr_propal_ref))
  const cutoff = syncFrom()

  const results: IngestResult[] = []
  for (const d of recents) {
    if (knownSet.has(d.ref) || d.signed_at < cutoff) continue
    // la liste ne contient pas toujours les lignes : on relit le devis complet
    results.push(await ingererDevis({ id: d.id }, source, admin))
  }
  return results
}
