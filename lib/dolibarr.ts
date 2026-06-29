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

function dolibarrPost(url: string, body: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const lib = urlObj.protocol === 'https:' ? https : http
    const bodyStr = JSON.stringify(body)
    const req = lib.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          DOLAPIKEY: process.env.DOLIBARR_API_KEY!,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve(data))
      }
    )
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Dolibarr timeout')) })
    req.write(bodyStr)
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

async function fetchTiersNames(socids: number[], apiUrl: string): Promise<Record<number, string>> {
  const unique = [...new Set(socids)].filter(id => id > 0)
  if (unique.length === 0) return {}
  const entries = await Promise.all(
    unique.map(async id => {
      try {
        const data = JSON.parse(await dolibarrGet(`${apiUrl}/thirdparties/${id}`))
        return [id, data?.name ?? ''] as [number, string]
      } catch {
        return [id, ''] as [number, string]
      }
    })
  )
  return Object.fromEntries(entries)
}

export interface DolibarrFacture {
  id: number
  ref: string
  date: number
  total_ttc: number
  statut: number
  socid: number
  nom_client: string
}

export async function getFactures(options?: { tiersId?: number; limit?: number }): Promise<{ items: DolibarrFacture[]; error?: string }> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return { items: [], error: 'DOLIBARR_API_URL non configuré' }

  let url = `${apiUrl}/invoices?sortfield=t.datef&sortorder=DESC&limit=${options?.limit ?? 200}`
  if (options?.tiersId) url += `&thirdparty_ids=${options.tiersId}`

  try {
    const raw = JSON.parse(await dolibarrGet(url))
    if (!Array.isArray(raw)) {
      const msg = raw?.error?.message ?? raw?.message ?? JSON.stringify(raw).slice(0, 300)
      console.error('[Dolibarr] getFactures non-array:', msg)
      return { items: [], error: `Dolibarr: ${msg}` }
    }
    const socids = raw.map((f: { socid?: unknown }) => Number(f.socid ?? 0))
    const tiersNames = await fetchTiersNames(socids, apiUrl)
    return {
      items: raw.map(f => {
        const socid = Number(f.socid ?? 0)
        return {
          id: Number(f.id),
          ref: f.ref ?? '',
          date: Number(f.datef ?? f.date ?? 0),
          total_ttc: Number(f.total_ttc ?? 0),
          statut: Number(f.statut ?? 0),
          socid,
          nom_client: tiersNames[socid] ?? f.socnom ?? f.thirdparty?.name ?? '',
        }
      }),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Dolibarr] getFactures error:', msg)
    return { items: [], error: msg }
  }
}

export interface DolibarrDevis {
  id: number
  ref: string
  date: number
  total_ttc: number
  statut: number
  socid: number
  nom_client: string
}

export async function getDevis(options?: { tiersId?: number; limit?: number }): Promise<{ items: DolibarrDevis[]; error?: string }> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return { items: [], error: 'DOLIBARR_API_URL non configuré' }

  let url = `${apiUrl}/proposals?sortfield=t.datep&sortorder=DESC&limit=${options?.limit ?? 200}`
  if (options?.tiersId) url += `&thirdparty_ids=${options.tiersId}`

  try {
    const raw = JSON.parse(await dolibarrGet(url))
    if (!Array.isArray(raw)) {
      const msg = raw?.error?.message ?? raw?.message ?? JSON.stringify(raw).slice(0, 300)
      console.error('[Dolibarr] getDevis non-array:', msg)
      return { items: [], error: `Dolibarr: ${msg}` }
    }
    const socids = raw.map((d: { socid?: unknown }) => Number(d.socid ?? 0))
    const tiersNames = await fetchTiersNames(socids, apiUrl)
    return {
      items: raw.map(d => {
        const socid = Number(d.socid ?? 0)
        return {
          id: Number(d.id),
          ref: d.ref ?? '',
          date: Number(d.datep ?? d.date_creation ?? d.date ?? 0),
          total_ttc: Number(d.total_ttc ?? 0),
          statut: Number(d.statut ?? 0),
          socid,
          nom_client: tiersNames[socid] ?? d.socnom ?? d.thirdparty?.name ?? '',
        }
      }),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Dolibarr] getDevis error:', msg)
    return { items: [], error: msg }
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

// ─── Produits ────────────────────────────────────────────────────────────────

export interface DolibarrProduct {
  id: number
  ref: string
  label: string
  price: number      // HT
  price_ttc: number
  tva_tx: number
}

export async function getDolibarrProducts(): Promise<DolibarrProduct[]> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return []
  try {
    const raw = JSON.parse(await dolibarrGet(`${apiUrl}/products?limit=500&sortfield=t.label&sortorder=ASC&type=0`))
    if (!Array.isArray(raw)) return []
    return raw.map(p => ({
      id: Number(p.id),
      ref: p.ref ?? '',
      label: p.label ?? p.ref ?? '',
      price: Number(p.price ?? 0),
      price_ttc: Number(p.price_ttc ?? 0),
      tva_tx: Number(p.tva_tx ?? 20),
    }))
  } catch (err) {
    console.error('[Dolibarr] getDolibarrProducts error:', err)
    return []
  }
}

