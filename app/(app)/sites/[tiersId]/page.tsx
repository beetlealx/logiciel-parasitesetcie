import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createInterventionFromSite } from '@/app/actions/create-from-site'
import { getPortailTokensByTiers } from '@/app/actions/portail'
import { getSiteInfo } from '@/app/actions/site-infos'
import PortailLinkManager from '@/components/portail/portail-link-manager'
import SiteInfoCard from '@/components/sites/site-info-card'

type Severity = 'forte' | 'moderee' | 'inactive' | 'non-releve'

function computeSeverity(articles: { releves: Record<string, unknown> }[], interventionType?: string | null): Severity {
  if (articles.length === 0) return 'non-releve'
  switch (interventionType) {
    case 'rats':
      if (articles.some(a => a.releves.consommation === 'Totale' || a.releves.traces === 'Rongeurs')) return 'forte'
      if (articles.some(a => a.releves.consommation === 'Partielle' || a.releves.traces === 'Déjections')) return 'moderee'
      return 'inactive'
    case 'frelons_guepes':
      // Nid non neutralisé = encore actif
      if (articles.some(a => a.releves.neutralise === false || a.releves.neutralise === 'false')) return 'forte'
      return 'moderee' // présence confirmée, nid(s) traité(s)
    case 'punaises_lit':
    case 'cafards': {
      const levels = articles.map(a => String(a.releves.infestation ?? '').toLowerCase())
      if (levels.some(l => l.includes('élevée') || l.includes('elevee') || l.includes('forte') || l.includes('haut'))) return 'forte'
      if (levels.some(l => l.includes('modérée') || l.includes('moderee') || l.includes('moyen'))) return 'moderee'
      return 'moderee' // présence détectée et traitée
    }
    default:
      // fourmis, moustiques, mixte : toute zone renseignée = présence
      return 'moderee'
  }
}

const TYPE_LABELS: Record<string, string> = {
  rats: 'Dératisation',
  frelons_guepes: 'Frelons & Guêpes',
  punaises_lit: 'Punaises de lit',
  fourmis: 'Fourmis',
  cafards: 'Cafards / Blattes',
  moustiques: 'Moustiques',
  mixte: 'Multi-nuisibles',
}

const SEVERITY_LABEL: Record<Severity, string> = {
  forte: 'Forte',
  moderee: 'Modérée',
  inactive: 'Inactive',
  'non-releve': 'Non relevé',
}

const SEVERITY_CLASS: Record<Severity, string> = {
  forte: 'bg-red-50 text-red-700',
  moderee: 'bg-amber-50 text-amber-700',
  inactive: 'bg-emerald-50 text-emerald-700',
  'non-releve': 'bg-[#f5f5f4] text-[#78716c]',
}

const SEVERITY_DOT: Record<Severity, string> = {
  forte: 'bg-red-500',
  moderee: 'bg-amber-400',
  inactive: 'bg-emerald-500',
  'non-releve': 'bg-[#d6d3d1]',
}

const STATUS_LABEL: Record<string, string> = { draft: 'Brouillon', signed: 'Signé', sent: 'Envoyé' }
const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-[#f5f5f4] text-[#57534e]',
  signed: 'bg-[#d1f5ed] text-[#064e44]',
  sent: 'bg-primary/10 text-primary',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso))
}

