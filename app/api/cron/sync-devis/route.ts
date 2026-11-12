import { NextResponse, type NextRequest } from 'next/server'
import { synchroniserRecents } from '@/lib/ingest'

export const runtime = 'nodejs'
export const maxDuration = 60

// Vérification de rattrapage : importe les devis signés que le webhook aurait manqués.
// Lancée par Vercel Cron (voir vercel.json), qui envoie « Authorization: Bearer <CRON_SECRET> ».
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const results = await synchroniserRecents('cron')
  return NextResponse.json({
    crees: results.filter(r => r.status === 'cree').length,
    erreurs: results.filter(r => r.status === 'erreur').length,
    details: results,
  })
}
