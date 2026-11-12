import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'

const TYPE_LABELS: Record<string, string> = {
  rats:           'Dératisation',
  frelons_guepes: 'Frelons & Guêpes',
  punaises_lit:   'Punaises de lit',
  fourmis:        'Fourmis',
  cafards:        'Cafards / Blattes',
  moustiques:     'Moustiques',
  mixte:          'Multi-nuisibles',
}

function getToken(): string {
  const secret = process.env.ICAL_TOKEN ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return createHash('sha256').update('ical:' + secret).digest('hex').slice(0, 32)
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function toIcsDate(dateStr: string): string {
  return dateStr.slice(0, 10).replace(/-/g, '')
}

function nowIcsDateTime(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token') ?? ''

  if (token !== getToken()) {
    return new Response('Non autorisé', { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: interventions, error } = await supabase
    .from('interventions')
    .select('id, reference, intervention_date, client_name, client_address, intervention_type, status, technician_name, synthese')
    .in('status', ['draft', 'signed', 'sent'])
    .order('intervention_date', { ascending: false })

  if (error) {
    return new Response('Erreur serveur', { status: 500 })
  }

  const host = new URL(request.url).host
  const dtstamp = nowIcsDateTime()

  const events = (interventions ?? []).map(iv => {
    const dateVal = toIcsDate(iv.intervention_date)
    const typeLabel = TYPE_LABELS[iv.intervention_type ?? ''] ?? iv.intervention_type ?? 'Intervention'
    const statusLabel = iv.status === 'signed' ? '✓ Signé' : iv.status === 'sent' ? '✓ Envoyé' : '⏳ Brouillon'
    const summary = `${typeLabel} — ${iv.client_name}`
    const descParts = [
      `Réf : ${iv.reference}`,
      iv.technician_name ? `Technicien : ${iv.technician_name}` : '',
      `Statut : ${statusLabel}`,
      iv.synthese ? `\n${iv.synthese}` : '',
    ].filter(Boolean)

    return [
      'BEGIN:VEVENT',
      `UID:${iv.id}@${host}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dateVal}`,
      `DTEND;VALUE=DATE:${dateVal}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(descParts.join('\n'))}`,
      iv.client_address ? `LOCATION:${escapeIcs(iv.client_address)}` : '',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n')
  })

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Parasites et Cie//Calendrier//FR`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Parasites & Cie — Interventions`,
    'X-WR-TIMEZONE:Europe/Paris',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="parasites-cie.ics"',
      'Cache-Control': 'no-cache, no-store',
    },
  })
}
