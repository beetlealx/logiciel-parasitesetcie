import { type NextRequest, NextResponse } from 'next/server'
import { syncFromGoogle } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-goog-channel-token')

  if (!process.env.GOOGLE_WEBHOOK_TOKEN || token !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const resourceState = request.headers.get('x-goog-resource-state')

  // 'sync' = ping initial de vérification, on acquitte juste
  if (resourceState === 'sync') {
    return new NextResponse('OK', { status: 200 })
  }

  // 'exists' = quelque chose a changé dans le calendrier
  if (resourceState === 'exists' || resourceState === 'not_exists') {
    await syncFromGoogle()
  }

  return new NextResponse('OK', { status: 200 })
}
