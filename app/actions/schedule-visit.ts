'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createActionCRM } from '@/lib/dolibarr'

export interface SchedulePayload {
  dolibarr_tiers_id: number | null
  client_name: string
  date: string        // ISO date string 'YYYY-MM-DD'
  type: string
  note: string
}

export async function scheduleVisit(
  payload: SchedulePayload
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!payload.date) return { ok: false, error: 'Date requise' }

  const ts = Math.floor(new Date(payload.date).getTime() / 1000)
  const label = payload.type
    ? `${payload.type} — ${payload.client_name}`
    : `Prochaine intervention — ${payload.client_name}`

  const actionId = await createActionCRM({
    label,
    datep: ts,
    datef: ts,
    socid: payload.dolibarr_tiers_id ?? 0,
    note: payload.note,
    percentage: 0,
  })

  if (!actionId) return { ok: false, error: 'Échec de la création dans Dolibarr' }
  return { ok: true }
}
