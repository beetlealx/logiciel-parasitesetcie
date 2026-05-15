import { NextResponse, type NextRequest } from 'next/server'
import { searchTiers } from '@/lib/dolibarr'

export type { DolibarrTiers } from '@/lib/dolibarr'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const results = await searchTiers(q)
  return NextResponse.json(results)
}
