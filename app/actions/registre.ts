'use server'

import { createClient } from '@/lib/supabase/server'
import type { BiocideEntry } from './interventions'

export interface RegistreEntry {
  intervention_id: string
  reference: string
  date: string
  client: string
  adresse: string
  technicien: string
  nuisible: string
  produit: string
  numero_amm: string
  substance_active: string
  quantite: string
  zone_traitee: string
  mode_application: string
  delai_reentree: string
}

export async function getRegistreEntries(annee?: number): Promise<RegistreEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('interventions')
    .select('id, reference, intervention_date, client_name, client_address, technician_name, type_intervention, biocides')
    .neq('status', 'draft')
    .not('biocides', 'is', null)
    .order('intervention_date', { ascending: false })

  if (annee) {
    query = query
      .gte('intervention_date', `${annee}-01-01`)
      .lte('intervention_date', `${annee}-12-31`)
  }

  const { data } = await query
  if (!data) return []

  const entries: RegistreEntry[] = []
  for (const row of data) {
    const biocides = (row.biocides ?? []) as BiocideEntry[]
    for (const b of biocides) {
      if (!b.produit) continue
      entries.push({
        intervention_id: row.id,
        reference: row.reference ?? '',
        date: row.intervention_date ?? '',
        client: row.client_name ?? '',
        adresse: row.client_address ?? '',
        technicien: row.technician_name ?? '',
        nuisible: row.type_intervention ?? '',
        produit: b.produit,
        numero_amm: b.numero_amm ?? '',
        substance_active: b.substance_active ?? '',
        quantite: b.quantite ?? '',
        zone_traitee: b.zone_traitee ?? '',
        mode_application: b.mode_application ?? '',
        delai_reentree: b.delai_reentree ?? '',
      })
    }
  }
  return entries
}
