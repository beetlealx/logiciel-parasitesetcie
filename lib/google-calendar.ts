import { createSign } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

interface ServiceAccount {
  client_email: string
  private_key: string
}

function isEnabled(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_CALENDAR_ID)
}

// --- JWT / auth ---

function base64url(data: string): string {
  return Buffer.from(data).toString('base64url')
}

function makeJWT(sa: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${payload}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  return `${unsigned}.${signer.sign(sa.private_key, 'base64url')}`
}

// Cache du token en mémoire (valide 58 min)
let _tokenCache: { token: string; exp: number } | null = null

async function getAccessToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.exp) return _tokenCache.token

  const sa: ServiceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: makeJWT(sa),
    }),
  })

  const json = await res.json()
  if (!json.access_token) throw new Error('[GCal] auth failed: ' + JSON.stringify(json))

  _tokenCache = { token: json.access_token, exp: Date.now() + 58 * 60 * 1000 }
  return _tokenCache.token
}

// --- API helper ---

const calBase = 'https://www.googleapis.com/calendar/v3'

async function calFetch(method: string, path: string, body?: object): Promise<Response> {
  const token = await getAccessToken()
  return fetch(`${calBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// --- Event operations ---

export interface InterventionForCal {
  id: string
  reference: string
  client_name: string
  client_address: string
  technician_name: string
  intervention_type?: string | null
  intervention_date: string
}

function eventBody(iv: InterventionForCal): object {
  const date = iv.intervention_date.split('T')[0]
  return {
    summary: `${iv.reference} — ${iv.client_name}`,
    description: [
      iv.intervention_type ? `Type : ${iv.intervention_type}` : '',
      `Technicien : ${iv.technician_name}`,
    ].filter(Boolean).join('\n'),
    location: iv.client_address || undefined,
    start: { date },
    end: { date },
    extendedProperties: { private: { interventionId: iv.id } },
  }
}

function calendarPath(): string {
  return `/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!)}`
}

export async function createCalendarEvent(iv: InterventionForCal): Promise<string | null> {
  if (!isEnabled()) return null
  try {
    const res = await calFetch('POST', `${calendarPath()}/events`, eventBody(iv))
    if (!res.ok) { console.error('[GCal] createEvent failed:', await res.text()); return null }
    return (await res.json()).id ?? null
  } catch (e) {
    console.error('[GCal] createEvent:', e)
    return null
  }
}

export async function updateCalendarEvent(eventId: string, iv: InterventionForCal): Promise<void> {
  if (!isEnabled()) return
  try {
    const res = await calFetch('PATCH', `${calendarPath()}/events/${encodeURIComponent(eventId)}`, eventBody(iv))
    if (!res.ok) console.error('[GCal] updateEvent failed:', await res.text())
  } catch (e) {
    console.error('[GCal] updateEvent:', e)
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!isEnabled()) return
  try {
    const res = await calFetch('DELETE', `${calendarPath()}/events/${encodeURIComponent(eventId)}`)
    if (!res.ok && res.status !== 410) console.error('[GCal] deleteEvent failed:', await res.text())
  } catch (e) {
    console.error('[GCal] deleteEvent:', e)
  }
}

// --- Événements de maintenance (pièges moustiques, appâts létaux) ---

export type MaintenanceEventType =
  | 'piege_gaz'
  | 'piege_attractif'
  | 'appat_letal_releve'

const MAINTENANCE_LABELS: Record<MaintenanceEventType, string> = {
  piege_gaz:          '🦟 Changement bouteille gaz',
  piege_attractif:    '🦟 Renouvellement attractifs',
  appat_letal_releve: '🐀 Levée appât létal',
}

export async function createMaintenanceEvent(input: {
  type: MaintenanceEventType
  client_name: string
  client_address?: string | null
  date: string   // YYYY-MM-DD
  description?: string
}): Promise<string | null> {
  if (!isEnabled()) return null
  try {
    const res = await calFetch('POST', `${calendarPath()}/events`, {
      summary: `${MAINTENANCE_LABELS[input.type]} — ${input.client_name}`,
      description: input.description ?? '',
      location: input.client_address ?? undefined,
      start: { date: input.date },
      end:   { date: input.date },
    })
    if (!res.ok) { console.error('[GCal] createMaintenanceEvent failed:', await res.text()); return null }
    return (await res.json()).id ?? null
  } catch (e) {
    console.error('[GCal] createMaintenanceEvent:', e)
    return null
  }
}

// --- Sync token (Google → App) ---

async function getSyncToken(): Promise<string | null> {
  const { data } = await createAdminClient()
    .from('app_settings').select('value').eq('key', 'gcal_sync_token').maybeSingle()
  return data?.value ?? null
}

async function saveSyncToken(token: string): Promise<void> {
  await createAdminClient().from('app_settings').upsert({
    key: 'gcal_sync_token', value: token, updated_at: new Date().toISOString(),
  })
}

// Traite les changements Google Calendar → met à jour ou crée des interventions
export async function syncFromGoogle(): Promise<void> {
  if (!isEnabled()) return
  const supabase = createAdminClient()
  const syncToken = await getSyncToken()
  const base = `${calendarPath()}/events?singleEvents=true&maxResults=250`
  const url = syncToken ? `${base}&syncToken=${encodeURIComponent(syncToken)}` : base

  try {
    const res = await calFetch('GET', url)

    if (res.status === 410) {
      await supabase.from('app_settings').delete().eq('key', 'gcal_sync_token')
      const fresh = await calFetch('GET', `${calendarPath()}/events?singleEvents=true&maxResults=1`)
      const freshData = await fresh.json()
      if (freshData.nextSyncToken) await saveSyncToken(freshData.nextSyncToken)
      return
    }

    if (!res.ok) { console.error('[GCal] list failed:', await res.text()); return }

    const data = await res.json()

    // user_id par défaut : premier utilisateur trouvé dans les interventions existantes
    const { data: anyIv } = await supabase.from('interventions').select('user_id').limit(1).maybeSingle()
    const defaultUserId = anyIv?.user_id ?? null

    for (const event of (data.items ?? [])) {
      const interventionId = event.extendedProperties?.private?.interventionId
      const newDate = event.start?.date ?? event.start?.dateTime?.split('T')[0]

      if (event.status === 'cancelled') {
        if (interventionId) {
          await supabase.from('interventions').update({ google_event_id: null }).eq('id', interventionId)
        }
        continue
      }

      if (!newDate) continue

      if (interventionId) {
        // Événement lié à une intervention existante → met à jour la date
        await supabase
          .from('interventions')
          .update({ intervention_date: newDate })
          .eq('id', interventionId)
          .eq('google_event_id', event.id)
      } else if (defaultUserId && event.id && (event.summary ?? '').toUpperCase().includes('INTER')) {
        // Nouvel événement créé dans Google Calendar avec "INTER" dans le titre → crée un brouillon
        const year = new Date(newDate).getFullYear()
        const { data: lastRow } = await supabase
          .from('interventions').select('reference')
          .like('reference', `INT-${year}-%`)
          .order('reference', { ascending: false }).limit(1).maybeSingle()

        const baseNum = lastRow ? parseInt(lastRow.reference.split('-')[2], 10) : 0

        for (let attempt = 0; attempt < 10; attempt++) {
          const reference = `INT-${year}-${String(baseNum + 1 + attempt).padStart(4, '0')}`
          const { data: created, error } = await supabase.from('interventions').insert({
            user_id: defaultUserId,
            reference,
            client_name: event.summary ?? 'Client à définir',
            client_address: event.location ?? '',
            technician_name: 'À définir',
            status: 'draft',
            intervention_date: newDate,
            google_event_id: event.id,
          }).select('id').single()

          if (created) {
            // Marquer l'événement Google avec l'ID de l'intervention
            await calFetch('PATCH', `${calendarPath()}/events/${encodeURIComponent(event.id)}`, {
              extendedProperties: { private: { interventionId: created.id } },
            })
            break
          }
          if (error?.code !== '23505') break
        }
      }
    }

    if (data.nextSyncToken) await saveSyncToken(data.nextSyncToken)
  } catch (e) {
    console.error('[GCal] syncFromGoogle:', e)
  }
}

// --- Enregistrement du webhook Google ---

export async function registerWebhook(appUrl: string): Promise<{ channelId: string; expiration: string } | null> {
  if (!isEnabled()) return null
  try {
    const channelId = `parasites-${Date.now()}`
    const res = await calFetch('POST', `${calendarPath()}/events/watch`, {
      id: channelId,
      type: 'web_hook',
      address: `${appUrl}/api/google-calendar/webhook`,
      token: process.env.GOOGLE_WEBHOOK_TOKEN ?? '',
    })

    if (!res.ok) { console.error('[GCal] watch failed:', await res.text()); return null }
    const data = await res.json()

    const expiration = data.expiration
      ? new Date(Number(data.expiration)).toISOString()
      : 'unknown'

    await createAdminClient().from('app_settings').upsert([
      { key: 'gcal_channel_id', value: channelId },
      { key: 'gcal_resource_id', value: data.resourceId ?? '' },
      { key: 'gcal_channel_expiration', value: expiration },
    ])

    return { channelId, expiration }
  } catch (e) {
    console.error('[GCal] registerWebhook:', e)
    return null
  }
}
