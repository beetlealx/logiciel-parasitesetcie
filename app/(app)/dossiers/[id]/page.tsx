import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireProfile } from '@/lib/auth'
import { DOSSIER_STATUT, FACTURATION, PLANNING_STATUT, TYPAGE_SOURCE, formatDateFr, formatEur } from '@/lib/labels'
import type { LigneTypee, PrestationTypeDef } from '@/lib/typage'
import TypageForm from '@/components/dossiers/typage-form'
import DossierActions from '@/components/dossiers/dossier-actions'

interface Passage {
  id: string
  reference: string
  passage_numero: number | null
  date_prevue: string | null
  technician_name: string
  planning_status: string
  status: string
  prestation_type: string | null
}

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, profile } = await requireProfile()
  const isGerant = profile.role === 'gerant'

  const [{ data: dossier }, { data: passages }, { data: types }] = await Promise.all([
    supabase.from('dossiers').select('*').eq('id', id).single(),
    supabase
      .from('interventions')
      .select('id, reference, passage_numero, date_prevue, technician_name, planning_status, status, prestation_type')
      .eq('dossier_id', id)
      .order('prestation_type')
      .order('passage_numero'),
    supabase.from('prestation_types').select('*').order('ordre'),
  ])
  if (!dossier) notFound()

  const typeDefs = (types ?? []) as PrestationTypeDef[]
  const typeLabel = (code: string | null) => typeDefs.find(t => t.code === code)?.label ?? code ?? '—'
  const lignes = (dossier.lignes ?? []) as LigneTypee[]
  const st = DOSSIER_STATUT[dossier.statut] ?? DOSSIER_STATUT.actif
  const nonTypees = lignes.filter(l => l.type_codes.length === 0 && !l.ignoree).length
  const groupes = new Map<string, Passage[]>()
  for (const p of (passages ?? []) as Passage[]) {
    const k = p.prestation_type ?? 'autre'
    groupes.set(k, [...(groupes.get(k) ?? []), p])
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/dossiers" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">← Dossiers</Link>
        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
          <h1 className="text-xl font-semibold text-[#1c1917]">{dossier.client_name}</h1>
          <span className={`text-[11px] uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
        </div>
        <div className="flex gap-3 text-[12.5px] text-[#57534e] flex-wrap mt-1">
          <span className="font-mono">{dossier.dolibarr_propal_ref}</span>
          <span>Signé le {formatDateFr(dossier.signed_at)}</span>
          <span>{formatEur(dossier.total_ht)} HT</span>
          {dossier.ref_client && <span>Réf. client : {dossier.ref_client}</span>}
          {dossier.dolibarr_tiers_id && (
            <Link href={`/sites/${dossier.dolibarr_tiers_id}`} className="text-primary font-medium">Historique du site →</Link>
          )}
        </div>
        {dossier.client_address && <p className="text-[12.5px] text-[#78716c] mt-0.5">{dossier.client_address}</p>}
      </div>

      {dossier.alerte && (
        <div className="bg-red-50 border border-red-100 text-red-800 text-[13px] rounded-xl px-4 py-3">
          {dossier.alerte}
        </div>
      )}

      {isGerant && (
        <DossierActions
          dossierId={dossier.id}
          mode={dossier.mode_facturation}
          statut={dossier.statut}
          hasAlerte={!!dossier.alerte}
        />
      )}
      {!isGerant && (
        <p className="text-[12.5px] text-[#57534e]">Facturation : {FACTURATION[dossier.mode_facturation]}</p>
      )}

      {/* Lignes du devis */}
      <Section title="Lignes du devis" subtitle={nonTypees > 0 ? `${nonTypees} ligne(s) non rattachée(s)` : undefined}>
        {isGerant && dossier.statut !== 'annule' && (dossier.statut === 'a_typer' || nonTypees > 0) ? (
          <TypageForm
            dossierId={dossier.id}
            lignes={lignes}
            types={typeDefs.map(t => ({ code: t.code, label: t.label }))}
            mode={dossier.mode_facturation}
          />
        ) : (
          <div className="divide-y divide-[#f5f5f4]">
            {lignes.map((l, i) => (
              <div key={i} className="py-2.5 flex items-start gap-3 text-[13px]">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{l.label || l.description.slice(0, 80) || 'Ligne'}</div>
                  <div className="text-[12px] text-[#a8a29e]">
                    {l.product_ref && <span className="font-mono mr-2">{l.product_ref}</span>}
                    {l.qty} × · {formatEur(l.total_ht)} HT
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {l.type_codes.length > 0 ? (
                    <>
                      <div className="font-medium text-primary">{l.type_codes.map(typeLabel).join(', ')}</div>
                      {l.source && <div className="text-[11px] text-[#a8a29e]">{TYPAGE_SOURCE[l.source]}</div>}
                    </>
                  ) : (
                    <span className="text-[12px] text-[#a8a29e]">{l.ignoree ? 'Frais annexe' : 'Non rattachée'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Passages */}
      <Section title="Passages" subtitle={`${passages?.length ?? 0} au total`}>
        {groupes.size === 0 ? (
          <p className="text-[13px] text-[#a8a29e] py-4 text-center">Aucun passage : typez les lignes du devis pour les créer.</p>
        ) : (
          <div className="space-y-4">
            {[...groupes.entries()].map(([code, list]) => (
              <div key={code}>
                <h3 className="text-[12px] uppercase tracking-wide font-semibold text-[#78716c] mb-1.5">{typeLabel(code)}</h3>
                <div className="flex flex-col gap-1.5">
                  {list.map(p => {
                    const ps = PLANNING_STATUT[p.planning_status] ?? PLANNING_STATUT.a_planifier
                    return (
                      <Link
                        key={p.id}
                        href={`/interventions/${p.id}`}
                        className="border border-[#e7e5e4] rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-primary transition-colors text-[13px]"
                      >
                        <span className="font-semibold w-20 shrink-0">Passage {p.passage_numero ?? '—'}</span>
                        <span className="text-[#57534e] w-24 shrink-0">{formatDateFr(p.date_prevue)}</span>
                        <span className="text-[#57534e] flex-1 truncate">{p.technician_name}</span>
                        <span className="font-mono text-[11.5px] text-[#a8a29e] hidden sm:inline">{p.reference}</span>
                        <span className={`text-[10.5px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${ps.cls}`}>{ps.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {dossier.note_public && (
        <Section title="Note du devis">
          <p className="text-[13px] text-[#57534e] whitespace-pre-line">{dossier.note_public.replace(/<[^>]+>/g, '')}</p>
        </Section>
      )}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f5f5f4] bg-[#fafaf9]">
        <h2 className="font-medium text-sm text-[#1c1917]">{title}</h2>
        {subtitle && <span className="text-[12px] text-[#a8a29e]">{subtitle}</span>}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}
