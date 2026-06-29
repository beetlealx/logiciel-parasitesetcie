'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Intervention {
  id: string
  reference: string
  intervention_date: string
  client_name: string
  intervention_type: string | null
  status: string
  technician_name: string
}

interface ContractVisit {
  id: string
  date: string
  client_name: string
  intervention_type: string
}

interface Props {
  interventions: Intervention[]
  contractVisits: ContractVisit[]
  year: number
  month: number
  techniciens?: string[]
  selectedTech?: string
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  rats:           { bg: 'bg-red-100',    text: 'text-red-800' },
  frelons_guepes: { bg: 'bg-amber-100',  text: 'text-amber-800' },
  punaises_lit:   { bg: 'bg-violet-100', text: 'text-violet-800' },
  fourmis:        { bg: 'bg-orange-100', text: 'text-orange-800' },
  cafards:        { bg: 'bg-stone-100',  text: 'text-stone-700' },
  moustiques:     { bg: 'bg-sky-100',    text: 'text-sky-800' },
  mixte:          { bg: 'bg-gray-100',   text: 'text-gray-700' },
}

const TYPE_LABELS: Record<string, string> = {
  rats:           'Dératisation',
  frelons_guepes: 'Frelons & Guêpes',
  punaises_lit:   'Punaises de lit',
  fourmis:        'Fourmis',
  cafards:        'Cafards / Blattes',
  moustiques:     'Moustiques',
  mixte:          'Multi-nuisibles',
}

const STATUS_DOT: Record<string, string> = {
  draft:  'bg-[#d6d3d1]',
  signed: 'bg-emerald-500',
  sent:   'bg-primary',
}

function pad(n: number) { return String(n).padStart(2, '0') }

function buildWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)
  const dow = firstDay.getDay()
  const offset = dow === 0 ? 6 : dow - 1
  const start = new Date(firstDay)
  start.setDate(start.getDate() - offset)

  const weeks: Date[][] = []
  const cursor = new Date(start)
  while (cursor <= lastDay || weeks.length < 4) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
    if (cursor > lastDay && weeks.length >= 4) break
  }
  return weeks
}

