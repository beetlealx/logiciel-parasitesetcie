import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent } from '@/lib/google-calendar'
import { getLabel, type InterventionType } from '@/lib/intervention-templates'
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
// Devis signé Dolibarr → dossier « devis_signes » + interventions (une par passage).
// Appelé par le webhook Dolibarr, la vérification quotidienne et les boutons
// « Synchroniser maintenant » / « Importer un devis ». Client admin (clé service).
// ------------------------------------------------------------

export type SyncSource = 'webhook' | 'cron' | 'manuel'

export type IngestResult =
  | { status: 'cree'; dossierId: string; ref: string; aTyper: boolean; passages: number }
  | { status: 'existant'; dossierId: string; ref: string }
  | { status: 'ignore'; ref: string; raison: string }
  | { status: 'erreur'; ref: string; message: string }

/** Devis signés avant cette date : jamais importés par la vérification automatique. */
function syncFrom(): Date {
  const d = new Date(process.env.DOLIBARR_SYNC_FROM || '2026-11-12')
  return Number.isNaN(d.getTime()) ? new Date('2026-11-12') : d
}

export async function log(
  admin: SupabaseClient,
  source: SyncSource,
  entry: { propal_id?: number | null; propal_ref?: string | null; ok: boolean; message: string },
) {
  await admin.from('devis_sync_log').insert({ source, ...entry })
}

/** Règles de typage (table typage_regles) au format attendu par lib/typage. */
export async function loadReferentiels(admin: SupabaseClient) {
  const [{ data: regles }, { data: produits }] = await Promise.all([
    admin.from('typage_regles').select('*').order('ordre'),
    admin.from('typage_produits').select('dolibarr_product_ref, intervention_type'),
  ])
  const types: PrestationTypeDef[] = (regles ?? []).map(r => ({
    code: r.intervention_type,
    label: getLabel(r.intervention_type as InterventionType),
    module: r.intervention_type === 'rats' ? 'rongeurs' : r.intervention_type === 'moustiques' ? 'moustiques' : 'photo',
    keywords: r.keywords ?? [],
    schedule_offsets: r.schedule_offsets ?? [0],
    default_duration_min: 60,
    default_billing: r.default_billing,
    ordre: r.ordre,
  }))
  const mappings: Record<string, string> = {}
  for (const p of produits ?? []) mappings[p.dolibarr_product_ref] = p.intervention_type
  return { types, mappings }
}

/** Compte « propriétaire » des interventions créées automatiquement. */
async function proprietaire(admin: SupabaseClient): Promise<string> {
  const fromEnv = process.env.DEVIS_OWNER_USER_ID
  if (fromEnv) return fromEnv
  const { data } = await admin.auth.admin.listUsers({ perPage: 50 })
  const users = (data?.users ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at))
  if (!users[0]) throw new Error('Aucun utilisateur : impossible de créer les interventions')
  return users[0].id
}

export interface DossierRow {
  id: string
  lignes?: LigneTypee[]
  mode_facturation?: 'par_passage' | 'par_contrat'
  dolibarr_propal_id: number
  dolibarr_propal_ref: string
  dolibarr_tiers_id: number | null
  client_name: string
  client_address: string
  client_email: string | null
  signed_at: string | null
}

/** Insère une intervention avec la prochaine référence INT-AAAA-NNNN libre. */
async function insererIntervention(
  admin: SupabaseClient,
  row: Record<string, unknown>,
  date: string,
): Promise<{ id: string; reference: string }> {
  const year = new Date(date).getFullYear()
  const { data: last } = await admin
    .from('interventions')
    .select('reference')
    .like('reference', `INT-${year}-%`)
    .order('reference', { ascending: false })
    .limit(1)
    .maybeSingle()
  const base = last ? parseInt(last.reference.split('-')[2], 10) || 0 : 0

  for (let attempt = 0; attempt < 10; attempt++) {
    const reference = `INT-${year}-${String(base + 1 + attempt).padStart(4, '0')}`
    const { data, error } = await admin.from('interventions').insert({ ...row, reference }).select('id').single()
    if (data) return { id: data.id, reference }
    if (error?.code !== '23505') throw new Error(error?.message ?? 'Insertion impossible')
  }
  throw new Error('Aucune référence libre trouvée')
}

