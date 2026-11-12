import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import InterventionForm from '@/components/intervention/intervention-form'
import type { PhotoRow } from '@/app/actions/photos'
import { getPhraseTemplates } from '@/app/actions/phrases'
import type { ZoneRow } from '@/app/actions/zones'

interface Props {
  params: Promise<{ id: string }>
}

export default async function InterventionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: intervention }, { data: rawPostes }, { data: rawPhotos }, phraseTemplates,
    { data: zones }, { data: types }, { data: techniciens },
  ] = await Promise.all([
    supabase
      .from('interventions')
      .select('id, reference, status, dolibarr_tiers_id, client_name, client_address, client_email, intervention_date, technician_name, technician_id, type_intervention, prestation_type, passage_numero, planning_status, dossier_id, synthese, biocides, plan_image_path, signature_data_url, signataire_nom, dossiers(dolibarr_propal_ref)')
      .eq('id', id)
      .single(),
    supabase
      .from('postes')
      .select('id, label, x, y, ordre, etat, consommation, traces, action')
      .eq('intervention_id', id)
      .order('ordre'),
    supabase
      .from('photos')
      .select('id, storage_path, caption, zone_id, phase')
      .eq('intervention_id', id)
      .order('created_at'),
    getPhraseTemplates(),
    supabase.from('zones').select('id, label, niveau, traitement, constat, ordre').eq('intervention_id', id).order('ordre'),
    supabase.from('prestation_types').select('code, label, module').order('ordre'),
    supabase.from('profiles').select('id, email, full_name').eq('active', true).order('full_name'),
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
    zone_id: p.zone_id,
    phase: p.phase,
  }))

  const typeList = (types ?? []) as { code: string; label: string; module: 'rongeurs' | 'moustiques' | 'photo' }[]
  // Interventions V1 sans type : écran rongeurs (plan + postes), comme avant
  const ecran = typeList.find(t => t.code === intervention.prestation_type)?.module ?? 'rongeurs'
  const dossierRef = (intervention.dossiers as unknown as { dolibarr_propal_ref: string } | null)?.dolibarr_propal_ref ?? null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-16">
      <InterventionForm
        intervention={intervention}
        postes={rawPostes ?? []}
        planUrl={planUrl}
        photos={photos.filter(p => !p.zone_id)}
        zonePhotos={photos.filter(p => !!p.zone_id)}
        zones={(zones ?? []) as ZoneRow[]}
        module={ecran}
        prestationTypes={typeList}
        techniciens={(techniciens ?? []).map(t => ({ id: t.id, name: t.full_name?.trim() || t.email.split('@')[0] }))}
        dossierRef={dossierRef}
        phraseTemplates={phraseTemplates}
      />
    </div>
  )
}
