import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLabel, type InterventionType } from '@/lib/intervention-templates'
import { DOSSIER_STATUT, formatDateFr, formatEur } from '@/lib/devis-labels'
import ImportDevisForm from '@/components/devis-signes/import-devis-form'
import RegleRow from '@/components/devis-signes/regle-row'
import ProduitsEditor from '@/components/devis-signes/produits-editor'

const FILTRES = [
  { key: 'a_typer', label: 'À typer' },
  { key: 'actif', label: 'Actifs' },
  { key: 'all', label: 'Tous' },
] as const

interface Row {
  id: string
  dolibarr_propal_ref: string
  client_name: string
  statut: string
  alerte: string | null
  total_ht: number | null
  signed_at: string | null
  interventions: { status: string; intervention_type: string }[]
}

export default async function DevisSignesPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut = 'actif' } = await searchParams
  const supabase = await createClient()

  let list = supabase
    .from('devis_signes')
    .select('id, dolibarr_propal_ref, client_name, statut, alerte, total_ht, signed_at, interventions(status, intervention_type)')
    .order('signed_at', { ascending: false, nullsFirst: false })
    .limit(200)
  if (statut !== 'all') list = list.eq('statut', statut)

  const [{ data: rows }, { count: aTyper }, { data: regles }, { data: produits }, { data: logs }] = await Promise.all([
    list,
    supabase.from('devis_signes').select('id', { count: 'exact', head: true }).eq('statut', 'a_typer'),
    supabase.from('typage_regles').select('*').order('ordre'),
    supabase.from('typage_produits').select('dolibarr_product_ref, intervention_type').order('dolibarr_product_ref'),
    supabase.from('devis_sync_log').select('id, created_at, source, propal_ref, ok, message').order('created_at', { ascending: false }).limit(20),
  ])
  const dossiers = (rows ?? []) as unknown as Row[]
  const types = (regles ?? []).map(r => ({ code: r.intervention_type as string, label: getLabel(r.intervention_type as InterventionType) }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">← Administration</Link>
        <div className="flex justify-between items-end gap-3 flex-wrap mt-1">
          <div>
            <h1 className="text-xl font-semibold text-[#1c1917]">Devis signés</h1>
            <p className="text-sm text-[#78716c] mt-1">Chaque devis signé dans Dolibarr crée ses interventions automatiquement.</p>
          </div>
          <ImportDevisForm />
        </div>
      </div>

      <div>
        <div className="flex gap-1.5 mb-3">
          {FILTRES.map(f => (
            <Link key={f.key} href={`/admin/devis-signes?statut=${f.key}`}
              className={`text-[13px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                statut === f.key ? 'bg-primary text-white border-primary' : 'bg-white border-[#e7e5e4] text-[#57534e] hover:border-primary'
              }`}>
              {f.label}
              {f.key === 'a_typer' && (aTyper ?? 0) > 0 && (
                <span className={`ml-1.5 text-[11px] px-1.5 rounded-full ${statut === f.key ? 'bg-white/25' : 'bg-amber-100 text-amber-800'}`}>{aTyper}</span>
              )}
            </Link>
          ))}
        </div>

        {dossiers.length === 0 ? (
          <p className="text-center py-12 text-sm text-[#a8a29e]">
            {statut === 'a_typer' ? 'Aucun devis à typer.' : 'Aucun devis signé pour ce filtre.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {dossiers.map(d => {
              const st = DOSSIER_STATUT[d.statut] ?? DOSSIER_STATUT.actif
              const faits = d.interventions.filter(i => i.status !== 'draft').length
              const typesDossier = [...new Set(d.interventions.map(i => i.intervention_type))]
              return (
                <Link key={d.id} href={`/admin/devis-signes/${d.id}`}
                  className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-primary transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[14.5px] mb-1 flex items-center gap-2 flex-wrap">
                      {d.client_name}
                      {typesDossier.length > 0 && (
                        <span className="text-[#a8a29e] font-normal text-[12.5px]">· {typesDossier.map(t => getLabel(t as InterventionType)).join(', ')}</span>
                      )}
                      {d.alerte && <span className="text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">Alerte</span>}
                    </div>
                    <div className="flex gap-3 text-[12.5px] text-[#57534e] flex-wrap">
                      <span className="font-mono text-[#a8a29e]">{d.dolibarr_propal_ref}</span>
                      <span>Signé le {formatDateFr(d.signed_at)}</span>
                      {d.interventions.length > 0 && <span>{faits}/{d.interventions.length} intervention{d.interventions.length > 1 ? 's' : ''} faite{faits > 1 ? 's' : ''}</span>}
                      <span className="hidden sm:inline">{formatEur(d.total_ht)} HT</span>
                    </div>
                  </div>
                  <span className={`text-[11px] uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <Section title="Reconnaissance des lignes de devis"
        help="Mots-clés (séparés par des virgules) pour les lignes en texte libre. Passages : jours après la signature (ex. « 0, 15 » = 2 interventions).">
        <div className="divide-y divide-[#f5f5f4]">
          {(regles ?? []).map(r => (
            <RegleRow key={r.intervention_type} regle={{ ...r, label: getLabel(r.intervention_type as InterventionType) }} />
          ))}
        </div>
      </Section>

      <Section title="Produits Dolibarr" help="Une référence produit listée ici est toujours rattachée à ce type, quel que soit son libellé.">
        <ProduitsEditor mappings={produits ?? []} types={types} />
      </Section>

      <Section title="Journal Dolibarr" help="Derniers échanges : webhook, vérification quotidienne, imports manuels.">
        {(logs ?? []).length === 0 ? (
          <p className="text-[13px] text-[#a8a29e] py-3">Aucun échange pour l&apos;instant.</p>
        ) : (
          <div className="divide-y divide-[#f5f5f4] text-[12.5px]">
            {(logs ?? []).map(l => (
              <div key={l.id} className="py-1.5 flex gap-3">
                <span className="text-[#78716c] whitespace-nowrap">
                  {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(l.created_at))}
                </span>
                <span className="font-mono w-28 shrink-0">{l.propal_ref ?? '—'}</span>
                <span className={l.ok ? 'text-[#57534e]' : 'text-red-700'}>{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#f5f5f4] bg-[#fafaf9]">
        <h2 className="font-medium text-sm text-[#1c1917]">{title}</h2>
        {help && <p className="text-[12px] text-[#78716c] mt-0.5">{help}</p>}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  )
}
