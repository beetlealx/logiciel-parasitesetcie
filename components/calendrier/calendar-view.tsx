'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createIntervention } from '@/app/actions/interventions'
import TypePickerModal from '@/components/interventions/type-picker-modal'
import type { InterventionType } from '@/lib/intervention-templates'

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
  view: 'month' | 'week'
  weekStart?: string
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

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

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

function buildWeekDays(monday: string): Date[] {
  const base = new Date(monday)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d
  })
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function IVEventCard({ iv, today, compact = false }: { iv: Intervention; today: string; compact?: boolean }) {
  const c = TYPE_COLORS[iv.intervention_type ?? ''] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
  const isDraftFuture = iv.status === 'draft' && iv.intervention_date.slice(0, 10) >= today
  const isDraftPast   = iv.status === 'draft' && iv.intervention_date.slice(0, 10) < today

  if (isDraftFuture) {
    return (
      <Link
        href={`/interventions/${iv.id}`}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium leading-tight truncate border border-dashed ${c.text} hover:opacity-75 transition-opacity`}
        style={{ borderColor: 'currentColor' }}
        title={`RDV planifié — ${iv.client_name}${iv.technician_name ? ` · ${iv.technician_name}` : ''}`}
      >
        <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        </svg>
        <span className="truncate">{iv.client_name}</span>
      </Link>
    )
  }
  return (
    <Link
      href={`/interventions/${iv.id}`}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium leading-tight truncate ${isDraftPast ? 'opacity-50 ' : ''}${c.bg} ${c.text} hover:opacity-75 transition-opacity`}
      title={`${iv.client_name} — ${TYPE_LABELS[iv.intervention_type ?? ''] ?? ''}${iv.technician_name ? ` · ${iv.technician_name}` : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[iv.status] ?? STATUS_DOT.draft}`} />
      <span className="truncate">{iv.client_name}</span>
      {!compact && iv.technician_name && (
        <span className="truncate text-[9.5px] opacity-70 ml-0.5">· {iv.technician_name}</span>
      )}
    </Link>
  )
}

