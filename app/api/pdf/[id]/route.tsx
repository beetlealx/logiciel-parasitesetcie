import { NextResponse, type NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import fs from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InterventionPDF, type PDFPhoto, type PDFHistoryEntry, type PDFSeverity } from '@/components/intervention/pdf-document'
import { compositePlan } from '@/lib/composite-plan'

function computeSeverity(postes: { consommation: string | null; traces: string | null }[]): PDFSeverity {
  if (postes.length === 0) return 'non-releve'
  if (postes.some(p => p.consommation === 'Totale' || p.traces === 'Rongeurs')) return 'forte'
  if (postes.some(p => p.consommation === 'Partielle' || p.traces === 'Déjections')) return 'moderee'
  return 'inactive'
}

export const runtime = 'nodejs'

async function toBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const mime = res.headers.get('content-type') ?? 'image/jpeg'
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
  } catch {
    return null
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const [{ data: intervention }, { data: postes }, { data: photos }] = await Promise.all([
    supabase
      .from('interventions')
      .select('reference, intervention_date, technician_name, type_intervention, client_name, client_address, client_email, synthese, biocides, signataire_nom, signature_data_url, plan_image_path, dolibarr_tiers_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('postes')
      .select('label, x, y, etat, consommation, traces, action, ordre')
      .eq('intervention_id', id)
      .order('ordre'),
    supabase
      .from('photos')
      .select('storage_path, caption')
      .eq('intervention_id', id)
      .order('created_at'),
  ])

  if (!intervention) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  // Historique des visites précédentes pour ce site
  let history: PDFHistoryEntry[] = []
  if (intervention.dolibarr_tiers_id) {
    const { data: histRows } = await supabase
      .from('interventions')
      .select('reference, intervention_date, type_intervention, postes(consommation, traces)')
      .eq('dolibarr_tiers_id', intervention.dolibarr_tiers_id)
      .eq('user_id', user.id)
      .neq('id', id)
      .in('status', ['signed', 'sent'])
      .order('intervention_date', { ascending: false })
      .limit(6)

    history = (histRows ?? []).map(h => ({
      reference: h.reference,
      intervention_date: h.intervention_date,
      type_intervention: h.type_intervention,
      severity: computeSeverity(
        (h.postes as { consommation: string | null; traces: string | null }[]) ?? []
      ),
    }))
  }

  const admin = createAdminClient()

  // Signed URLs for images
  const [planSigned, ...photoSigned] = await Promise.all([
    intervention.plan_image_path
      ? admin.storage.from('plans').createSignedUrl(intervention.plan_image_path, 300)
      : Promise.resolve({ data: null }),
    ...(photos ?? []).map(p =>
      admin.storage.from('photos').createSignedUrl(p.storage_path, 300)
    ),
  ])

  // Fetch all images as base64 in parallel
  // Plan: composite poste markers (x/y%) onto the resized image server-side
  const planPostes = (postes ?? []).map(p => ({ label: p.label, x: Number(p.x), y: Number(p.y) }))
  const [planBase64, ...photoBase64s] = await Promise.all([
    planSigned.data?.signedUrl
      ? compositePlan(planSigned.data.signedUrl, planPostes)
      : Promise.resolve(null),
    ...(photos ?? []).map((_, i) =>
      photoSigned[i]?.data?.signedUrl ? toBase64(photoSigned[i].data!.signedUrl) : Promise.resolve(null)
    ),
  ])

  const pdfPhotos: PDFPhoto[] = (photos ?? [])
    .map((p, i) => ({ base64: photoBase64s[i] ?? '', caption: p.caption }))
    .filter(p => p.base64)

  let logoBase64: string | null = null
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const logoBuffer = fs.readFileSync(logoPath)
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
  } catch {
    // Logo not found — header renders without it
  }

  const element = React.createElement(InterventionPDF, {
    ...intervention,
    postes: postes ?? [],
    planBase64: planBase64 ?? null,
    photos: pdfPhotos,
    logoBase64,
    history,
  }) as React.ReactElement

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${intervention.reference}.pdf"`,
    },
  })
}
