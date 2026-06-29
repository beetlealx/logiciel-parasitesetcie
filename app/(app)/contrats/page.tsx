import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TYPE_LABELS: Record<string, string> = {
  rats: 'Dératisation', frelons_guepes: 'Frelons & Guêpes',
  punaises_lit: 'Punaises de lit', fourmis: 'Fourmis',
  cafards: 'Cafards / Blattes', moustiques: 'Moustiques', mixte: 'Multi-nuisibles',
}

const FREQ_LABELS: Record<string, string> = {
  mensuel: 'Mensuel', bimestriel: 'Bimestriel', trimestriel: 'Trimestriel',
  semestriel: 'Semestriel', annuel: 'Annuel',
}

const FREQ_MONTHS: Record<string, number> = {
  mensuel: 1, bimestriel: 2, trimestriel: 3, semestriel: 6, annuel: 12,
}

function addMonths(date: Date, n: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function getStatut(nextVisit: Date): 'ok' | 'bientot' | 'retard' {
  const now = new Date()
  const diff = (nextVisit.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'retard'
  if (diff <= 14) return 'bientot'
  return 'ok'
}

const STATUT_STYLE = {
  ok:      { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'À jour' },
  bientot: { badge: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-400',   label: 'Bientôt dû' },
  retard:  { badge: 'bg-red-50 text-red-700',          dot: 'bg-red-500',     label: 'En retard' },
}

function fmt(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function ContratsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: contrats } = await supabase
    .from('contrats')
    .select('*')
    .eq('user_id', user.id)
    .eq('actif', true)
    .order('client_name')

  const admin = createAdminClient()

  // Last intervention per tiers+type
  const tiersTypes = (contrats ?? []).map(c => ({
    tiers: c.dolibarr_tiers_id,
    type: c.intervention_type,
  }))

  const lastVisits: Record<string, string | null> = {}
  await Promise.all(
    tiersTypes.map(async ({ tiers, type }) => {
      const key = `${tiers}_${type}`
      const { data } = await admin
        .from('interventions')
        .select('intervention_date')
        .eq('dolibarr_tiers_id', tiers)
        .eq('intervention_type', type)
        .in('status', ['signed', 'sent'])
        .order('intervention_date', { ascending: false })
        .limit(1)
        .single()
      lastVisits[key] = data?.intervention_date ?? null
    })
  )

  const items = (contrats ?? []).map(c => {
    const key = `${c.dolibarr_tiers_id}_${c.intervention_type}`
    const lastStr = lastVisits[key]
    const freqMonths = FREQ_MONTHS[c.frequence] ?? 3
    const lastDate = lastStr ? new Date(lastStr) : new Date(c.date_debut)
    const nextVisit = addMonths(lastDate, freqMonths)
    const statut = getStatut(nextVisit)
    return { ...c, lastDate: lastStr ? lastDate : null, nextVisit, statut }
  })

  const retard  = items.filter(i => i.statut === 'retard')
  const bientot = items.filter(i => i.statut === 'bientot')
  const ok      = items.filter(i => i.statut === 'ok')
  const sorted  = [...retard, ...bientot, ...ok]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Contrats de maintenance</h1>
          <p className="text-sm text-[#78716c] mt-0.5">{items.length} contrat{items.length !== 1 ? 's' : ''} actif{items.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/contrats/nouveau"
          className="flex items-center gap-1.5 bg-primary text-white text-sm px-3.5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors min-h-[44px]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau contrat
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center text-[#a8a29e] text-sm">
          Aucun contrat actif. Créez votre premier contrat de maintenance.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(c => {
            const st = STATUT_STYLE[c.statut as keyof typeof STATUT_STYLE]
            return (
              <Link
                key={c.id}
                href={`/contrats/${c.id}`}
                className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3.5 hover:border-primary hover:shadow-sm transition-all flex items-center gap-4"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[13.5px] text-[#1c1917] truncate">{c.client_name}</span>
                    <span className="text-[11.5px] text-[#a8a29e]">·</span>
                    <span className="text-[12px] text-[#57534e]">{TYPE_LABELS[c.intervention_type] ?? c.intervention_type}</span>
                    <span className="text-[11px] text-[#a8a29e] bg-[#f5f5f4] px-2 py-0.5 rounded-full">{FREQ_LABELS[c.frequence] ?? c.frequence}</span>
                    {c.dolibarr_contract_ref && (
                      <span className="font-mono text-[11px] text-[#a8a29e]">{c.dolibarr_contract_ref}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[12px] text-[#78716c]">
                    {c.lastDate && <span>Dernière visite : {fmt(c.lastDate)}</span>}
                    <span className="font-medium">Prochaine : {fmt(c.nextVisit)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${st.badge}`}>{st.label}</span>
                  <svg className="w-3.5 h-3.5 text-[#a8a29e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
