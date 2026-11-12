import Link from 'next/link'
import { requireProfile } from '@/lib/auth'
import { DOSSIER_STATUT, formatDateFr, formatEur } from '@/lib/labels'
import ImportDevisForm from '@/components/dossiers/import-devis-form'

const FILTRES = [
  { key: 'a_typer', label: 'À typer' },
  { key: 'actif', label: 'Actifs' },
  { key: 'all', label: 'Tous' },
] as const

interface DossierListRow {
  id: string
  dolibarr_propal_ref: string
  client_name: string
  client_address: string
  statut: string
  alerte: string | null
  total_ht: number | null
  signed_at: string | null
  prestations: { type_code: string; prestation_types: { label: string } | null }[]
  interventions: { planning_status: string }[]
}

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>
}) {
  const { supabase, profile } = await requireProfile()
  const { statut = 'actif' } = await searchParams

  const [{ count: aTyper }, listResult] = await Promise.all([
    supabase.from('dossiers').select('id', { count: 'exact', head: true }).eq('statut', 'a_typer'),
    (() => {
      let q = supabase
        .from('dossiers')
        .select('id, dolibarr_propal_ref, client_name, client_address, statut, alerte, total_ht, signed_at, prestations(type_code, prestation_types(label)), interventions(planning_status)')
        .order('signed_at', { ascending: false, nullsFirst: false })
        .limit(200)
      if (statut !== 'all') q = q.eq('statut', statut)
      return q
    })(),
  ])
  const dossiers = (listResult.data ?? []) as unknown as DossierListRow[]

  return (
    <div>
      <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Dossiers</h1>
          <p className="text-[12.5px] text-[#78716c] mt-0.5">Un dossier est créé automatiquement à chaque devis signé dans Dolibarr.</p>
        </div>
        {profile.role === 'gerant' && <ImportDevisForm />}
      </div>

      <div className="flex gap-1.5 mb-4">
        {FILTRES.map(f => (
          <Link
            key={f.key}
            href={`/dossiers?statut=${f.key}`}
            className={`text-[13px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
              statut === f.key ? 'bg-primary text-white border-primary' : 'bg-white border-[#e7e5e4] text-[#57534e] hover:border-primary'
            }`}
          >
            {f.label}
            {f.key === 'a_typer' && (aTyper ?? 0) > 0 && (
              <span className={`ml-1.5 text-[11px] px-1.5 rounded-full ${statut === f.key ? 'bg-white/25' : 'bg-amber-100 text-amber-800'}`}>{aTyper}</span>
            )}
          </Link>
        ))}
      </div>

      {dossiers.length === 0 ? (
        <div className="text-center py-16 text-[#57534e] text-sm">
          {statut === 'a_typer' ? 'Aucun devis à typer.' : 'Aucun dossier pour ce filtre.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {dossiers.map(d => {
            const st = DOSSIER_STATUT[d.statut] ?? DOSSIER_STATUT.actif
            const passages = d.interventions.filter(i => i.planning_status !== 'annule')
            const faits = passages.filter(i => i.planning_status === 'realise').length
            return (
              <Link
                key={d.id}
                href={`/dossiers/${d.id}`}
                className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-primary hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14.5px] mb-1 flex items-center gap-2 flex-wrap">
                    {d.client_name}
                    {d.prestations.length > 0 && (
                      <span className="text-[#a8a29e] font-normal text-[12.5px]">
                        · {d.prestations.map(p => p.prestation_types?.label ?? p.type_code).join(', ')}
                      </span>
                    )}
                    {d.alerte && <span className="text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">Alerte</span>}
                  </div>
                  <div className="flex gap-3 text-[12.5px] text-[#57534e] flex-wrap">
                    <span className="font-mono text-[#a8a29e]">{d.dolibarr_propal_ref}</span>
                    <span>Signé le {formatDateFr(d.signed_at)}</span>
                    {passages.length > 0 && <span>{faits}/{passages.length} passage{passages.length > 1 ? 's' : ''} réalisé{faits > 1 ? 's' : ''}</span>}
                    <span className="hidden sm:inline">{formatEur(d.total_ht)} HT</span>
                  </div>
                </div>
                <span className={`text-[11px] uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                <svg className="w-4 h-4 text-[#a8a29e] group-hover:text-primary shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
