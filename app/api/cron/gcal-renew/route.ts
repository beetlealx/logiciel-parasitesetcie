import { type NextRequest, NextResponse } from 'next/server'
import { registerWebhook } from '@/lib/google-calendar'

// Renouvelle le canal webhook Google Calendar (expire ~7 jours)
// Appelé chaque dimanche à 8h via Vercel Cron
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const host = request.headers.get('host') ?? ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${host}`

  const result = await registerWebhook(appUrl)
  if (!result) {
    return NextResponse.json({ error: 'Échec renouvellement' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result })
}