interface DocLine { fk_product: number | null; desc: string; qty: number; subprice: number; tva_tx: number }

function toDocLine(l: LigneTypee, part = 1, suffixe = ''): DocLine {
  const desc = (l.label || l.description.replace(/<[^>]+>/g, ' ').trim()) + suffixe
  const subprice = l.subprice ?? (l.qty ? l.total_ht / l.qty : l.total_ht)
  return { fk_product: l.fk_product ?? null, desc, qty: l.qty || 1, subprice: Math.round((subprice / part) * 100) / 100, tva_tx: l.tva_tx ?? 20 }
}

/**
 * Lignes à facturer pour un passage, reprises par le bouton « Facture » de l'intervention :
 *  - par contrat : tout sur le 1er passage du 1er type (frais annexes compris), rien ensuite ;
 *  - par passage : lignes du type réparties à parts égales sur ses passages, frais annexes au 1er passage.
 */
export function lignesFacturables(
  dossier: Pick<DossierRow, 'lignes' | 'mode_facturation'>,
  code: string,
  premierType: boolean,
  passage: number,
  nbPassages: number,
): DocLine[] {
  const lignes = dossier.lignes ?? []
  const annexes = premierType && passage === 1 ? lignes.filter(l => l.type_codes.length === 0).map(l => toDocLine(l)) : []
  if (dossier.mode_facturation === 'par_contrat') {
    if (!premierType || passage !== 1) return []
    return [...lignes.filter(l => l.type_codes.length > 0).map(l => toDocLine(l)), ...annexes]
  }
  const duType = lignes.filter(l => l.type_codes[0] === code)
  const suffixe = nbPassages > 1 ? ` — passage ${passage}/${nbPassages}` : ''
  return [...duType.map(l => toDocLine(l, nbPassages, suffixe)), ...annexes]
}

/**
 * Crée les interventions (une par passage) pour chaque type demandé.
 * Un type déjà présent sur le dossier est ignoré : pas de doublon.
 */
export async function creerPassages(
  admin: SupabaseClient,
  dossier: DossierRow,
  codes: string[],
  types: PrestationTypeDef[],
): Promise<number> {
  const owner = await proprietaire(admin)
  const signedAt = dossier.signed_at ? new Date(dossier.signed_at) : new Date()

  const { data: existants } = await admin
    .from('interventions')
    .select('intervention_type')
    .eq('devis_signe_id', dossier.id)
  const dejaLa = new Set((existants ?? []).map(e => e.intervention_type))
  const premier = (existants ?? []).length === 0 ? codes.find(c => types.some(t => t.code === c)) : undefined

  let total = 0
  for (const code of codes) {
    const type = types.find(t => t.code === code)
    if (!type || dejaLa.has(code)) continue

    const dates = datesPassages(signedAt, type.schedule_offsets)
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      const label = dates.length > 1 ? `${type.label} — passage ${i + 1}/${dates.length}` : type.label
      const iv = await insererIntervention(admin, {
        user_id: owner,
        status: 'draft',
        intervention_type: code,
        type_intervention: label,
        intervention_date: date,
        technician_name: 'À attribuer',
        dolibarr_tiers_id: dossier.dolibarr_tiers_id,
        client_name: dossier.client_name,
        client_address: dossier.client_address,
        client_email: dossier.client_email,
        dolibarr_devis_id: dossier.dolibarr_propal_id,
        dolibarr_devis_ref: dossier.dolibarr_propal_ref,
        dolibarr_devis_status: 2,
        devis_signe_id: dossier.id,
        passage_numero: i + 1,
        dolibarr_lines: lignesFacturables(dossier, code, code === premier, i + 1, dates.length),
      }, date)

      // Agenda Google (comme une création manuelle) — non bloquant
      try {
        const eventId = await createCalendarEvent({
          id: iv.id,
          reference: iv.reference,
          client_name: dossier.client_name,
          client_address: dossier.client_address,
          technician_name: 'À attribuer',
          intervention_type: label,
          intervention_date: date,
        })
        if (eventId) await admin.from('interventions').update({ google_event_id: eventId }).eq('id', iv.id)
      } catch (e) {
        console.error('[devis-signes] agenda:', e)
      }
      total++
    }
  }
  return total
}