export default async function SiteHistoryPage({
  params,
}: {
  params: Promise<{ tiersId: string }>
}) {
  const { tiersId } = await params
  const tiersIdNum = parseInt(tiersId, 10)
  if (isNaN(tiersIdNum)) notFound()

  const supabase = await createClient()

  const { data: interventions } = await supabase
    .from('interventions')
    .select('id, reference, intervention_date, intervention_type, type_intervention, status, client_name, client_address')
    .eq('dolibarr_tiers_id', tiersIdNum)
    .order('intervention_date', { ascending: false })

  if (!interventions || interventions.length === 0) notFound()

  const { client_name, client_address } = interventions[0]

  // Fetch articles via admin client to bypass RLS subquery recursion
  const ids = interventions.map(i => i.id)
  const admin = createAdminClient()
  const { data: allArticles } = await admin
    .from('articles')
    .select('intervention_id, releves')
    .in('intervention_id', ids)

  const articlesByIntervention = (allArticles ?? []).reduce<Record<string, { releves: Record<string, unknown> }[]>>(
    (acc, a) => {
      const key = a.intervention_id as string
      if (!acc[key]) acc[key] = []
      acc[key].push({ releves: (a.releves ?? {}) as Record<string, unknown> })
      return acc
    },
    {}
  )

  // Severity per intervention
  const items = interventions.map(iv => {
    const arts = articlesByIntervention[iv.id] ?? []
    return {
      ...iv,
      severity: computeSeverity(arts, iv.intervention_type),
      articlesCount: arts.length,
    }
  })

  const [portailTokens, siteInfo] = await Promise.all([
    getPortailTokensByTiers(tiersIdNum),
    getSiteInfo(tiersIdNum),
  ])

  // Server action bound to the most recent intervention
  const createFromLatest = createInterventionFromSite.bind(null, items[0].id)

  // Determine trend: last 2 interventions with postes
  const withPostes = items.filter(i => i.articlesCount > 0)
  let trendLabel: string | null = null
  if (withPostes.length >= 2) {
    const [latest, prev] = withPostes
    const ORDER: Record<Severity, number> = { forte: 3, moderee: 2, inactive: 1, 'non-releve': 0 }
    const diff = ORDER[latest.severity] - ORDER[prev.severity]
    if (diff < 0) trendLabel = '↓ En amélioration'
    else if (diff > 0) trendLabel = '↑ En dégradation'
    else trendLabel = '→ Stable'
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <Link href="/sites" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">
        ← Sites
      </Link>
      <div className="mt-1 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[#1c1917]">{client_name}</h1>
            {client_address && (
              <p className="text-sm text-[#57534e] mt-0.5">{client_address}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {trendLabel && (
              <span className="text-[12.5px] text-[#78716c] font-medium">{trendLabel}</span>
            )}
            <span className="text-[12.5px] text-[#78716c]">
              {items.length} intervention{items.length !== 1 ? 's' : ''}
            </span>
            <form action={createFromLatest}>
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-primary text-white text-sm px-3.5 py-2.5 rounded-lg font-medium hover:bg-primary/90 active:scale-95 transition-all min-h-[44px]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Nouvelle intervention
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Fiche site */}
      <SiteInfoCard tiersId={tiersIdNum} initial={siteInfo} />

      {/* Portail client */}
      <div className="mb-4">
        <PortailLinkManager
          tiersId={tiersIdNum}
          clientName={client_name}
          tokens={portailTokens}
        />
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {(['forte', 'moderee', 'inactive', 'non-releve'] as Severity[]).map(s => (
          <div key={s} className="flex items-center gap-1.5 text-[11.5px] text-[#78716c]">
            <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[s]}`} />
            {SEVERITY_LABEL[s]}
          </div>
        ))}
        <span className="text-[11px] text-[#a8a29e] ml-auto">Activité nuisible</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[#e7e5e4]" />

        <div className="flex flex-col gap-3">
          {items.map((iv, idx) => (
            <Link
              key={iv.id}
              href={`/interventions/${iv.id}`}
              className="flex items-start gap-4 group"
            >
              {/* Timeline dot */}
              <div className="relative z-10 mt-3.5 shrink-0">
                <span className={`block w-[23px] h-[23px] rounded-full border-2 border-white shadow-sm ${SEVERITY_DOT[iv.severity]}`} />
                {idx === 0 && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white leading-none">
                    {/* latest marker — dot color carries the info */}
                  </span>
                )}
              </div>

              {/* Card */}
              <div className="flex-1 bg-white border border-[#e7e5e4] rounded-xl px-4 py-3 hover:border-primary hover:shadow-sm transition-all">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-[13.5px] text-[#1c1917]">
                      {formatDate(iv.intervention_date)}
                      {iv.intervention_type && (
                        <span className="text-[#a8a29e] font-normal ml-1.5 text-[12px]">
                          · {TYPE_LABELS[iv.intervention_type] ?? iv.intervention_type}
                        </span>
                      )}
                      {iv.type_intervention && (
                        <span className="text-[#a8a29e] font-normal ml-1 text-[12px]">
                          ({iv.type_intervention})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono text-[11.5px] text-[#a8a29e]">{iv.reference}</span>
                      <span className={`text-[10.5px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${STATUS_CLASS[iv.status] ?? STATUS_CLASS.draft}`}>
                        {STATUS_LABEL[iv.status] ?? iv.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${SEVERITY_CLASS[iv.severity]}`}>
                      {SEVERITY_LABEL[iv.severity]}
                      {iv.articlesCount > 0 && (
                        <span className="font-normal ml-1 opacity-70">· {iv.articlesCount} poste{iv.articlesCount !== 1 ? 's' : ''}</span>
                      )}
                    </span>
                    <svg className="w-3.5 h-3.5 text-[#a8a29e] group-hover:text-primary shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
