import { createClient } from '@/lib/supabase/server'
import CalendarView from '@/components/calendrier/calendar-view'
import { getTechniciens } from '@/app/actions/techniciens'

const FREQ_MONTHS: Record<string, number> = {
  mensuel: 1, bimestriel: 2, trimestriel: 3, semestriel: 6, annuel: 12,
}

function addMonths(date: Date, n: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; tech?: string; v?: string; w?: string }>
}) {
  const { m, tech, v, w } = await searchParams
  const view = v === 'week' ? 'week' : 'month'
  const now = new Date()

  let year: number, month: number, start: string, end: string, weekStart: string | undefined

  if (view === 'week') {
    const baseDate = w ? new Date(w) : now
    const monday = getMondayOf(baseDate)
    weekStart = isoDate(monday)
    year = monday.getFullYear()
    month = monday.getMonth() + 1
    start = weekStart
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    end = isoDate(sunday)
  } else {
    weekStart = undefined
    const [y, mo] = m
      ? m.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]
    year = y; month = mo
    start = new Date(year, month - 1, 1).toISOString().split('T')[0]
    end = new Date(year, month, 0).toISOString().split('T')[0]
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: interventionsRaw }, { data: contrats }, techniciensList] = await Promise.all([
    supabase
      .from('interventions')
      .select('id, reference, intervention_date, client_name, intervention_type, status, technician_name')
      .gte('intervention_date', start)
      .lte('intervention_date', end + 'T23:59:59')
      .order('intervention_date'),
    user
      ? supabase
          .from('contrats')
          .select('id, client_name, intervention_type, frequence, date_debut, dolibarr_tiers_id')
          .eq('actif', true)
      : Promise.resolve({ data: [] }),
    getTechniciens(true),
  ])

  const interventions = tech
    ? (interventionsRaw ?? []).filter(iv => iv.technician_name === tech)
    : (interventionsRaw ?? [])

  const contractVisits: Array<{ id: string; date: string; client_name: string; intervention_type: string }> = []

  if (contrats && contrats.length > 0) {
    const tiersIds = [...new Set(contrats.map(c => c.dolibarr_tiers_id).filter(Boolean))]
    const types = [...new Set(contrats.map(c => c.intervention_type))]

    const { data: lastIvs } = tiersIds.length > 0
      ? await supabase
          .from('interventions')
          .select('dolibarr_tiers_id, intervention_type, intervention_date')
          .in('dolibarr_tiers_id', tiersIds)
          .in('intervention_type', types)
          .in('status', ['signed', 'sent'])
          .order('intervention_date', { ascending: false })
      : { data: [] }

    const lastDateMap: Record<string, string> = {}
    for (const iv of lastIvs ?? []) {
      const key = `${iv.dolibarr_tiers_id}::${iv.intervention_type}`
      if (!lastDateMap[key]) lastDateMap[key] = iv.intervention_date
    }

    for (const c of contrats) {
      const key = `${c.dolibarr_tiers_id}::${c.intervention_type}`
      const lastDate = lastDateMap[key] ? new Date(lastDateMap[key]) : new Date(c.date_debut)
      const freqMonths = FREQ_MONTHS[c.frequence] ?? 3
      const nextVisit = addMonths(lastDate, freqMonths)
      const dateStr = isoDate(nextVisit)

      if (dateStr >= start && dateStr <= end) {
        contractVisits.push({ id: c.id, date: dateStr, client_name: c.client_name, intervention_type: c.intervention_type })
      }
    }
  }

  return (
    <CalendarView
      interventions={interventions}
      contractVisits={contractVisits}
      year={year}
      month={month}
      view={view}
      weekStart={weekStart}
      techniciens={techniciensList.map(t => t.nom)}
      selectedTech={tech ?? ''}
    />
  )
}