async function fetchDevis(input: { id?: number; ref?: string }): Promise<Devis> {
  if (input.id) return getDevis(input.id)
  if (input.ref) return getDevisByRef(input.ref)
  throw new Error('Devis non identifié (ni id ni référence)')
}

const DOSSIER_COLS = 'id, lignes, mode_facturation, dolibarr_propal_id, dolibarr_propal_ref, dolibarr_tiers_id, client_name, client_address, client_email, signed_at'

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

  const { data: existing } = await admin.from('devis_signes').select('id').eq('dolibarr_propal_ref', devis.ref).maybeSingle()
  if (existing) return { status: 'existant', dossierId: existing.id, ref: devis.ref }

  if (source === 'cron' && devis.signed_at < syncFrom()) {
    return { status: 'ignore', ref: devis.ref, raison: 'Signé avant la mise en service' }
  }

  try {
    const { types, mappings } = await loadReferentiels(admin)
    const tiers = devis.socid ? await getTiersInfo(devis.socid) : null
    const typage = typerDevis(devis.lignes, types, mappings)

    const { data: dossier, error } = await admin
      .from('devis_signes')
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
      .select(DOSSIER_COLS)
      .single()

    if (error || !dossier) {
      if (error?.code === '23505') {
        const { data: again } = await admin.from('devis_signes').select('id').eq('dolibarr_propal_ref', devis.ref).single()
        return { status: 'existant', dossierId: again?.id ?? '', ref: devis.ref }
      }
      throw new Error(error?.message ?? 'Insertion du dossier impossible')
    }

    const passages = typage.a_typer ? 0 : await creerPassages(admin, dossier, typage.type_codes, types)
    const message = typage.a_typer
      ? 'Aucune ligne reconnue : à typer'
      : `${typage.type_codes.map(c => types.find(t => t.code === c)?.label ?? c).join(', ')} — ${passages} intervention(s) créée(s)` +
        (typage.lignes_non_typees > 0 ? ` — ${typage.lignes_non_typees} ligne(s) non rattachée(s)` : '')
    await log(admin, source, { propal_id: devis.id, propal_ref: devis.ref, ok: true, message })
    return { status: 'cree', dossierId: dossier.id, ref: devis.ref, aTyper: typage.a_typer, passages }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await log(admin, source, { propal_id: devis.id, propal_ref: devis.ref, ok: false, message })
    return { status: 'erreur', ref: devis.ref, message }
  }
}

/** Devis repassé à « non signé », réouvert ou supprimé : alerte, rien n'est annulé sans confirmation. */
export async function signalerDevisRetire(
  input: { id?: number; ref?: string },
  motif: string,
  source: SyncSource,
  admin: SupabaseClient = createAdminClient(),
) {
  const q = admin.from('devis_signes').update({ alerte: motif })
  const { data } = input.ref
    ? await q.eq('dolibarr_propal_ref', input.ref).select('id')
    : await q.eq('dolibarr_propal_id', input.id ?? -1).select('id')
  if (data && data.length > 0) {
    await log(admin, source, { propal_id: input.id ?? null, propal_ref: input.ref ?? null, ok: true, message: motif })
  }
}

/** Rattrapage : importe les devis signés récents absents de la base. */
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
    ? await admin.from('devis_signes').select('dolibarr_propal_ref').in('dolibarr_propal_ref', refs)
    : { data: [] as { dolibarr_propal_ref: string }[] }
  const knownSet = new Set((known ?? []).map(k => k.dolibarr_propal_ref))
  const cutoff = syncFrom()

  const results: IngestResult[] = []
  for (const d of recents) {
    if (knownSet.has(d.ref) || d.signed_at < cutoff) continue
    results.push(await ingererDevis({ id: d.id }, source, admin))
  }
  return results
}
