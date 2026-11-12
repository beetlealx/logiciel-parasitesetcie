import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { ingererDevis, signalerDevisRetire } from '@/lib/ingest-devis'

export const runtime = 'nodejs'

// Appelé par le module Webhook de Dolibarr (Accueil → Configuration → Modules → Webhook).
// URL à déclarer : https://<app>/api/dolibarr/webhook?token=<DOLIBARR_WEBHOOK_SECRET>
// Déclencheurs à cocher : PROPAL_CLOSE_SIGNED (obligatoire), PROPAL_CLOSE_REFUSED et
// PROPAL_REOPEN (recommandés). Message reçu : { "triggercode": "...", "object": { ...devis } }

function tokenOk(request: NextRequest): boolean {
  const expected = process.env.DOLIBARR_WEBHOOK_SECRET
  if (!expected) return false
  const given = request.nextUrl.searchParams.get('token') ?? request.headers.get('x-webhook-token') ?? ''
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  if (!tokenOk(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let body: { triggercode?: string; trigger_code?: string; object?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const trigger = String(body.triggercode ?? body.trigger_code ?? '').toUpperCase()
  const obj = body.object ?? {}
  const id = Number(obj.id ?? obj.rowid) || undefined
  const ref = typeof obj.ref === 'string' && obj.ref ? obj.ref : undefined
  if (!id && !ref) return NextResponse.json({ error: 'Devis non identifié' }, { status: 400 })

  switch (trigger) {
    case 'PROPAL_CLOSE_SIGNED': {
      // On relit le devis par l'API : on ne fait jamais confiance au contenu du message.
      const result = await ingererDevis({ id, ref }, 'webhook')
      const status = result.status === 'erreur' ? 502 : 200
      return NextResponse.json(result, { status })
    }
    case 'PROPAL_CLOSE_REFUSED':
    case 'PROPAL_REOPEN':
    case 'PROPAL_DELETE':
      await signalerDevisRetire(
        { id, ref },
        `Devis ${ref ?? id} : ${trigger === 'PROPAL_DELETE' ? 'supprimé' : trigger === 'PROPAL_REOPEN' ? 'réouvert' : 'passé à « non signé »'} dans Dolibarr — vérifier les passages`,
        'webhook',
      )
      return NextResponse.json({ status: 'alerte' })
    default:
      return NextResponse.json({ status: 'ignore', trigger })
  }
}
