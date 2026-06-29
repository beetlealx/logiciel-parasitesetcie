export type FieldType = 'select' | 'number' | 'text' | 'boolean'

export interface TemplateField {
  key: string
  label: string
  type: FieldType
  options?: string[]
}

export interface InterventionTemplate {
  label: string
  article_label: string
  article_prefix: string
  color: string
  icon: string
  showPlan: boolean
  articlesTitle: string
  fields: TemplateField[]
}

export type InterventionType =
  | 'rats'
  | 'frelons_guepes'
  | 'punaises_lit'
  | 'fourmis'
  | 'cafards'
  | 'moustiques'
  | 'mixte'

export const INTERVENTION_TEMPLATES: Record<Exclude<InterventionType, 'mixte'>, InterventionTemplate> = {
  rats: {
    label: 'Rats',
    article_label: 'Poste',
    article_prefix: 'P',
    color: '#0d7d6e',
    icon: 'rat',
    showPlan: true,
    articlesTitle: "Postes d'appâtage",
    fields: [
      { key: 'etat', label: 'État', type: 'select', options: ['Intact', 'Dégradé', 'Manquant'] },
      { key: 'consommation', label: 'Consommation', type: 'select', options: ['Nulle', 'Partielle', 'Totale'] },
      { key: 'traces', label: 'Traces', type: 'select', options: ['Aucune', 'Déjections', 'Rongeurs'] },
      { key: 'action', label: 'Action', type: 'select', options: ['RAS', 'Renouvellement', 'Repositionnement'] },
    ],
  },
  frelons_guepes: {
    label: 'Frelons / Guêpes',
    article_label: 'Nid',
    article_prefix: 'N',
    color: '#b45309',
    icon: 'wasp',
    showPlan: true,
    articlesTitle: 'Nids identifiés et traités',
    fields: [
      { key: 'espece', label: 'Espèce', type: 'select', options: ['Frelon asiatique', 'Frelon européen', 'Guêpe commune', 'Guêpe germanique'] },
      { key: 'hauteur', label: 'Hauteur (m)', type: 'number' },
      { key: 'diametre', label: 'Diamètre (cm)', type: 'number' },
      { key: 'localisation', label: 'Localisation', type: 'text' },
      { key: 'produit', label: 'Produit utilisé', type: 'text' },
      { key: 'neutralise', label: 'Nid neutralisé', type: 'boolean' },
    ],
  },
  punaises_lit: {
    label: 'Punaises de lit',
    article_label: 'Zone',
    article_prefix: 'Z',
    color: '#7c2d12',
    icon: 'bed-bug',
    showPlan: false,
    articlesTitle: 'Zones traitées',
    fields: [
      { key: 'piece', label: 'Pièce', type: 'text' },
      { key: 'infestation', label: "Niveau d'infestation", type: 'select', options: ['Faible', 'Modéré', 'Élevé'] },
      { key: 'methode', label: 'Méthode', type: 'select', options: ['Vapeur', 'Insecticide', 'Cryogénie', 'Mixte'] },
      { key: 'produit', label: 'Produit utilisé', type: 'text' },
      { key: 'passages_prevus', label: 'Passages prévus', type: 'number' },
    ],
  },
  fourmis: {
    label: 'Fourmis',
    article_label: 'Point',
    article_prefix: 'F',
    color: '#92400e',
    icon: 'ant',
    showPlan: true,
    articlesTitle: 'Points de traitement',
    fields: [
      { key: 'espece', label: 'Espèce', type: 'select', options: ['Fourmi pharaon', 'Fourmi noire', 'Fourmi de jardin', 'Indéterminée'] },
      { key: 'type_traitement', label: 'Type', type: 'select', options: ['Gel appât', 'Pulvérisation', 'Poudrage'] },
      { key: 'produit', label: 'Produit utilisé', type: 'text' },
    ],
  },
  cafards: {
    label: 'Cafards / Blattes',
    article_label: 'Zone',
    article_prefix: 'Z',
    color: '#78350f',
    icon: 'cockroach',
    showPlan: true,
    articlesTitle: 'Zones de traitement',
    fields: [
      { key: 'espece', label: 'Espèce', type: 'select', options: ['Blatte germanique', 'Blatte orientale', 'Blatte américaine'] },
      { key: 'infestation', label: 'Niveau', type: 'select', options: ['Faible', 'Modéré', 'Élevé'] },
      { key: 'produit', label: 'Produit appliqué', type: 'text' },
    ],
  },
  moustiques: {
    label: 'Moustiques',
    article_label: 'Zone',
    article_prefix: 'M',
    color: '#0e7490',
    icon: 'mosquito',
    showPlan: false,
    articlesTitle: 'Zones traitées',
    fields: [
      { key: 'espece', label: 'Espèce', type: 'select', options: ['Moustique tigre', 'Culex', 'Indéterminée'] },
      { key: 'type_traitement', label: 'Type', type: 'select', options: ['Démoustication adulticide', 'Larvicide', 'Piège'] },
      { key: 'surface_m2', label: 'Surface (m²)', type: 'number' },
      { key: 'produit', label: 'Produit utilisé', type: 'text' },
    ],
  },
}

