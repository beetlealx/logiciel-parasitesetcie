import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import fs from 'fs'
import path from 'path'
import { createAdminClient } from '@/lib/supabase/admin'
import { InterventionPDF, type PDFPhoto, type PDFHistoryEntry, type PDFSeverity, type PDFArticle } from '@/components/intervention/pdf-document'

function computeSeverity(articles: { releves: Record<string, unknown> }[], interventionType?: string | null): PDFSeverity {
  if (articles.length === 0) return 'non-releve'
  switch (interventionType) {
    case 'rats':
      if (articles.some(a => a.releves.consommation === 'Totale' || a.releves.traces === 'Rongeurs')) return 'forte'
      if (articles.some(a => a.releves.consommation === 'Partielle' || a.releves.traces === 'Déjections')) return 'moderee'
      return 'inactive'
    case 'frelons_guepes':
      if (articles.some(a => a.releves.neutralise === false || a.releves.neutralise === 'false')) return 'forte'
      return 'moderee'
    case 'punaises_lit':
    case 'cafards': {
      const levels = articles.map(a => String(a.releves.infestation ?? '').toLowerCase())
      if (levels.some(l => l.includes('élevée') || l.includes('elevee') || l.includes('forte') || l.includes('haut'))) return 'forte'
      if (levels.some(l => l.includes('modérée') || l.includes('moderee') || l.includes('moyen'))) return 'moderee'
      return 'moderee'
    }
    default:
      return 'moderee'
  }
}
import { compositePlan } from '@/lib/composite-plan'
import type { SupabaseClient } from '@supabase/supabase-js'

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

function loadLogo(): string | null {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'logo.png'))
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export async function generateInterventionPDF(
  interventionId: string,
  supabase: SupabaseClient,
  userId: string
): Promise<{ buffer: Buffer; reference: string } | null> {
  const [{ data: intervention }, { data: articles }, { data: photos }] = await Promise.all([
    supabase
      .from('interventions')
      .select('reference, intervention_date, technician_name, type_intervention, intervention_type, extra_data, client_name, client_address, client_email, synthese, biocides, signataire_nom, signature_data_url, plan_image_path, dolibarr_tiers_id')
      .eq('id', interventionId)
      .single(),
    supabase
      .from('articles')
      .select('label, x, y, releves, ordre')
      .eq('intervention_id', interventionId)
      .order('ordre'),
    supabase
      .from('photos')
      .select('storage_path, caption')
      .eq('intervention_id', interventionId)
      .order('created_at'),
  ])

  if (!intervention) return null

  // Historique des visites précédentes pour ce site
  let history: PDFHistoryEntry[] = []
  if (intervention.dolibarr_tiers_id) {
    const { data: histRows } = await supabase
      .from('interventions')
      .select('id, reference, intervention_date, intervention_type')
      .eq('dolibarr_tiers_id', intervention.dolibarr_tiers_id)
      .neq('id', interventionId)
      .in('status', ['signed', 'sent'])
      .order('intervention_date', { ascending: false })
      .limit(6)

    const histIds = (histRows ?? []).map(h => h.id)
    const admin = createAdminClient()
    const { data: histArticles } = histIds.length > 0
      ? await admin.from('articles').select('intervention_id, releves').in('intervention_id', histIds)
      : { data: [] }

    const artByHist = (histArticles ?? []).reduce<Record<string, { releves: Record<string, unknown> }[]>>(
      (acc, a) => {
        const key = a.intervention_id as string
        if (!acc[key]) acc[key] = []
        acc[key].push({ releves: (a.releves ?? {}) as Record<string, unknown> })
        return acc
      },
      {}
    )

    history = (histRows ?? []).map(h => ({
      reference: h.reference,
      intervention_date: h.intervention_date,
      intervention_type: h.intervention_type ?? null,
      severity: computeSeverity(artByHist[h.id] ?? [], h.intervention_type),
    }))
  }

  const admin = createAdminClient()

  const [planSigned, ...photoSigned] = await Promise.all([
    intervention.plan_image_path
      ? admin.storage.from('plans').createSignedUrl(intervention.plan_image_path, 300)
      : Promise.resolve({ data: null }),
    ...(photos ?? []).map(p =>
      admin.storage.from('photos').createSignedUrl(p.storage_path, 300)
    ),
  ])

  const planArticles = (articles ?? []).map((p: { label: string; x: number; y: number }) => ({ label: p.label, x: Number(p.x), y: Number(p.y) }))
  const [planBase64, ...photoBase64s] = await Promise.all([
    planSigned.data?.signedUrl
      ? compositePlan(planSigned.data.signedUrl, planArticles)
      : Promise.resolve(null),
    ...(photos ?? []).map((_, i) =>
      photoSigned[i]?.data?.signedUrl ? toBase64(photoSigned[i].data!.signedUrl) : Promise.resolve(null)
    ),
  ])

  const pdfPhotos: PDFPhoto[] = (photos ?? [])
    .map((p, i) => ({ base64: photoBase64s[i] ?? '', caption: p.caption }))
    .filter(p => p.base64)

  const element = React.createElement(InterventionPDF, {
    ...intervention,
    postes: (articles ?? []).map((a: { label: string; releves: Record<string, unknown> | null }) => ({ label: a.label, releves: a.releves ?? {} })) as PDFArticle[],
    planBase64: planBase64 ?? null,
    photos: pdfPhotos,
    logoBase64: loadLogo(),
    history,
  }) as React.ReactElement

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)
  return { buffer: Buffer.from(buffer), reference: intervention.reference }
}
