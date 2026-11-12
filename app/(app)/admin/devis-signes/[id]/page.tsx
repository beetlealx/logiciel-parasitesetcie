import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLabel, type InterventionType } from '@/lib/intervention-templates'
import { DOSSIER_STATUT, TYPAGE_SOURCE, formatDateFr, formatEur } from '@/lib/devis-labels'
import type { LigneTypee } from '@/lib/typage'
import TypageForm from '@/components/devis-signes/typage-form'
import DossierActions from '@/components/devis-signes/dossier-actions'

const STATUT_IV: Record<string, { label: string; cls: string }> = {
  draft: { label: 'À faire', cls: 'bg-amber-50 text-amber-800' },
  signed: { label: 'Signée', cls: 'bg-[#d1f5ed] text-[#064e44]' },
  sent: { label: 'Envoyée', cls: 'bg-primary/10 text-primary' },
}

export default async function DevisSignePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: d }, { data: ivs }, { data: regles }] = await Promise.all([
    supabase.from('devis_signes').select('*').eq('id', id).single(),
    supabase
      .from('interventions')
      .select('id, reference, intervention_type, passage_numero, intervention_date, technician_name, status')
      .eq('devis_signe_id', id)
      .order('intervention_type')
      .order('passage_numero'),
    supabase.from('typage_regles').select('intervention_type').order('ordre'),
  ])
  if (!d) notFound()

  const label = (c: string) => getLabel(c as InterventionType)
  const types = (regles ?? []).map(r => ({ code: r.intervention_type as string, label: label(r.intervention_type) }))
  const lignes = (d.lignes ?? []) as LigneTypee[]
  const st = DOSSIER_STATUT[d.statut] ?? DOSSIER_STATUT.actif
  const nonTypees = lignes.filter(l => l.type_codes.length === 0 && !l.ignoree).length

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <Link href="/admin/devis-signes" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">← Devis signés</Link>
        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
          <h1 className="text-xl font-semibold text-[#1c1917]">{d.client_name}</h1>
          <span className={`text-[11px] uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
        </div>
        <div className="flex gap-3 text-[12.5px] text-[#57534e] flex-wrap mt-1">
          <span className="font-mono">{d.dolibarr_propal_ref}</span>
          <span>Signé le {formatDateFr(d.signed_at)}</span>
          <span>{formatEur(d.total_ht)} HT</span>
          {d.ref_client && <span>Réf. client : {d.ref_client}</span>}
          {d.dolibarr_tiers_id && <Link href={`/sites/${d.dolibarr_tiers_id}`} className="text-primary font-medium">Fiche site →</Link>}
        </div>
        {d.client_address && <p className="text-[12.5px] text-[#78716c] mt-0.5">{d.client_address}</p>}
      </div>

      {d.alerte && <div className="bg-red-50 border border-red-100 text-red-800 text-[13px] rounded-xl px-4 py-3">{d.alerte}</div>}

      <DossierActions dossierId={d.id} mode={d.mode_facturation} statut={d.statut} hasAlerte={!!d.alerte} />

      <Section title="Lignes du devis" subtitle={nonTypees > 0 ? `${nonTypees} ligne(s) non rattachée(s)` : undefined}>
        {d.statut !== 'annule' && (d.statut === 'a_typer' || nonTypees > 0) ? (
          <TypageForm dossierId={d.id} lignes={lignes} types={types} mode={d.mode_facturation} />
        ) : (
          <div className="divide-y divide-[#f5f5f4]">
            {lignes.map((l, i) => (
              <div key={i} className="py-2.5 flex items-start gap-3 text-[13px]">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{l.label || l.description.replace(/<[^>]+>/g, '').slice(0, 80) || 'Ligne'}</div>
                  <div className="text-[12px] text-[#a8a29e]">
                    {l.product_ref && <span className="font-mono mr-2">{l.product_ref}</span>}
                    {l.qty} × · {formatEur(l.total_ht)} HT
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {l.type_codes.length > 0 ? (
                    <>
                      <div className="font-medium text-primary">{l.type_codes.map(label).join(', ')}</div>
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

      <Section title="Interventions créées" subtitle={`${ivs?.length ?? 0} au total`}>
        {(ivs ?? []).length === 0 ? (
          <p className="text-[13px] text-[#a8a29e] py-4 text-center">Aucune intervention : typez les lignes du devis pour les créer.</p>
        ) : (
          <div className="flex flex-col gap-1.5 py-1">
            {(ivs ?? []).map(iv => {
              const s = STATUT_IV[iv.status] ?? STATUT_IV.draft
              return (
                <Link key={iv.id} href={`/interventions/${iv.id}`}
                  className="border border-[#e7e5e4] rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-primary transition-colors text-[13px]">
                  <span className="font-semibold w-32 shrink-0 truncate">{label(iv.intervention_type)}{iv.passage_numero ? ` · ${iv.passage_numero}` : ''}</span>
                  <span className="text-[#57534e] w-24 shrink-0">{formatDateFr(iv.intervention_date)}</span>
                  <span className="text-[#57534e] flex-1 truncate">{iv.technician_name}</span>
                  <span className="font-mono text-[11.5px] text-[#a8a29e] hidden sm:inline">{iv.reference}</span>
                  <span className={`text-[10.5px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f5f5f4] bg-[#fafaf9]">
        <h2 className="font-medium text-sm text-[#1c1917]">{title}</h2>
        {subtitle && <span className="text-[12px] text-[#a8a29e]">{subtitle}</span>}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  )
}
