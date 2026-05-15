import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewInterventionButton from '@/components/interventions/new-intervention-button'
import SearchFilters from '@/components/interventions/search-filters'
import SiteLink from '@/components/interventions/site-link'
import UpcomingVisits from '@/components/interventions/upcoming-visits'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  signed: 'Signé',
  sent: 'Envoyé',
}

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-[#f5f5f4] text-[#57534e]',
  signed: 'bg-[#d1f5ed] text-[#064e44]',
  sent: 'bg-primary/10 text-primary',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

export default async function InterventionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q = '', status = 'all' } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('interventions')
    .select('id, reference, dolibarr_tiers_id, client_name, client_address, intervention_date, technician_name, type_intervention, status')
    .order('intervention_date', { ascending: false })

  if (q) {
    query = query.or(
      `client_name.ilike.%${q}%,client_address.ilike.%${q}%,reference.ilike.%${q}%`
    )
  }
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: interventions = [] } = await query

  return (
    <div>
      {/* En-tête */}
      <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Interventions</h1>
        <NewInterventionButton />
      </div>

      {/* Recherche + filtre */}
      <div className="mb-4">
        <Suspense>
          <SearchFilters defaultQ={q} defaultStatus={status} />
        </Suspense>
      </div>

      {/* Visites planifiées depuis Dolibarr */}
      <Suspense fallback={null}>
        <UpcomingVisits />
      </Suspense>

      {/* Liste */}
      {interventions && interventions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {interventions.map(intervention => (
            <Link
              key={intervention.id}
              href={`/interventions/${intervention.id}`}
              className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-primary hover:shadow-sm transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[14.5px] mb-1 flex items-center gap-2 flex-wrap">
                  {intervention.dolibarr_tiers_id ? (
                    <SiteLink tiersId={intervention.dolibarr_tiers_id} name={intervention.client_name} />
                  ) : (
                    intervention.client_name
                  )}
                  {intervention.type_intervention && (
                    <span className="text-[#a8a29e] font-normal text-[12.5px]">
                      · {intervention.type_intervention}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 text-[12.5px] text-[#57534e] flex-wrap">
                  <span>{formatDate(intervention.intervention_date)}</span>
                  {intervention.client_address && (
                    <span className="hidden sm:inline truncate max-w-[200px]">
                      {intervention.client_address}
                    </span>
                  )}
                  <span className="font-mono text-[#a8a29e]">{intervention.reference}</span>
                </div>
              </div>

              <span className={`text-[11px] uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_CLASS[intervention.status] ?? STATUS_CLASS.draft}`}>
                {STATUS_LABEL[intervention.status] ?? intervention.status}
              </span>

              <svg
                className="w-4 h-4 text-[#a8a29e] group-hover:text-primary shrink-0 transition-colors"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-[#57534e] text-sm">
          {q || status !== 'all'
            ? 'Aucune intervention ne correspond à la recherche.'
            : 'Aucune intervention pour l\'instant. Créez la première.'}
        </div>
      )}
    </div>
  )
}