function CVEventCard({ cv }: { cv: ContractVisit }) {
  const c = TYPE_COLORS[cv.intervention_type] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
  return (
    <Link
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
}

export default function CalendarView({
  interventions, contractVisits, year, month, view, weekStart,
  techniciens = [], selectedTech = '',
}: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [pickerDate, setPickerDate] = useState<string | null>(null)
  const [pendingType, setPendingType] = useState<InterventionType | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleTypeSelect(type: InterventionType) {
    if (!pickerDate) return
    setPendingType(type)
    const techParam = selectedTech ? `&tech=${selectedTech}` : ''
    const returnUrl = view === 'week' && weekStart
      ? `/calendrier?v=week&w=${weekStart}${techParam}`
      : `/calendrier?m=${year}-${pad(month)}${techParam}`
    startTransition(async () => {
      await createIntervention(type, pickerDate, returnUrl)
      setPendingType(null)
      setPickerDate(null)
    })
  }

  function navUrl(params: Record<string, string>) {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) p.set(k, v)
    if (selectedTech) p.set('tech', selectedTech)
    return `/calendrier?${p.toString()}`
  }

  // Build date indexes
  const byDate: Record<string, Intervention[]> = {}
  for (const iv of interventions) {
    const key = iv.intervention_date.slice(0, 10)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(iv)
  }
  const visitsByDate: Record<string, ContractVisit[]> = {}
  for (const cv of contractVisits) {
    if (!visitsByDate[cv.date]) visitsByDate[cv.date] = []
    visitsByDate[cv.date].push(cv)
  }

  // Month view data
  const weeks = view === 'month' ? buildWeeks(year, month) : []
  const monthLabel = new Date(year, month - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  // Week view data
  const weekDays = view === 'week' && weekStart ? buildWeekDays(weekStart) : []
  const prevM = month === 1  ? `${year - 1}-12` : `${year}-${pad(month - 1)}`
  const nextM = month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`
  const thisM = today.slice(0, 7)

  const prevW = weekStart ? (() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); return dateStr(d) })() : ''
  const nextW = weekStart ? (() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); return dateStr(d) })() : ''
  const thisW = (() => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); return dateStr(d) })()

  // Label for week view header
  const weekLabel = weekDays.length === 7
    ? (() => {
        const first = weekDays[0]; const last = weekDays[6]
        const sameMonth = first.getMonth() === last.getMonth()
        if (sameMonth) {
          return `${first.getDate()} – ${last.getDate()} ${last.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
        }
        return `${first.getDate()} ${first.toLocaleDateString('fr-FR', { month: 'short' })} – ${last.getDate()} ${last.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`
      })()
    : ''

  const PlusBtn = ({ ds }: { ds: string }) => (
    <button
      type="button"
      onClick={() => setPickerDate(ds)}
      className="sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 w-5 h-5 flex items-center justify-center rounded text-[#a8a29e] hover:text-primary hover:bg-[#f5f5f4] transition-all"
      title="Nouvelle intervention"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>
  )

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-xl font-semibold capitalize">
          {view === 'week' ? weekLabel : monthLabel}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex border border-[#e7e5e4] rounded-lg overflow-hidden">
            <button
              onClick={() => router.push(navUrl({ m: `${year}-${pad(month)}` }))}
              className={`text-[12.5px] px-3 py-1.5 transition-colors ${view === 'month' ? 'bg-primary text-white' : 'hover:bg-[#f5f5f4]'}`}
            >
              Mois
            </button>
            <button
              onClick={() => router.push(navUrl({ v: 'week', w: weekStart ?? thisW }))}
              className={`text-[12.5px] px-3 py-1.5 border-l border-[#e7e5e4] transition-colors ${view === 'week' ? 'bg-primary text-white' : 'hover:bg-[#f5f5f4]'}`}
            >
              Semaine
            </button>
          </div>

          {/* Tech filter */}
          {techniciens.length > 0 && (
            <select
              value={selectedTech}
              onChange={e => {
                const techParam = e.target.value
                if (view === 'week') {
                  router.push(navUrl({ v: 'week', w: weekStart ?? thisW, tech: techParam }))
                } else {
                  router.push(navUrl({ m: `${year}-${pad(month)}`, tech: techParam }))
                }
              }}
              className="text-[12.5px] px-3 py-1.5 border border-[#e7e5e4] rounded-lg bg-white focus:outline-none focus:border-primary"
            >
              <option value="">Tous les techniciens</option>
              {techniciens.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {/* Today */}
          <button
            onClick={() => view === 'week'
              ? router.push(navUrl({ v: 'week', w: thisW }))
              : router.push(navUrl({ m: thisM }))
            }
            className="text-[12.5px] px-3 py-1.5 border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] transition-colors"
          >
            Aujourd'hui
          </button>

          {/* Prev / Next */}
          <button
            onClick={() => view === 'week'
              ? router.push(navUrl({ v: 'week', w: prevW }))
              : router.push(navUrl({ m: prevM }))
            }
            className="p-2 border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] transition-colors"
          >
            <svg className="w-4 h-4 text-[#57534e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            onClick={() => view === 'week'
              ? router.push(navUrl({ v: 'week', w: nextW }))
              : router.push(navUrl({ m: nextM }))
            }
            className="p-2 border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] transition-colors"
          >
            <svg className="w-4 h-4 text-[#57534e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* ── MONTH VIEW ── */}
      {view === 'month' && (
        <>
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-[11px] font-semibold text-[#a8a29e] uppercase tracking-wide text-center py-1.5">{d}</div>
            ))}
          </div>
          <div className="border border-[#e7e5e4] rounded-xl overflow-hidden bg-[#f5f5f4]">
            {weeks.map((week, wi) => (
              <div key={wi} className={`grid grid-cols-7 gap-px ${wi > 0 ? 'mt-px' : ''}`}>
                {week.map((day, di) => {
                  const ds = dateStr(day)
                  const inMonth = day.getMonth() + 1 === month
                  const isToday = ds === today
                  const dayIvs = byDate[ds] ?? []
                  const dayVisits = visitsByDate[ds] ?? []
                  const total = dayIvs.length + dayVisits.length
                  return (
                    <div key={di} className={`group min-h-[100px] p-1.5 flex flex-col ${inMonth ? 'bg-white' : 'bg-[#fafaf9]'}`}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-medium ${
                          isToday ? 'bg-primary text-white' : inMonth ? 'text-[#1c1917]' : 'text-[#c8c4c0]'
                        }`}>{day.getDate()}</span>
                        {inMonth && <PlusBtn ds={ds} />}
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1">
                        {dayIvs.slice(0, total > 3 ? 1 : 3).map(iv => (
                          <IVEventCard key={iv.id} iv={iv} today={today} compact />
                        ))}
                        {dayVisits.slice(0, total > 3 ? 1 : 3).map(cv => (
                          <CVEventCard key={`cv-${cv.id}`} cv={cv} />
                        ))}
                        {total > 3 && (
                          <span className="text-[10px] text-[#a8a29e] px-1.5">+{total - 2} autre{total - 2 > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── WEEK VIEW ── */}
      {view === 'week' && weekDays.length === 7 && (
        <>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-7 border border-[#e7e5e4] rounded-xl overflow-hidden bg-[#f5f5f4] min-w-[560px]">
            {/* Day headers */}
            {weekDays.map((day, i) => {
              const ds = dateStr(day)
              const isToday = ds === today
              const dayIvs = byDate[ds] ?? []
              const dayVisits = visitsByDate[ds] ?? []
              const isWeekend = i >= 5
              return (
                <div
                  key={i}
                  className={`flex flex-col ${i > 0 ? 'border-l border-[#e7e5e4]' : ''} ${isWeekend ? 'bg-[#fafaf9]' : 'bg-white'}`}
                >
                  {/* Header */}
                  <div className={`group px-2 py-2.5 border-b border-[#e7e5e4] flex items-center justify-between ${isWeekend ? 'bg-[#f5f5f4]' : 'bg-[#fafaf9]'}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#a8a29e] uppercase">{DAY_NAMES[i]}</span>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-semibold ${
                        isToday ? 'bg-primary text-white' : 'text-[#1c1917]'
                      }`}>{day.getDate()}</span>
                    </div>
                    <PlusBtn ds={ds} />
                  </div>
                  {/* Events */}
                  <div className="flex flex-col gap-1 p-1.5 min-h-[160px]">
                    {dayIvs.map(iv => (
                      <IVEventCard key={iv.id} iv={iv} today={today} />
                    ))}
                    {dayVisits.map(cv => (
                      <CVEventCard key={`cv-${cv.id}`} cv={cv} />
                    ))}
                    {dayIvs.length === 0 && dayVisits.length === 0 && (
                      <span className="text-[10px] text-[#d6d3d1] text-center mt-4">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        </>
      )}

      {/* Type picker modal */}
      {pickerDate && (
        <TypePickerModal
          onSelect={handleTypeSelect}
          loading={isPending}
          selectedType={pendingType}
          onClose={() => { if (!isPending) { setPickerDate(null); setPendingType(null) } }}
        />
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <div className="flex items-center gap-3 text-[11px] text-[#a8a29e] mr-2 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded border border-dashed border-[#a8a29e]" />
            RDV planifié
          </span>
          {[['signed', 'Signé', 'bg-emerald-500'], ['sent', 'Envoyé', 'bg-primary']].map(([, label, dot]) => (
            <span key={label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded border border-dashed border-[#a8a29e] opacity-50" />
            Visite contractuelle
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(TYPE_LABELS).map(([key, label]) => {
            const c = TYPE_COLORS[key]
            return (
              <span key={key} className={`text-[11px] px-2 py-0.5 rounded ${c.bg} ${c.text}`}>{label}</span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