export interface DevisItem {
  id: number
  ref: string
  date: number
  total_ttc: number
  statut: number
}

export async function getProposalsByTiers(tiersId: number): Promise<DevisItem[]> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return []
  try {
    const raw = JSON.parse(await dolibarrGet(
      `${apiUrl}/proposals?thirdparty_ids=${tiersId}&sortfield=t.datep&sortorder=DESC&limit=50`
    ))
    if (!Array.isArray(raw)) return []
    return raw.map(d => ({
      id: Number(d.id),
      ref: d.ref ?? '',
      date: Number(d.datep ?? d.date_creation ?? d.date ?? 0),
      total_ttc: Number(d.total_ttc ?? 0),
      statut: Number(d.statut ?? 0),
    }))
  } catch (err) {
    console.error('[Dolibarr] getProposalsByTiers error:', err)
    return []
  }
}

export async function getProposalLines(id: number): Promise<DocLine[]> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return []
  try {
    const raw = JSON.parse(await dolibarrGet(`${apiUrl}/proposals/${id}`))
    const lines: unknown[] = Array.isArray(raw?.lines) ? raw.lines : []
    return lines.map((lu: unknown) => { const l = lu as Record<string, unknown>; return {
      fk_product: l.fk_product ? Number(l.fk_product) : null,
      desc: String(l.desc ?? l.description ?? ''),
      qty: Number(l.qty ?? 1),
      subprice: Number(l.subprice ?? l.price ?? 0),
      tva_tx: Number(l.tva_tx ?? 20),
    } })
  } catch (err) {
    console.error('[Dolibarr] getProposalLines error:', err)
    return []
  }
}

// ─── Création devis / facture ─────────────────────────────────────────────────

export interface DocLine {
  fk_product: number | null
  desc: string
  qty: number
  subprice: number
  tva_tx: number
}

