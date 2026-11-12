'use server'

import { createMaintenanceEvent, type MaintenanceEventType } from '@/lib/google-calendar'

function firstDayOfNextMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

function inTwoMonths(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 2)
  return d.toISOString().split('T')[0]
}

export async function planifierGazCalendar(input: {
  client_name: string
  client_address?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await createMaintenanceEvent({
      type: 'piege_gaz',
      client_name: input.client_name,
      client_address: input.client_address,
      date: firstDayOfNextMonth(),
      description: 'Remplacement bouteille de gaz CO₂ — piège anti-moustiques',
    })
    return { ok: true }
  } catch {
    return { ok: false, error: 'Échec création événement Google Calendar' }
  }
}

export async function planifierAttractifCalendar(input: {
  client_name: string
  client_address?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await createMaintenanceEvent({
      type: 'piege_attractif',
      client_name: input.client_name,
      client_address: input.client_address,
      date: inTwoMonths(),
      description: 'Renouvellement attractifs + vérification plaques collantes pondoirs',
    })
    return { ok: true }
  } catch {
    return { ok: false, error: 'Échec création événement Google Calendar' }
  }
}

export async function planifierReleverAppatsCalendar(input: {
  client_name: string
  client_address?: string | null
  date_releve_prevue: string
  emplacement: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await createMaintenanceEvent({
      type: 'appat_letal_releve',
      client_name: input.client_name,
      client_address: input.client_address,
      date: input.date_releve_prevue,
      description: `Levée appât létal — ${input.emplacement}\nRègle légale 35 jours.`,
    })
    return { ok: true }
  } catch {
    return { ok: false, error: 'Échec création événement Google Calendar' }
  }
}
