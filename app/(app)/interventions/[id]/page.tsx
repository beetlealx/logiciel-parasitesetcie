import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import InterventionForm from '@/components/intervention/intervention-form'
import type { PhotoRow } from '@/app/actions/photos'
import { getPhraseTemplates } from '@/app/actions/phrases'

interface Props {
  params: Promise<{ id: string }>
}

export default async function InterventionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: intervention }, { data: rawPostes }, { data: rawPhotos }, phraseTemplates] = await Promise.all([
    supabase
      .from('interventions')
      .select('id, reference, status, dolibarr_tiers_id, client_name, client_address, client_email, intervention_date, technician_name, type_intervention, synthese, biocides, plan_image_path, signature_data_url, signataire_nom')
      .eq('id', id)
      .single(),
    supabase
      .from('postes')
      .select('id, label, x, y, ordre, etat, consommation, traces, action')
      .eq('intervention_id', id)
      .order('ordre'),
    supabase
      .from('photos')
      .select('id, storage_path, caption')
      .eq('intervention_id', id)
      .order('created_at'),
    getPhraseTemplates(),
  ])

  if (!intervention) notFound()

  const admin = createAdminClient()

  // Signed URLs for plan + photos in parallel
  const [planResult, ...photoResults] = await Promise.all([
    intervention.plan_image_path
      ? admin.storage.from('plans').createSignedUrl(intervention.plan_image_path, 7200)
      : Promise.resolve({ data: null }),
    ...(rawPhotos ?? []).map(p =>
      admin.storage.from('photos').createSignedUrl(p.storage_path, 7200)
    ),
  ])

  const planUrl = planResult.data?.signedUrl ?? ''
  const photos: PhotoRow[] = (rawPhotos ?? []).map((p, i) => ({
    id: p.id,
    storage_path: p.storage_path,
    caption: p.caption,
    url: photoResults[i]?.data?.signedUrl ?? '',
  }))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-16">
      <InterventionForm
        intervention={intervention}
        postes={rawPostes ?? []}
        planUrl={planUrl}
        photos={photos}
        phraseTemplates={phraseTemplates}
      />
    </div>
  )
}
