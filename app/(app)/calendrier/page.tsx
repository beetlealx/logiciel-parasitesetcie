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

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; tech?: string }>
}) {
  const { m, tech } = await searchParams
  const now = new Date()
  const [year, month] = m
    ? m.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1]

  const start = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const end   = new Date(year, month, 0).toISOString().split('T')[0]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: interventionsRaw }, { data: contrats }, techniciensList] = await Promise.all([
    supabase
      .from('interventions')
      .select('id, reference, intervention_date, client_name, intervention_type, status, technician_name')
      .gte('intervention_date', start)
      .lte('intervention_date', end)
      .order('intervention_date'),
    user
      ? supabase
          .from('contrats')
          .select('id, client_name, intervention_type, frequence, date_debut, dolibarr_tiers_id')
          .eq('user_id', user.id)
          .eq('actif', true)
      : Promise.resolve({ data: [] }),
    getTechniciens(true),
  ])

  // Filter by technician if selected
  const interventions = tech
    ? (interventionsRaw ?? []).filter(iv => iv.technician_name === tech)
    : (interventionsRaw ?? [])

  // For each active contract, compute next visit date
  // Get last signed/sent intervention date per tiers+type
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

    // Index: tiers_id+type → last date
    const lastDateMap: Record<string, string> = {}
    for (const iv of lastIvs ?? []) {
      const key = `${iv.dolibarr_tiers_id}::${iv.intervention_type}`
      if (!lastDateMap[key]) lastDateMap[key] = iv.intervention_date
    }

    for (const c of contrats) {
      const key = `${c.dolibarr_tiers_id}::${c.intervention_type}`
      const lastDate = lastDateMap[key]
        ? new Date(lastDateMap[key])
        : new Date(c.date_debut)
      const freqMonths = FREQ_MONTHS[c.frequence] ?? 3
      const nextVisit = addMonths(lastDate, freqMonths)
      const dateStr = isoDate(nextVisit)

      // Only show if within the displayed month
      if (dateStr >= start && dateStr <= end) {
        contractVisits.push({
          id: c.id,
          date: dateStr,
          client_name: c.client_name,
          intervention_type: c.intervention_type,
        })
      }
    }
  }

  return (
    <CalendarView
      interventions={interventions}
      contractVisits={contractVisits}
      year={year}
      month={month}
      techniciens={techniciensList.map(t => t.nom)}
      selectedTech={tech ?? ''}
    />
  )
}
