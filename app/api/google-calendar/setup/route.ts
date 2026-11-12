import { type NextRequest, NextResponse } from 'next/server'
import { registerWebhook } from '@/lib/google-calendar'

// POST /api/google-calendar/setup
// Header: x-setup-secret: <GOOGLE_WEBHOOK_TOKEN>
// Enregistre le canal webhook Google Calendar (valide ~30 jours)
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-setup-secret')

  if (!process.env.GOOGLE_WEBHOOK_TOKEN || secret !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const host = request.headers.get('host') ?? ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${host}`

  const result = await registerWebhook(appUrl)
  if (!result) {
    return NextResponse.json({ error: 'Échec enregistrement webhook' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    channelId: result.channelId,
    expiration: result.expiration,
  })
}
