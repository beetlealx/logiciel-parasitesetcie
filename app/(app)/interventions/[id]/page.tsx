export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import InterventionForm from '@/components/intervention/intervention-form'
import type { ArticleRow } from '@/app/actions/plan'
import type { PhotoRow } from '@/app/actions/photos'
import { getPhraseTemplates } from '@/app/actions/phrases'
import { getBiocidesByType, getBiocidesByTypeRich } from '@/app/actions/biocides'
import { getTechniciens } from '@/app/actions/techniciens'
import { getDolibarrProducts } from '@/lib/dolibarr'
import { getPiegesForClient } from '@/app/actions/pieges-moustiques'
import { getAppatsForClient } from '@/app/actions/appats-letaux'

interface Props {
  params: Promise<{ id: string }>
}

export default async function InterventionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: intervention }, { data: rawArticles }, { data: rawPhotos }, phraseTemplates, biocideProducts, dolibarrProducts, biocideProductsRich, techniciens] = await Promise.all([
    supabase
      .from('interventions')
      .select('id, reference, status, dolibarr_tiers_id, client_name, client_address, client_email, intervention_date, technician_name, intervention_type, type_intervention, synthese, biocides, plan_image_path, signature_data_url, signataire_nom, extra_data, dolibarr_devis_ref, dolibarr_devis_status, dolibarr_facture_ref, dolibarr_lines')
      .eq('id', id)
      .single(),
    supabase
      .from('articles')
      .select('id, label, x, y, ordre, article_type, releves, etat, consommation, traces, action')
      .eq('intervention_id', id)
      .order('ordre'),
    supabase
      .from('photos')
      .select('id, storage_path, caption')
      .eq('intervention_id', id)
      .order('created_at'),
    getPhraseTemplates(),
    getBiocidesByType(),
    getDolibarrProducts(),
    getBiocidesByTypeRich(),
    getTechniciens(true),
  ])

  if (!intervention) notFound()

  const [piegesMoustiques, appatsLetaux] = await Promise.all([
    getPiegesForClient(intervention.dolibarr_tiers_id),
    getAppatsForClient(intervention.dolibarr_tiers_id),
  ])

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
        articles={(rawArticles ?? []) as ArticleRow[]}
        planUrl={planUrl}
        photos={photos}
        phraseTemplates={phraseTemplates}
        biocideProducts={biocideProducts}
        biocideProductsRich={biocideProductsRich}
        dolibarrProducts={dolibarrProducts}
        techniciens={techniciens.map(t => t.nom)}
        piegesMoustiques={piegesMoustiques}
        appatsLetaux={appatsLetaux}
      />
    </div>
  )
}
