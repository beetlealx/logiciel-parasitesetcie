import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { envoyerProtocole, joursAvant, PROTOCOLES } from '@/lib/protocoles'

export const runtime = 'nodejs'
export const maxDuration = 60

// Chaque matin : envoie la fiche de préparation aux clients dont l'intervention
// a lieu dans 1 à N jours (PROTOCOLE_JOURS_AVANT, 3 par défaut) et qui ne l'ont pas encore reçue.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }))
  const from = new Date(today); from.setUTCDate(from.getUTCDate() + 1)
  const to = new Date(today); to.setUTCDate(to.getUTCDate() + joursAvant() + 1)

  const { data: ivs } = await admin
    .from('interventions')
    .select('id')
    .eq('status', 'draft')
    .is('protocole_envoye_at', null)
    .not('client_email', 'is', null)
    .in('intervention_type', Object.keys(PROTOCOLES))
    .gte('intervention_date', from.toISOString())
    .lt('intervention_date', to.toISOString())
    .limit(100)

  const results = []
  for (const iv of ivs ?? []) {
    results.push({ id: iv.id, ...(await envoyerProtocole(admin, iv.id)) })
  }
  return NextResponse.json({
    envoyes: results.filter(r => r.ok).length,
    erreurs: results.filter(r => !r.ok),
  })
}
