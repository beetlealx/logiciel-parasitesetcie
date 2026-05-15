import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

export default async function SitesPage() {
  const supabase = await createClient()

  const { data: rows = [] } = await supabase
    .from('interventions')
    .select('dolibarr_tiers_id, client_name, client_address, intervention_date, id')
    .order('intervention_date', { ascending: false })

  // Group by dolibarr_tiers_id (stable key). Clients without tiers_id are grouped by client_name.
  type SiteEntry = {
    tiersId: number | null
    clientName: string
    clientAddress: string
    lastDate: string
    count: number
    key: string
  }

  const map = new Map<string, SiteEntry>()
  for (const row of rows ?? []) {
    const key = row.dolibarr_tiers_id != null
      ? `tiers:${row.dolibarr_tiers_id}`
      : `name:${row.client_name}`

    if (!map.has(key)) {
      map.set(key, {
        tiersId: row.dolibarr_tiers_id,
        clientName: row.client_name,
        clientAddress: row.client_address,
        lastDate: row.intervention_date,
        count: 1,
        key,
      })
    } else {
      const entry = map.get(key)!
      entry.count++
      // rows are ordered DESC so first occurrence is the most recent
    }
  }

  const sites = Array.from(map.values())

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-semibold">Sites</h1>
        <span className="text-sm text-[#78716c]">{sites.length} site{sites.length !== 1 ? 's' : ''}</span>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-16 text-sm text-[#57534e]">
          Aucun site trouvé. Créez votre première intervention.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sites.map(site => {
            const href = site.tiersId != null ? `/sites/${site.tiersId}` : null
            const card = (
              <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-primary hover:shadow-sm transition-all group">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14.5px] mb-1">{site.clientName}</div>
                  <div className="flex gap-3 text-[12.5px] text-[#57534e] flex-wrap">
                    {site.clientAddress && (
                      <span className="truncate max-w-[260px]">{site.clientAddress}</span>
                    )}
                    <span className="text-[#a8a29e]">
                      {site.count} intervention{site.count !== 1 ? 's' : ''}
                    </span>
                    <span>Dernière visite : {formatDate(site.lastDate)}</span>
                  </div>
                </div>
                {href && (
                  <svg className="w-4 h-4 text-[#a8a29e] group-hover:text-primary shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                )}
              </div>
            )

            return href ? (
              <Link key={site.key} href={href}>{card}</Link>
            ) : (
              <div key={site.key}>{card}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
