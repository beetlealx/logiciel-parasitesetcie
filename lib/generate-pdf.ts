import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import fs from 'fs'
import path from 'path'
import { createAdminClient } from '@/lib/supabase/admin'
import { InterventionPDF, type PDFPhoto, type PDFHistoryEntry, type PDFSeverity, type PDFZone } from '@/components/intervention/pdf-document'

function computeSeverity(postes: { consommation: string | null; traces: string | null }[]): PDFSeverity {
  if (postes.length === 0) return 'non-releve'
  if (postes.some(p => p.consommation === 'Totale' || p.traces === 'Rongeurs')) return 'forte'
  if (postes.some(p => p.consommation === 'Partielle' || p.traces === 'Déjections')) return 'moderee'
  return 'inactive'
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
): Promise<{ buffer: Buffer; reference: string; dossierRef: string | null } | null> {
  const [{ data: intervention }, { data: postes }, { data: allPhotos }, { data: zones }] = await Promise.all([
    supabase
      .from('interventions')
      .select('reference, intervention_date, technician_name, technician_id, type_intervention, client_name, client_address, client_email, synthese, biocides, signataire_nom, signature_data_url, plan_image_path, dolibarr_tiers_id, dossiers(dolibarr_propal_ref, ref_client)')
      .eq('id', interventionId)
      .single(),
    supabase
      .from('postes')
      .select('label, x, y, etat, consommation, traces, action, ordre')
      .eq('intervention_id', interventionId)
      .order('ordre'),
    supabase
      .from('photos')
      .select('storage_path, caption, zone_id, phase')
      .eq('intervention_id', interventionId)
      .order('created_at'),
    supabase
      .from('zones')
      .select('id, label, niveau, traitement, constat, ordre')
      .eq('intervention_id', interventionId)
      .order('ordre'),
  ])

  if (!intervention) return null

  const photos = (allPhotos ?? []).filter(p => !p.zone_id)
  const zonePhotos = (allPhotos ?? []).filter(p => !!p.zone_id)
  const dossier = intervention.dossiers as unknown as { dolibarr_propal_ref: string; ref_client: string | null } | null

  let certibiocide: string | null = null
  if (intervention.technician_id) {
    const { data: tech } = await supabase.from('profiles').select('certibiocide').eq('id', intervention.technician_id).maybeSingle()
    certibiocide = tech?.certibiocide ?? null
  }

  // Historique des visites précédentes pour ce site
  let history: PDFHistoryEntry[] = []
  if (intervention.dolibarr_tiers_id) {
    const { data: histRows } = await supabase
      .from('interventions')
      .select('reference, intervention_date, type_intervention, postes(consommation, traces)')
      .eq('dolibarr_tiers_id', intervention.dolibarr_tiers_id)
      .neq('id', interventionId)
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

  const [planSigned, ...photoSigned] = await Promise.all([
    intervention.plan_image_path
      ? admin.storage.from('plans').createSignedUrl(intervention.plan_image_path, 300)
      : Promise.resolve({ data: null }),
    ...photos.map(p =>
      admin.storage.from('photos').createSignedUrl(p.storage_path, 300)
    ),
  ])

  // Photos des zones (avant / après)
  const zoneBase64 = await Promise.all(
    zonePhotos.map(async p => {
      const { data } = await admin.storage.from('photos').createSignedUrl(p.storage_path, 300)
      return data?.signedUrl ? toBase64(data.signedUrl) : null
    }),
  )
  const pdfZones: PDFZone[] = (zones ?? []).map(z => {
    const of = (phase: 'avant' | 'apres') =>
      zonePhotos
        .map((p, i) => ({ p, b: zoneBase64[i] }))
        .filter(({ p, b }) => p.zone_id === z.id && (phase === 'apres' ? p.phase === 'apres' : p.phase !== 'apres') && b)
        .map(({ b }) => b as string)
    return { label: z.label, niveau: z.niveau, traitement: z.traitement, constat: z.constat, avant: of('avant'), apres: of('apres') }
  })

  const planPostes = (postes ?? []).map(p => ({ label: p.label, x: Number(p.x), y: Number(p.y) }))
  const [planBase64, ...photoBase64s] = await Promise.all([
    planSigned.data?.signedUrl
      ? compositePlan(planSigned.data.signedUrl, planPostes)
      : Promise.resolve(null),
    ...photos.map((_, i) =>
      photoSigned[i]?.data?.signedUrl ? toBase64(photoSigned[i].data!.signedUrl) : Promise.resolve(null)
    ),
  ])

  const pdfPhotos: PDFPhoto[] = photos
    .map((p, i) => ({ base64: photoBase64s[i] ?? '', caption: p.caption }))
    .filter(p => p.base64)

  const element = React.createElement(InterventionPDF, {
    ...intervention,
    dossierRef: dossier?.dolibarr_propal_ref ?? null,
    refClient: dossier?.ref_client ?? null,
    certibiocide,
    zones: pdfZones,
    postes: postes ?? [],
    planBase64: planBase64 ?? null,
    photos: pdfPhotos,
    logoBase64: loadLogo(),
    history,
  }) as React.ReactElement

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)
  return { buffer: Buffer.from(buffer), reference: intervention.reference, dossierRef: dossier?.dolibarr_propal_ref ?? null }
}
