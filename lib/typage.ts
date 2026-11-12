// Typage des lignes d'un devis Dolibarr → type(s) de prestation.
// Pur (aucun accès réseau ni base) pour être testable : voir lib/typage.test.ts.
//
// Ordre de priorité :
//   1. référence produit Dolibarr présente dans la table de correspondance
//   2. mots-clés du type trouvés dans le libellé / la description (texte libre)
// Une ligne peut correspondre à plusieurs types (ex. « Blattes et fourmis »).

export interface PrestationTypeDef {
  code: string
  label: string
  module: 'rongeurs' | 'moustiques' | 'photo'
  keywords: string[]
  schedule_offsets: number[]
  default_duration_min: number
  default_billing: 'par_passage' | 'par_contrat'
  ordre: number
}

export interface DevisLigne {
  rowid: number | null
  product_ref: string | null
  label: string
  description: string
  qty: number
  total_ht: number
}

export type TypageSource = 'produit' | 'mot_cle' | 'manuel' | null

export interface LigneTypee extends DevisLigne {
  type_codes: string[]
  source: TypageSource
  ignoree?: boolean // frais, déplacement… : pas de prestation
}

/** minuscules, sans accents, ponctuation → espaces */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ') // descriptions Dolibarr parfois en HTML
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Lignes qui ne sont pas des prestations (frais annexes). */
const LIGNES_ANNEXES = ['deplacement', 'frais', 'remise', 'acompte', 'forfait deplacement', 'majoration']

function matchesKeyword(haystack: string, keyword: string): boolean {
  const k = normalize(keyword)
  if (!k) return false
  return ` ${haystack} `.includes(` ${k} `)
}

export function typerLigne(
  ligne: DevisLigne,
  types: PrestationTypeDef[],
  mappings: Record<string, string>,
): LigneTypee {
  if (ligne.product_ref && mappings[ligne.product_ref]) {
    return { ...ligne, type_codes: [mappings[ligne.product_ref]], source: 'produit' }
  }

  const text = normalize(`${ligne.product_ref ?? ''} ${ligne.label} ${ligne.description}`)
  const found = [...types]
    .sort((a, b) => a.ordre - b.ordre)
    .filter(t => t.keywords.some(k => matchesKeyword(text, k)))
    .map(t => t.code)

  if (found.length > 0) return { ...ligne, type_codes: found, source: 'mot_cle' }

  const label = normalize(ligne.label)
  const annexe = LIGNES_ANNEXES.some(a => label.startsWith(a))
  return { ...ligne, type_codes: [], source: null, ignoree: annexe || undefined }
}

export interface ResultatTypage {
  lignes: LigneTypee[]
  type_codes: string[]       // types distincts trouvés, dans l'ordre des types
  a_typer: boolean           // aucune ligne de prestation n'a pu être typée
  lignes_non_typees: number  // hors lignes annexes
}

export function typerDevis(
  lignes: DevisLigne[],
  types: PrestationTypeDef[],
  mappings: Record<string, string>,
): ResultatTypage {
  const typees = lignes.map(l => typerLigne(l, types, mappings))
  const ordre = new Map(types.map(t => [t.code, t.ordre]))
  const codes = [...new Set(typees.flatMap(l => l.type_codes))].sort(
    (a, b) => (ordre.get(a) ?? 999) - (ordre.get(b) ?? 999),
  )
  const nonTypees = typees.filter(l => l.type_codes.length === 0 && !l.ignoree).length
  return {
    lignes: typees,
    type_codes: codes,
    a_typer: codes.length === 0,
    lignes_non_typees: nonTypees,
  }
}

/** Dates prévues des passages : signature + décalages du type (jours). */
export function datesPassages(signedAt: Date, offsets: number[]): string[] {
  const list = offsets.length > 0 ? offsets : [0]
  return list.map(o => {
    const d = new Date(Date.UTC(signedAt.getUTCFullYear(), signedAt.getUTCMonth(), signedAt.getUTCDate()))
    d.setUTCDate(d.getUTCDate() + o)
    return d.toISOString().slice(0, 10)
  })
}

/** Mode de facturation proposé : par contrat dès qu'un type du devis l'est par défaut. */
export function modeFacturationParDefaut(
  codes: string[],
  types: PrestationTypeDef[],
): 'par_passage' | 'par_contrat' {
  return codes.some(c => types.find(t => t.code === c)?.default_billing === 'par_contrat')
    ? 'par_contrat'
    : 'par_passage'
}