export const MIXTE_META = {
  label: 'Mixte',
  color: '#475569',
  icon: 'mixed',
} as const

export const INTERVENTION_TYPE_ORDER: InterventionType[] = [
  'rats',
  'frelons_guepes',
  'punaises_lit',
  'fourmis',
  'cafards',
  'moustiques',
  'mixte',
]

export function getTemplate(type: InterventionType): InterventionTemplate | null {
  if (type === 'mixte') return null
  return INTERVENTION_TEMPLATES[type]
}

export function getLabel(type: InterventionType): string {
  if (type === 'mixte') return MIXTE_META.label
  return INTERVENTION_TEMPLATES[type].label
}

export function getColor(type: InterventionType): string {
  if (type === 'mixte') return MIXTE_META.color
  return INTERVENTION_TEMPLATES[type].color
}

// Maps intervention type → article_type DB value
export const ARTICLE_TYPE_FOR_INTERVENTION: Record<Exclude<InterventionType, 'mixte'>, string> = {
  rats: 'poste_appatage',
  frelons_guepes: 'nid_frelons',
  punaises_lit: 'zone_punaises',
  fourmis: 'point_fourmis',
  cafards: 'zone_cafards',
  moustiques: 'zone_moustiques',
}

// Reverse lookup: article_type → intervention type key
function interventionTypeFromArticleType(
  articleType: string
): Exclude<InterventionType, 'mixte'> | null {
  const entry = (Object.entries(ARTICLE_TYPE_FOR_INTERVENTION) as [Exclude<InterventionType, 'mixte'>, string][])
    .find(([, v]) => v === articleType)
  return entry?.[0] ?? null
}

// Returns the right template for an article, handling mixte interventions
export function getTemplateForArticle(
  interventionType: InterventionType,
  articleType: string
): InterventionTemplate | null {
  if (interventionType !== 'mixte') return getTemplate(interventionType)
  const key = interventionTypeFromArticleType(articleType)
  return key ? INTERVENTION_TEMPLATES[key] : null
}

// Returns the color for an article marker, handling mixte interventions
export function getArticleColor(
  interventionType: InterventionType,
  articleType: string
): string {
  if (interventionType !== 'mixte') return getColor(interventionType)
  const key = interventionTypeFromArticleType(articleType)
  return key ? INTERVENTION_TEMPLATES[key].color : MIXTE_META.color
}

// Short subtitle shown on type picker cards
export const INTERVENTION_TYPE_SUBTITLE: Record<InterventionType, string> = {
  rats: 'Dératisation',
  frelons_guepes: 'Nids & essaims',
  punaises_lit: 'Traitement thermique / chimique',
  fourmis: 'Points d\'appât',
  cafards: 'Zones de traitement',
  moustiques: 'Démoustication',
  mixte: 'Plusieurs nuisibles',
}
