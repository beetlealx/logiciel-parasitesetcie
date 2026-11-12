import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncFromGoogle } from '@/lib/google-calendar'

// POST /api/google-calendar/force-sync
// Réinitialise le sync token et refait un scan complet de Google Calendar
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-setup-secret')

  if (!process.env.GOOGLE_WEBHOOK_TOKEN || secret !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Supprimer le sync token pour forcer un scan complet
  await createAdminClient().from('app_settings').delete().eq('key', 'gcal_sync_token')

  await syncFromGoogle()

  return NextResponse.json({ ok: true })
}
