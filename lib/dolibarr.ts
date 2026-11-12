import https from 'node:https'
import http from 'node:http'

// Helper interne — contourne les problèmes SSL des certificats auto-signés
// Uniquement utilisé côté serveur (Route Handlers)
function dolibarrGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(
      url,
      {
        headers: { DOLAPIKEY: process.env.DOLIBARR_API_KEY! },
        rejectUnauthorized: false,
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => resolve(body))
      }
    )
    req.on('error', reject)
    req.setTimeout(8000, () => {
      req.destroy()
      reject(new Error('Dolibarr timeout'))
    })
  })
}

/**
 * Requête générique vers l'API REST Dolibarr (côté serveur uniquement).
 * Renvoie le JSON décodé, ou lève une erreur avec le code HTTP et le message Dolibarr.
 */
export function dolibarrRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PUT',
  pathAndQuery: string,
  payload?: unknown,
  timeoutMs = 15000,
): Promise<T> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return Promise.reject(new Error('DOLIBARR_API_URL non configuré'))

  const body = payload === undefined ? undefined : JSON.stringify(payload)
  const urlObj = new URL(`${apiUrl.replace(/\/$/, '')}${pathAndQuery}`)
  const lib = urlObj.protocol === 'https:' ? https : http

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          DOLAPIKEY: process.env.DOLIBARR_API_KEY!,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          let json: unknown = null
          try { json = data ? JSON.parse(data) : null } catch { /* non-JSON */ }
          const status = res.statusCode ?? 0
          if (status >= 200 && status < 300) {
            resolve(json as T)
          } else {
            const err = json as { error?: { message?: string } } | null
            const msg = err?.error?.message ?? data.slice(0, 200)
            reject(new Error(`Dolibarr ${status} ${method} ${urlObj.pathname}: ${msg}`))
          }
        })
      },
    )
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      reject(new Error('Dolibarr timeout'))
    })
    if (body) req.write(body)
    req.end()
  })
}

export interface DolibarrTiers {
  id: number
  nom: string
  adresse_complete: string
  email: string
  code_client: string
}

export async function searchTiers(q: string): Promise<DolibarrTiers[]> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return []

  const safeQ = q.replace(/'/g, '').replace(/[\\;]/g, '')
  const filter = encodeURIComponent(`(t.nom:like:'%${safeQ}%')`)
  const url = `${apiUrl}/thirdparties?sqlfilters=${filter}&limit=20`

  try {
    const raw = JSON.parse(await dolibarrGet(url))
    if (!Array.isArray(raw)) return []

    return raw.map((t) => ({
      id: Number(t.id),
      nom: t.name ?? t.nom ?? t.ref ?? '',
      adresse_complete: [
        t.address,
        t.zip && t.town ? `${t.zip} ${t.town}` : t.town,
      ]
        .filter(Boolean)
        .join(', '),
      email: t.email ?? '',
      code_client: t.code_client ?? '',
    }))
  } catch (err) {
    console.error('[Dolibarr] searchTiers error:', err)
    return []
  }
}

export interface DolibarrEvent {
  id: number
  label: string
  datep: number
  socid: number | null
  socsocialnom: string
  note: string
  percentage: number
}

export async function createTiers(payload: {
  name: string
  address: string
  email: string | null
}): Promise<{ id: number | null; error?: string }> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return { id: null, error: 'DOLIBARR_API_URL non configuré' }

  // Cherche d'abord si un tiers avec ce nom existe déjà (évite les doublons)
  try {
    const safeQ = payload.name.replace(/'/g, '').replace(/[\\;]/g, '')
    const filter = encodeURIComponent(`(t.nom:like:'${safeQ}')`)
    const existing = JSON.parse(await dolibarrGet(`${apiUrl}/thirdparties?sqlfilters=${filter}&limit=1`))
    if (Array.isArray(existing) && existing.length > 0 && existing[0].id) {
      console.log('[Dolibarr] createTiers — tiers existant trouvé, id:', existing[0].id)
      return { id: Number(existing[0].id) }
    }
  } catch {
    // Pas bloquant, on tente quand même la création
  }

  const body = JSON.stringify({
    name: payload.name,
    address: payload.address || '',
    email: payload.email || '',
    client: 1,
    fournisseur: 0,
    status: 1,
  })

  return new Promise((resolve) => {
    const urlObj = new URL(`${apiUrl}/thirdparties`)
    const lib = urlObj.protocol === 'https:' ? https : http
    const req = lib.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          DOLAPIKEY: process.env.DOLIBARR_API_KEY!,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            const id = typeof json === 'number' ? json : (Number(json?.id) || 0)
            if (id > 0) {
              resolve({ id })
            } else {
              const msg = json?.error?.message ?? json?.message ?? JSON.stringify(json)
              resolve({ id: null, error: `Dolibarr ${res.statusCode}: ${msg}` })
            }
          } catch {
            resolve({ id: null, error: `Réponse non-JSON (${res.statusCode}): ${data.slice(0, 200)}` })
          }
        })
      }
    )
    req.on('error', (e) => { console.error('[Dolibarr] createTiers network error:', e); resolve({ id: null, error: String(e) }) })
    req.setTimeout(8000, () => { req.destroy(); resolve({ id: null, error: 'Timeout Dolibarr' }) })
    req.write(body)
    req.end()
  })
}

export async function getUpcomingEvents(limit = 15): Promise<DolibarrEvent[]> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return []

  const now = Math.floor(Date.now() / 1000)
  const filter = encodeURIComponent(`(t.datep:>=:${now}) AND (t.percentage:=:0)`)
  const url = `${apiUrl}/agendaevents?sqlfilters=${filter}&sortfield=t.datep&sortorder=ASC&limit=${limit}`

  try {
    const raw = JSON.parse(await dolibarrGet(url))
    if (!Array.isArray(raw)) return []
    return raw.map(e => ({
      id: Number(e.id),
      label: e.label ?? '',
      datep: Number(e.datep),
      socid: e.socid ? Number(e.socid) : null,
      socsocialnom: e.socsocialnom ?? e.thirdparty_name ?? '',
      note: e.note ?? '',
      percentage: Number(e.percentage ?? 0),
    }))
  } catch (err) {
    console.error('[Dolibarr] getUpcomingEvents error:', err)
    return []
  }
}

export async function createActionCRM(payload: {
  label: string
  datep: number
  datef: number
  socid: number
  note: string
  percentage?: number
}): Promise<number | null> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return null

  const body = JSON.stringify({
    label: payload.label,
    type_code: 'AC_OTH_AUTO',
    datep: payload.datep,
    datef: payload.datef,
    socid: payload.socid,
    userownerid: Number(process.env.DOLIBARR_USER_OWNER_ID ?? 1),
    note: payload.note,
    percentage: payload.percentage ?? 100,
  })

  return new Promise((resolve) => {
    const urlObj = new URL(`${apiUrl}/agendaevents`)
    const lib = urlObj.protocol === 'https:' ? https : http
    const req = lib.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          DOLAPIKEY: process.env.DOLIBARR_API_KEY!,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            resolve(typeof json === 'number' ? json : Number(json.id) || null)
          } catch {
            resolve(null)
          }
        })
      }
    )
    req.on('error', (e) => {
      console.error('[Dolibarr] createActionCRM error:', e)
      resolve(null)
    })
    req.setTimeout(8000, () => { req.destroy(); resolve(null) })
    req.write(body)
    req.end()
  })
}
