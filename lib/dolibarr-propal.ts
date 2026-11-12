import { dolibarrRequest } from '@/lib/dolibarr'
import type { DevisLigne } from '@/lib/typage'

// Statuts d'un devis (propal) Dolibarr
export const PROPAL_BROUILLON = 0
export const PROPAL_VALIDE = 1 // envoyé au client — ne déclenche rien
export const PROPAL_SIGNE = 2
export const PROPAL_NON_SIGNE = 3
export const PROPAL_FACTURE = 4 // signé puis facturé

export interface Devis {
  id: number
  ref: string
  socid: number | null
  statut: number
  ref_client: string | null
  note_public: string | null
  total_ht: number
  signed_at: Date
  lignes: DevisLigne[]
}

export interface TiersInfo {
  name: string
  address: string
  email: string | null
}

type Raw = Record<string, unknown>

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/** Date de signature : date_signature, sinon date de clôture, sinon dernière modification. */
function signatureDate(p: Raw): Date {
  for (const key of ['date_signature', 'date_cloture', 'tms', 'date_modification', 'datec']) {
    const v = p[key]
    if (v == null || v === '') continue
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return new Date(n * 1000)
    const d = new Date(String(v))
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

export function parseDevis(p: Raw): Devis {
  const rawLines = Array.isArray(p.lines) ? (p.lines as Raw[]) : []
  return {
    id: num(p.id ?? p.rowid),
    ref: str(p.ref),
    socid: p.socid ? num(p.socid) : null,
    statut: num(p.statut ?? p.status ?? p.fk_statut),
    ref_client: str(p.ref_client) || null,
    note_public: str(p.note_public) || null,
    total_ht: num(p.total_ht),
    signed_at: signatureDate(p),
    lignes: rawLines.map(l => ({
      rowid: l.rowid != null || l.id != null ? num(l.rowid ?? l.id) : null,
      product_ref: str(l.product_ref ?? l.ref) || null,
      label: str(l.product_label ?? l.label ?? l.libelle),
      description: str(l.desc ?? l.description),
      qty: num(l.qty),
      total_ht: num(l.total_ht),
    })),
  }
}

export function estSigne(statut: number): boolean {
  return statut === PROPAL_SIGNE || statut === PROPAL_FACTURE
}

export async function getDevis(id: number): Promise<Devis> {
  return parseDevis(await dolibarrRequest<Raw>('GET', `/proposals/${id}`))
}

export async function getDevisByRef(ref: string): Promise<Devis> {
  return parseDevis(await dolibarrRequest<Raw>('GET', `/proposals/ref/${encodeURIComponent(ref)}`))
}

/**
 * Derniers devis signés (ou signés puis facturés), du plus récent au plus ancien.
 * Utilisé par la vérification horaire de rattrapage.
 */
export async function listDevisSignesRecents(limit = 50): Promise<Devis[]> {
  const filter = encodeURIComponent('((t.fk_statut:=:2) or (t.fk_statut:=:4))')
  try {
    const raw = await dolibarrRequest<Raw[]>(
      'GET',
      `/proposals?sqlfilters=${filter}&sortfield=t.rowid&sortorder=DESC&limit=${limit}`,
    )
    return Array.isArray(raw) ? raw.map(parseDevis) : []
  } catch (err) {
    // Dolibarr répond 404 quand la liste est vide
    if (String(err).includes('Dolibarr 404')) return []
    throw err
  }
}

export async function getTiersInfo(socid: number): Promise<TiersInfo> {
  const t = await dolibarrRequest<Raw>('GET', `/thirdparties/${socid}`)
  const zipTown = [str(t.zip), str(t.town)].filter(Boolean).join(' ')
  return {
    name: str(t.name ?? t.nom) || `Tiers ${socid}`,
    address: [str(t.address), zipTown].filter(Boolean).join(', '),
    email: str(t.email) || null,
  }
}

/** Joint un fichier (PDF du rapport) au devis dans Dolibarr. */
export async function joindreAuDevis(propalRef: string, filename: string, content: Buffer): Promise<void> {
  await dolibarrRequest('POST', '/documents/upload', {
    filename,
    modulepart: 'propal',
    ref: propalRef,
    subdir: '',
    filecontent: content.toString('base64'),
    fileencoding: 'base64',
    overwriteifexists: 1,
  }, 30000)
}
