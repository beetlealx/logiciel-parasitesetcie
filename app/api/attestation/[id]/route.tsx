import { NextResponse, type NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import fs from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { AttestationPDF, type AttestationData } from '@/components/intervention/attestation-pdf'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: intervention } = await supabase
    .from('interventions')
    .select('reference, intervention_date, technician_name, type_intervention, client_name, client_address, biocides, status')
    .eq('id', id)
    .single()

  if (!intervention) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (intervention.status === 'draft') return NextResponse.json({ error: 'Intervention non finalisée' }, { status: 400 })

  let logoBase64: string | null = null
  try {
    const logoBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'logo.png'))
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
  } catch { /* no logo */ }

  const data: AttestationData = {
    reference: intervention.reference,
    intervention_date: intervention.intervention_date,
    technician_name: intervention.technician_name,
    type_intervention: intervention.type_intervention,
    client_name: intervention.client_name,
    client_address: intervention.client_address,
    logoBase64,
    biocides: (intervention.biocides ?? []) as AttestationData['biocides'],
  }

  const element = React.createElement(AttestationPDF, { data }) as React.ReactElement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="attestation-${intervention.reference}.pdf"`,
    },
  })
}
