import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent } from '@/lib/google-calendar'

// POST /api/google-calendar/sync-all
// Header: x-setup-secret: <GOOGLE_WEBHOOK_TOKEN>
// Synchronise toutes les interventions existantes sans google_event_id vers Google Calendar
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-setup-secret')

  if (!process.env.GOOGLE_WEBHOOK_TOKEN || secret !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: interventions, error } = await supabase
    .from('interventions')
    .select('id, reference, client_name, client_address, technician_name, intervention_type, intervention_date')
    .in('status', ['draft', 'signed', 'sent'])
    .is('google_event_id', null)
    .order('intervention_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = interventions ?? []
  let synced = 0
  let failed = 0

  for (const iv of list) {
    const eventId = await createCalendarEvent({
      id: iv.id,
      reference: iv.reference,
      client_name: iv.client_name,
      client_address: iv.client_address ?? '',
      technician_name: iv.technician_name,
      intervention_type: iv.intervention_type ?? null,
      intervention_date: iv.intervention_date,
    })

    if (eventId) {
      await supabase
        .from('interventions')
        .update({ google_event_id: eventId })
        .eq('id', iv.id)
      synced++
    } else {
      failed++
    }
  }

  return NextResponse.json({ ok: true, total: list.length, synced, failed })
}
