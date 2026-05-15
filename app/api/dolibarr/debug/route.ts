import { NextResponse } from 'next/server'
import https from 'node:https'

function fetchDolibarr(url: string, apiKey: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { DOLAPIKEY: apiKey }, rejectUnauthorized: false }, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: body.slice(0, 600) }))
    })
    req.on('error', (e) => resolve({ status: 0, body: String(e) }))
    req.setTimeout(8000, () => { req.destroy(); resolve({ status: 0, body: 'timeout' }) })
  })
}

export async function GET() {
  const apiUrl = process.env.DOLIBARR_API_URL ?? ''
  const apiKey = process.env.DOLIBARR_API_KEY ?? ''

  const [t1, t2] = await Promise.all([
    fetchDolibarr(`${apiUrl}/thirdparties?limit=3`, apiKey),
    fetchDolibarr(
      `${apiUrl}/thirdparties?sqlfilters=${encodeURIComponent("(t.nom:like:'%a%')")}&limit=3`,
      apiKey
    ),
  ])

  return NextResponse.json({
    env: { apiUrl, hasKey: !!apiKey },
    test1_sans_filtre: t1,
    test2_filtre_encode: t2,
  })
}