async function createDolibarrDoc(
  endpoint: string,
  socid: number,
  date: number,
  lines: DocLine[]
): Promise<{ id: number; ref: string } | { error: string }> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return { error: 'DOLIBARR_API_URL non configuré' }
  try {
    const raw = await dolibarrPost(`${apiUrl}/${endpoint}`, { socid, date, lines })
    const json = JSON.parse(raw)
    const id = typeof json === 'number' ? json : Number(json?.id ?? 0)
    if (id > 0) {
      const detail = JSON.parse(await dolibarrGet(`${apiUrl}/${endpoint}/${id}`))
      return { id, ref: detail?.ref ?? String(id) }
    }
    const msg = json?.error?.message ?? json?.message ?? JSON.stringify(json).slice(0, 200)
    return { error: `Dolibarr: ${msg}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

function dolibarrDelete(url: string): Promise<void> {
  return new Promise((resolve) => {
    const urlObj = new URL(url)
    const lib = urlObj.protocol === 'https:' ? https : http
    const req = lib.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'DELETE',
        headers: { DOLAPIKEY: process.env.DOLIBARR_API_KEY! },
        rejectUnauthorized: false,
      },
      res => { res.resume(); res.on('end', resolve) }
    )
    req.on('error', () => resolve())
    req.setTimeout(8000, () => { req.destroy(); resolve() })
    req.end()
  })
}

export async function saveDolibarrProposal(
  oldId: number | null,
  socid: number,
  date: number,
  lines: DocLine[]
): Promise<{ id: number; ref: string } | { error: string }> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return { error: 'DOLIBARR_API_URL non configuré' }
  if (oldId) {
    // Set back to draft first in case it was validated (Dolibarr refuses to delete a validated proposal)
    try { await dolibarrPost(`${apiUrl}/proposals/${oldId}/setdraft`, { notrigger: 0 }) } catch {}
    await dolibarrDelete(`${apiUrl}/proposals/${oldId}`)
  }
  return createDolibarrDoc('proposals', socid, date, lines)
}

export function createDolibarrInvoice(socid: number, date: number, lines: DocLine[]) {
  return createDolibarrDoc('invoices', socid, date, lines)
}

export async function validateProposal(id: number): Promise<{ ok: boolean; error?: string }> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return { ok: false, error: 'DOLIBARR_API_URL non configuré' }
  try {
    const raw = await dolibarrPost(`${apiUrl}/proposals/${id}/validate`, { notrigger: 0 })
    const json = JSON.parse(raw)
    if (json === 1 || (typeof json === 'number' && json > 0) || json?.id) return { ok: true }
    const msg = json?.error?.message ?? json?.message ?? JSON.stringify(json).slice(0, 200)
    return { ok: false, error: `Dolibarr: ${msg}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function downloadProposalPdf(id: number, ref: string): Promise<Buffer | null> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return null
  try {
    // Génère le PDF si pas encore présent
    await dolibarrPost(`${apiUrl}/documents/builddoc`, {
      modulepart: 'propal',
      original_file: `${ref}/${ref}.pdf`,
      langcode: 'fr_FR',
    })
  } catch {}
  try {
    const url = `${apiUrl}/documents/download?modulepart=propal&original_file=${encodeURIComponent(`${ref}/${ref}.pdf`)}`
    const raw = JSON.parse(await dolibarrGet(url))
    if (raw?.content) return Buffer.from(raw.content, 'base64')
    return null
  } catch (err) {
    console.error('[Dolibarr] downloadProposalPdf error:', err)
    return null
  }
}

// ─── Contrats ─────────────────────────────────────────────────────────────────

export interface DolibarrContrat {
  id: number
  ref: string
  date_start: number | null
  date_end: number | null
  statut: number
  socid: number
  nom_client: string
}

export async function getContractsByTiers(tiersId: number): Promise<DolibarrContrat[]> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return []
  try {
    const raw = JSON.parse(await dolibarrGet(
      `${apiUrl}/contracts?thirdparty_ids=${tiersId}&sortfield=t.ref&sortorder=DESC&limit=50`
    ))
    if (!Array.isArray(raw)) return []
    return raw.map(c => ({
      id: Number(c.id),
      ref: c.ref ?? '',
      date_start: c.date_start ? Number(c.date_start) : null,
      date_end: c.date_end ? Number(c.date_end) : null,
      statut: Number(c.statut ?? 0),
      socid: Number(c.socid ?? 0),
      nom_client: c.socnom ?? c.thirdparty?.name ?? '',
    }))
  } catch (err) {
    console.error('[Dolibarr] getContractsByTiers error:', err)
    return []
  }
}

export async function sendProposalByEmail(
  id: number,
  email: string,
  subject: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const apiUrl = process.env.DOLIBARR_API_URL
  if (!apiUrl) return { ok: false, error: 'DOLIBARR_API_URL non configuré' }
  try {
    const raw = await dolibarrPost(`${apiUrl}/proposals/${id}/sendByEmail`, {
      sendto: email,
      sendtocc: '', sendtobcc: '', replyto: '',
      subject, message,
      filename: '', sendcontext: 'propal',
    })
    const json = JSON.parse(raw)
    if (json === 1 || json === true || json?.success) return { ok: true }
    const msg = json?.error?.message ?? json?.message ?? JSON.stringify(json).slice(0, 200)
    return { ok: false, error: `Dolibarr: ${msg}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
