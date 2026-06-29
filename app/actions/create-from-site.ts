'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createInterventionFromSite(sourceId: string): Promise<never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch source intervention
  const { data: source } = await supabase
    .from('interventions')
    .select('dolibarr_tiers_id, client_name, client_address, client_email, plan_image_path, technician_name, intervention_type')
    .eq('id', sourceId)
    .eq('user_id', user.id)
    .single()

  if (!source) redirect('/interventions')

  // Fetch source articles (positions + labels uniquement — relevés vides)
  const { data: sourceArticles } = await supabase
    .from('articles')
    .select('label, x, y, ordre')
    .eq('intervention_id', sourceId)
    .order('ordre')

  // Generate reference
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

  // Create new intervention with client pre-filled
  const { data: newIv, error: ivError } = await supabase
    .from('interventions')
    .insert({
      user_id: user.id,
      reference,
      dolibarr_tiers_id: source.dolibarr_tiers_id,
      client_name: source.client_name,
      client_address: source.client_address,
      client_email: source.client_email,
      technician_name: source.technician_name,
      intervention_type: source.intervention_type ?? 'rats',
      status: 'draft',
    })
    .select('id')
    .single()

  if (ivError || !newIv) throw new Error("Impossible de créer l'intervention")

  const admin = createAdminClient()

  // Copy plan image to the new intervention's own path
  if (source.plan_image_path) {
    const { data: blob } = await admin.storage.from('plans').download(source.plan_image_path)
    if (blob) {
      const ext = source.plan_image_path.split('.').pop() ?? 'jpg'
      const newPath = `${user.id}/${newIv.id}/plan.${ext}`
      const { error: uploadError } = await admin.storage
        .from('plans')
        .upload(newPath, blob, { contentType: blob.type || 'image/jpeg', upsert: true })
      if (!uploadError) {
        await supabase
          .from('interventions')
          .update({ plan_image_path: newPath })
          .eq('id', newIv.id)
      }
    }
  }

  // Re-create articles with same positions/labels, relevés vides
  if (sourceArticles && sourceArticles.length > 0) {
    await supabase.from('articles').insert(
      sourceArticles.map(p => ({
        intervention_id: newIv.id,
        label: p.label,
        x: p.x,
        y: p.y,
        ordre: p.ordre,
      }))
    )
  }

  redirect(`/interventions/${newIv.id}`)
}
