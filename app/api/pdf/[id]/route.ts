import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInterventionPDF } from '@/lib/generate-pdf'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const pdf = await generateInterventionPDF(id, supabase)
  if (!pdf) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  return new NextResponse(new Uint8Array(pdf.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${pdf.reference}.pdf"`,
    },
  })
}
