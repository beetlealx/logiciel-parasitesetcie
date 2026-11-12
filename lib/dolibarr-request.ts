import https from 'node:https'
import http from 'node:http'

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