export default function CalendarView({ interventions, contractVisits, year, month, techniciens = [], selectedTech = '' }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const prevM = month === 1  ? `${year - 1}-12`            : `${year}-${pad(month - 1)}`
  const nextM = month === 12 ? `${year + 1}-01`            : `${year}-${pad(month + 1)}`
  const thisM = today.slice(0, 7)

  const monthLabel = new Date(year, month - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const byDate: Record<string, Intervention[]> = {}
  for (const iv of interventions) {
    if (!byDate[iv.intervention_date]) byDate[iv.intervention_date] = []
    byDate[iv.intervention_date].push(iv)
  }

  const visitsByDate: Record<string, ContractVisit[]> = {}
  for (const cv of contractVisits) {
    if (!visitsByDate[cv.date]) visitsByDate[cv.date] = []
    visitsByDate[cv.date].push(cv)
  }

  const weeks = buildWeeks(year, month)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-xl font-semibold capitalize">{monthLabel}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {techniciens.length > 0 && (
            <select
              value={selectedTech}
              onChange={e => {
                const params = new URLSearchParams()
                params.set('m', `${year}-${pad(month)}`)
                if (e.target.value) params.set('tech', e.target.value)
                router.push(`/calendrier?${params.toString()}`)
              }}
              className="text-[12.5px] px-3 py-1.5 border border-[#e7e5e4] rounded-lg bg-white focus:outline-none focus:border-primary"
            >
              <option value="">Tous les techniciens</option>
              {techniciens.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <button
            onClick={() => router.push(`/calendrier?m=${thisM}${selectedTech ? `&tech=${selectedTech}` : ''}`)}
            className="text-[12.5px] px-3 py-1.5 border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] transition-colors"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => router.push(`/calendrier?m=${prevM}`)}
            className="p-2 border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] transition-colors"
          >
            <svg className="w-4 h-4 text-[#57534e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            onClick={() => router.push(`/calendrier?m=${nextM}`)}
            className="p-2 border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] transition-colors"
          >
            <svg className="w-4 h-4 text-[#57534e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
          <div key={d} className="text-[11px] font-semibold text-[#a8a29e] uppercase tracking-wide text-center py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="border border-[#e7e5e4] rounded-xl overflow-hidden bg-[#f5f5f4]">
        {weeks.map((week, wi) => (
          <div key={wi} className={`grid grid-cols-7 gap-px ${wi > 0 ? 'mt-px' : ''}`}>
            {week.map((day, di) => {
              const dateStr = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
              const inMonth = day.getMonth() + 1 === month
              const isToday = dateStr === today
              const dayIvs  = byDate[dateStr] ?? []
              const dayVisits = visitsByDate[dateStr] ?? []
              const totalEvents = dayIvs.length + dayVisits.length

              return (
                <div
                  key={di}
                  className={`min-h-[100px] p-1.5 flex flex-col ${inMonth ? 'bg-white' : 'bg-[#fafaf9]'}`}
                >
                  {/* Date number */}
                  <div className="mb-1">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-medium ${
                      isToday
                        ? 'bg-primary text-white'
                        : inMonth
                          ? 'text-[#1c1917]'
                          : 'text-[#c8c4c0]'
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="flex flex-col gap-0.5 flex-1">
                    {/* Interventions */}
                    {dayIvs.slice(0, totalEvents > 3 ? 1 : 3).map(iv => {
                      const c = TYPE_COLORS[iv.intervention_type ?? ''] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
                      return (
                        <Link
                          key={iv.id}
                          href={`/interventions/${iv.id}`}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium leading-tight truncate ${c.bg} ${c.text} hover:opacity-75 transition-opacity`}
                          title={`${iv.client_name} — ${TYPE_LABELS[iv.intervention_type ?? ''] ?? ''}${iv.technician_name ? ` · ${iv.technician_name}` : ''}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[iv.status] ?? STATUS_DOT.draft}`} />
                          <span className="truncate">{iv.client_name}</span>
                        </Link>
                      )
                    })}

                    {/* Contract visits */}
                    {dayVisits.slice(0, totalEvents > 3 ? 1 : 3).map(cv => {
                      const c = TYPE_COLORS[cv.intervention_type] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
                      return (
                        <Link
                          key={`cv-${cv.id}`}
                          href={`/contrats/${cv.id}`}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium leading-tight truncate border border-dashed ${c.text} hover:opacity-75 transition-opacity`}
                          style={{ borderColor: 'currentColor', opacity: 0.8 }}
                          title={`Visite prévue — ${cv.client_name} — ${TYPE_LABELS[cv.intervention_type] ?? cv.intervention_type}`}
                        >
                          <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                          </svg>
                          <span className="truncate">{cv.client_name}</span>
                        </Link>
                      )
                    })}

                    {totalEvents > 3 && (
                      <span className="text-[10px] text-[#a8a29e] px-1.5">
                        +{totalEvents - 2} autre{totalEvents - 2 > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <div className="flex items-center gap-3 text-[11px] text-[#a8a29e] mr-2">
          Statut :
          {[['draft', 'Brouillon', 'bg-[#d6d3d1]'], ['signed', 'Signé', 'bg-emerald-500'], ['sent', 'Envoyé', 'bg-primary']].map(([, label, dot]) => (
            <span key={label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1 ml-2">
            <span className="w-2 h-2 rounded border border-dashed border-current" />
            Visite contractuelle
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(TYPE_LABELS).map(([key, label]) => {
            const c = TYPE_COLORS[key]
            return (
              <span key={key} className={`text-[11px] px-2 py-0.5 rounded ${c.bg} ${c.text}`}>
                {label}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
