'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface BiocideEntry {
  produit: string
  quantite: string
}

export interface InterventionDraft {
  dolibarr_tiers_id: number | null
  client_name: string
  client_address: string
  client_email: string
  intervention_date: string
  technician_name: string
  technician_id: string | null
  type_intervention: string
  prestation_type: string | null
  synthese: string
  biocides: BiocideEntry[]
}

export async function saveIntervention(id: string, data: InterventionDraft) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('interventions')
    .update({
      dolibarr_tiers_id: data.dolibarr_tiers_id,
      client_name: data.client_name || 'Client à définir',
      client_address: data.client_address,
      client_email: data.client_email || null,
      intervention_date: data.intervention_date,
      technician_name: data.technician_name,
      technician_id: data.technician_id,
      type_intervention: data.type_intervention || null,
      prestation_type: data.prestation_type,
      synthese: data.synthese || null,
      biocides: data.biocides,
    })
    .eq('id', id)
    .eq('status', 'draft')

  if (error) throw new Error('Sauvegarde échouée')
}

export async function createIntervention() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const year = new Date().getFullYear()
  const { data: lastRow } = await supabase
    .from('interventions')
    .select('reference')
    .like('reference', `INT-${year}-%`)
    .order('reference', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastNum = lastRow ? parseInt(lastRow.reference.split('-')[2], 10) : 0
  const reference = `INT-${year}-${String(lastNum + 1).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('interventions')
    .insert({
      user_id: user.id,
      reference,
      client_name: 'Client à définir',
      client_address: '',
      technician_name: 'Alex M.',
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error("Impossible de créer l'intervention")

  redirect(`/interventions/${data.id}`)
}
