import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardCharts from '@/components/dashboard/dashboard-charts'
import { getStocksEnAlerte } from '@/app/actions/biocides'
import { getPiegesEnAlerte } from '@/app/actions/pieges-moustiques'
import { getAppatsEnAlerte } from '@/app/actions/appats-letaux'
import PlanifierMaintenanceButton from '@/components/dashboard/planifier-maintenance-button'

const TYPE_LABELS: Record<string, string> = {
  rats: 'Dératisation', frelons_guepes: 'Frelons & Guêpes',
  punaises_lit: 'Punaises de lit', fourmis: 'Fourmis',
  cafards: 'Cafards', moustiques: 'Moustiques', mixte: 'Multi-nuisibles',
}
const TYPE_COLORS: Record<string, string> = {
  rats: '#ef4444', frelons_guepes: '#f59e0b', punaises_lit: '#8b5cf6',
  fourmis: '#f97316', cafards: '#78716c', moustiques: '#0ea5e9', mixte: '#6b7280',
}
const STATUS_LABEL: Record<string, string> = { draft: 'Brouillon', signed: 'Signé', sent: 'Envoyé' }
const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-[#f5f5f4] text-[#57534e]',
  signed: 'bg-emerald-50 text-emerald-700',
  sent: 'bg-primary/10 text-primary',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1).toISOString()
}
function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const admin = createAdminClient()
  const todayStr = now.toISOString().split('T')[0]
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()

  // Toutes les requêtes en parallèle
  const [
    stocksAlerte,
    piegesAlerte,
    appatsAlerte,
    { data: yearData },
    { data: recent },
    { data: upcoming },
    { data: contrats },
    { data: allYear12 },
  ] = await Promise.all([
    getStocksEnAlerte(),
    getPiegesEnAlerte(),
    getAppatsEnAlerte(),
    admin
      .from('interventions')
      .select('id, intervention_date, intervention_type, status, client_name, reference')
      .gte('intervention_date', startOfYear(now))
      .order('intervention_date', { ascending: false }),
    admin
      .from('interventions')
      .select('id, reference, client_name, intervention_date, intervention_type, status')
      .in('status', ['signed', 'sent'])
      .order('intervention_date', { ascending: false })
      .limit(5),
    admin
      .from('interventions')
      .select('id, reference, client_name, intervention_date, intervention_type, status, technician_name')
      .eq('status', 'draft')
      .gte('intervention_date', todayStr)
      .order('intervention_date', { ascending: true })
      .limit(8),
    supabase.from('contrats').select('*').eq('actif', true),
    admin
      .from('interventions')
      .select('intervention_date')
      .gte('intervention_date', twelveMonthsAgo),
  ])

  const interventions = yearData ?? []
  const thisMonth = interventions.filter(i => i.intervention_date >= startOfMonth(now))

  // KPIs
  const totalAnnee = interventions.length
  const totalMois = thisMonth.length
  const signedSent = interventions.filter(i => i.status === 'signed' || i.status === 'sent').length
  const tauxSignature = totalAnnee > 0 ? Math.round((signedSent / totalAnnee) * 100) : 0

  // Par type
  const byType: Record<string, number> = {}
  for (const iv of interventions) {
    const t = iv.intervention_type ?? 'autre'
    byType[t] = (byType[t] ?? 0) + 1
  }
  const typeData = Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({ type, count, label: TYPE_LABELS[type] ?? type, color: TYPE_COLORS[type] ?? '#6b7280' }))

  // Par mois (12 derniers mois)
  const monthsMap: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthsMap[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0
  }
  for (const iv of allYear12 ?? []) {
    const k = monthKey(iv.intervention_date)
    if (k in monthsMap) monthsMap[k] = (monthsMap[k] ?? 0) + 1
  }
  const monthlyData = Object.entries(monthsMap).map(([key, count]) => ({ key, label: monthLabel(key), count }))
  const maxMonthly = Math.max(...monthlyData.map(m => m.count), 1)

  // Contrats alertes
  const FREQ_MONTHS: Record<string, number> = {
    mensuel: 1, bimestriel: 2, trimestriel: 3, semestriel: 6, annuel: 12,
  }
  const contratsAlerte = (contrats ?? []).map(c => {
    const freqMonths = FREQ_MONTHS[c.frequence] ?? 3
    const lastDate = new Date(c.date_debut)
    const nextVisit = new Date(lastDate)
    nextVisit.setMonth(nextVisit.getMonth() + freqMonths)
    const diff = (nextVisit.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return { ...c, nextVisit, diff }
  })
    .filter(c => c.diff <= 14)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 5)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-[#78716c] mt-0.5">
          {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Ce mois', value: totalMois, sub: 'interventions', href: '/interventions' },
          { label: 'Cette année', value: totalAnnee, sub: 'interventions', href: '/interventions' },
          { label: 'Taux de signature', value: `${tauxSignature}%`, sub: `${signedSent} signées/envoyées`, href: null },
          { label: 'Contrats actifs', value: contrats?.length ?? 0, sub: `${contratsAlerte.length} alertes`, href: '/contrats' },
        ].map(({ label, value, sub, href }) => {
          const inner = (
            <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-4 hover:border-primary hover:shadow-sm transition-all">
              <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-1">{label}</div>
              <div className="text-2xl font-bold text-[#1c1917]">{value}</div>
              <div className="text-[12px] text-[#78716c] mt-0.5">{sub}</div>
            </div>
          )
          return href ? <Link key={label} href={href}>{inner}</Link> : <div key={label}>{inner}</div>
        })}
      </div>

      {/* Raccourci Admin — mobile uniquement */}
      <div className="sm:hidden">
        <Link href="/admin" className="flex items-center justify-between bg-white border border-[#e7e5e4] rounded-xl px-4 py-3 hover:border-primary hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#f5f5f4] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#57534e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <span className="text-[13px] font-medium text-[#1c1917]">Administration</span>
          </div>
          <svg className="w-4 h-4 text-[#a8a29e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique mensuel */}
        <div className="lg:col-span-2 bg-white border border-[#e7e5e4] rounded-xl px-4 py-4">
          <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-4">
            Interventions — 12 derniers mois
          </div>
          <DashboardCharts monthlyData={monthlyData} typeData={typeData} maxMonthly={maxMonthly} />
        </div>

        {/* Répartition par type */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-4">
          <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-4">
            Par type — {now.getFullYear()}
          </div>
          {typeData.length === 0 ? (
            <p className="text-sm text-[#a8a29e]">Aucune intervention cette année.</p>
          ) : (
            <div className="space-y-3">
              {typeData.map(({ type, count, label, color }) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12.5px] text-[#1c1917]">{label}</span>
                    <span className="text-[12px] font-semibold text-[#57534e]">{count}</span>
                  </div>
                  <div className="h-1.5 bg-[#f5f5f4] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(count / totalAnnee) * 100}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* À venir */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f5f5f4] flex items-center justify-between">
            <span className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">À venir</span>
            <Link href="/calendrier" className="text-[11px] text-primary hover:text-primary/80">Calendrier →</Link>
          </div>
          {(upcoming ?? []).length === 0 ? (
            <p className="p-4 text-sm text-[#a8a29e]">Aucun RDV planifié.</p>
          ) : (
            <div className="divide-y divide-[#f5f5f4]">
              {(upcoming ?? []).map(iv => {
                const fmtFull = new Date(iv.intervention_date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
                return (
                  <Link
                    key={iv.id}
                    href={`/interventions/${iv.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafaf9] transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: TYPE_COLORS[iv.intervention_type ?? ''] ?? '#6b7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{iv.client_name}</div>
                      <div className="text-[11px] text-[#a8a29e]">
                        {TYPE_LABELS[iv.intervention_type ?? ''] ?? '—'}
                        {iv.technician_name ? ` · ${iv.technician_name}` : ''}
                      </div>
                    </div>
                    <div className="text-[11.5px] text-[#78716c] shrink-0 capitalize">{fmtFull}</div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Récentes (effectuées) */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f5f5f4] flex items-center justify-between">
            <span className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Récentes</span>
            <Link href="/interventions" className="text-[11px] text-primary hover:text-primary/80">Tout voir →</Link>
          </div>
          {(recent ?? []).length === 0 ? (
            <p className="p-4 text-sm text-[#a8a29e]">Aucune intervention.</p>
          ) : (
            <div className="divide-y divide-[#f5f5f4]">
              {(recent ?? []).map(iv => (
                <Link
                  key={iv.id}
                  href={`/interventions/${iv.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafaf9] transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: TYPE_COLORS[iv.intervention_type ?? ''] ?? '#6b7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{iv.client_name}</div>
                    <div className="text-[11px] text-[#a8a29e] font-mono">{iv.reference}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11.5px] text-[#78716c]">{fmt(iv.intervention_date)}</div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_CLASS[iv.status] ?? STATUS_CLASS.draft}`}>
                      {STATUS_LABEL[iv.status] ?? iv.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Contrats à surveiller */}
        <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f5f5f4] flex items-center justify-between">
            <span className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Contrats à surveiller</span>
            <Link href="/contrats" className="text-[11px] text-primary hover:text-primary/80">Tout voir →</Link>
          </div>
          {contratsAlerte.length === 0 ? (
            <p className="p-4 text-sm text-[#a8a29e]">Tous les contrats sont à jour ✓</p>
          ) : (
            <div className="divide-y divide-[#f5f5f4]">
              {contratsAlerte.map(c => {
                const overdue = c.diff < 0
                return (
                  <Link
                    key={c.id}
                    href={`/contrats/${c.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafaf9] transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${overdue ? 'bg-red-500' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{c.client_name}</div>
                      <div className="text-[11px] text-[#a8a29e]">{TYPE_LABELS[c.intervention_type] ?? c.intervention_type}</div>
                    </div>
                    <div className={`text-[11.5px] font-semibold shrink-0 ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                      {overdue
                        ? `${Math.abs(Math.round(c.diff))}j de retard`
                        : c.diff < 1 ? "Aujourd'hui"
                        : `Dans ${Math.round(c.diff)}j`}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Appâts létaux à relever */}
      {appatsAlerte.length > 0 && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f5f5f4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Appâts létaux à relever</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">{appatsAlerte.length}</span>
            </div>
            <span className="text-[11px] text-[#a8a29e]">Règle des 35 jours</span>
          </div>
          <div className="divide-y divide-[#f5f5f4]">
            {appatsAlerte.map(a => {
              const diff = Math.ceil((new Date(a.date_releve_prevue).getTime() - Date.now()) / 86400000)
              const overdue = diff < 0
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${overdue ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{a.client_name}</div>
                    <div className="text-[11px] text-[#a8a29e] truncate">{a.emplacement}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`text-[11.5px] font-semibold ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                      {overdue
                        ? `${Math.abs(diff)}j de retard`
                        : diff === 0 ? "Aujourd'hui"
                        : `Dans ${diff}j`}
                    </div>
                    <PlanifierMaintenanceButton
                      type="appat_releve"
                      clientName={a.client_name}
                      clientAddress={a.client_address}
                      dateRelevePrevue={a.date_releve_prevue}
                      emplacement={a.emplacement}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pièges moustiques — entretien */}
      {(piegesAlerte.gaz.length > 0 || piegesAlerte.attractif.length > 0) && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f5f5f4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Pièges moustiques</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700">
                {piegesAlerte.gaz.length + piegesAlerte.attractif.length}
              </span>
            </div>
          </div>
          <div className="divide-y divide-[#f5f5f4]">
            {/* Gaz — mensuel */}
            {piegesAlerte.gaz.map(p => (
              <div key={`gaz-${p.id}`} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-2 h-2 rounded-full shrink-0 bg-sky-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{p.client_name}</div>
                  <div className="text-[11px] text-[#a8a29e]">
                    {p.numero} · {p.type_piege.toUpperCase()} · Bouteille de gaz à changer
                  </div>
                </div>
                <PlanifierMaintenanceButton
                  type="gaz"
                  clientName={p.client_name}
                  clientAddress={p.client_address}
                />
              </div>
            ))}
            {/* Attractif — 2 mois */}
            {piegesAlerte.attractif.map(p => {
              const base = p.date_dernier_attractif ?? p.date_installation
              const expiry = new Date(base)
              expiry.setMonth(expiry.getMonth() + 2)
              const diff = Math.ceil((expiry.getTime() - Date.now()) / 86400000)
              return (
                <div key={`attr-${p.id}`} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${diff < 0 ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{p.client_name}</div>
                    <div className="text-[11px] text-[#a8a29e]">
                      {p.numero} · {p.type_piege.toUpperCase()} · Attractif expiré
                    </div>
                  </div>
                  <PlanifierMaintenanceButton
                    type="attractif"
                    clientName={p.client_name}
                    clientAddress={p.client_address}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stocks en alerte */}
      {stocksAlerte.length > 0 && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f5f5f4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Stocks bas</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">{stocksAlerte.length}</span>
            </div>
            <Link href="/admin/biocides" className="text-[11px] text-primary hover:text-primary/80">Gérer →</Link>
          </div>
          <div className="divide-y divide-[#f5f5f4]">
            {stocksAlerte.slice(0, 5).map(s => (
              <Link key={s.id} href="/admin/biocides" className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fafaf9] transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.quantite <= 0 ? 'bg-red-500' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{s.nom}</div>
                  {s.numero_amm && <div className="text-[11px] text-[#a8a29e] font-mono">AMM {s.numero_amm}</div>}
                </div>
                <div className={`text-[11.5px] font-semibold shrink-0 ${s.quantite <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {s.quantite <= 0 ? 'Épuisé' : `${s.quantite} ${s.unite}`}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Avis Google */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl px-5 py-5 flex flex-col sm:flex-row items-center gap-6">
        <div className="shrink-0 flex items-center justify-center w-48 h-48 bg-[#fafaf9] rounded-xl border border-[#e7e5e4] overflow-hidden p-2">
          <Image
            src="/qr-avis-google-parasites-et-compagnie.png"
            alt="QR code avis Google"
            width={176}
            height={176}
            className="w-44 h-44"
          />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <span className="text-[11px] font-semibold text-[#a8a29e] uppercase tracking-wide">Avis clients</span>
          </div>
          <p className="text-[14px] font-semibold text-[#1c1917] mb-1">
            Demandez un avis Google à vos clients
          </p>
          <p className="text-[12px] text-[#78716c]">
            Montrez ce QR code à la fin de l&apos;intervention pour qu&apos;ils laissent un avis directement sur votre fiche Google.
          </p>
        </div>
      </div>
    </div>
  )
}
