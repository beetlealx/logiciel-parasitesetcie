'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ClientSearch, { type ClientData } from '@/components/interventions/client-search'
import { saveIntervention, getLastInterventionForClient, importFromPreviousIntervention, setInterventionType, reopenIntervention, type InterventionDraft, type BiocideEntry, type LastInterventionSummary, type ImportResult } from '@/app/actions/interventions'
import { sendReport } from '@/app/actions/send-report'
import { deleteIntervention } from '@/app/actions/delete-intervention'
import { createInterventionFromSite } from '@/app/actions/create-from-site'
import ScheduleNextVisit from '@/components/intervention/schedule-next-visit'
import BiocidesSection from '@/components/intervention/biocides-section'
import PlanSection from '@/components/intervention/plan-section'
import RelevesSection from '@/components/intervention/releves-section'
import PhotosSection from '@/components/intervention/photos-section'
import SyntheseSection from '@/components/intervention/synthese-section'
import SignatureSection from '@/components/intervention/signature-section'
import SharePdfButton from '@/components/intervention/share-pdf-button'
import type { ArticleRow, ReadingField } from '@/app/actions/plan'
import { bulkResetReadings, updateArticleReleves } from '@/app/actions/plan'
import { INTERVENTION_TEMPLATES, type InterventionType } from '@/lib/intervention-templates'
import EspeceSection from '@/components/intervention/espece-section'
import CreateDolibarrDoc from '@/components/intervention/create-dolibarr-doc'
import ProtocoleButton from '@/components/intervention/protocole-button'
import { PROTOCOLES, protocoleUrl } from '@/lib/protocoles-data'
import type { DolibarrProduct, DocLine } from '@/lib/dolibarr'
import ConditionsInterventionSection from '@/components/intervention/conditions-intervention-section'
import EtatInitialSection from '@/components/intervention/etat-initial-section'
import ConsignesPostSection from '@/components/intervention/consignes-post-section'
import type { PhotoRow } from '@/app/actions/photos'
import type { PhraseTemplate } from '@/app/actions/phrases'
import PiegesMoustiquesSection from '@/components/intervention/pieges-moustiques-section'
import AppatsLetauxSection from '@/components/intervention/appats-letaux-section'
import type { PiegeMoustique } from '@/app/actions/pieges-moustiques'
import type { AppatsLetal } from '@/app/actions/appats-letaux'

interface Intervention {
  id: string
  reference: string
  status: string
  dolibarr_tiers_id: number | null
  client_name: string
  client_address: string
  client_email: string | null
  intervention_date: string
  technician_name: string
  intervention_type: InterventionType
  type_intervention: string | null
  synthese: string | null
  biocides: BiocideEntry[] | null
  plan_image_path: string | null
  signature_data_url: string | null
  signataire_nom: string | null
  extra_data: Record<string, unknown> | null
  dolibarr_devis_ref: string | null
  dolibarr_devis_status: number | null
  dolibarr_facture_ref: string | null
  dolibarr_lines: unknown[] | null
  protocole_envoye_at?: string | null
}

interface Props {
  intervention: Intervention
  articles: ArticleRow[]
  planUrl: string
  photos: PhotoRow[]
  phraseTemplates: PhraseTemplate[]
  biocideProducts?: Record<string, string[]>
  biocideProductsRich?: Record<string, import('@/app/actions/biocides').BiocideProduct[]>
  dolibarrProducts?: DolibarrProduct[]
  techniciens?: string[]
  piegesMoustiques?: PiegeMoustique[]
  appatsLetaux?: AppatsLetal[]
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type SendStatus = 'idle' | 'sending' | 'sent' | 'error'
type ImportState = 'idle' | 'loading' | 'ready' | 'importing'

export default function InterventionForm({ intervention, articles: initialArticles, planUrl, photos, phraseTemplates, biocideProducts, biocideProductsRich, dolibarrProducts, techniciens: techniciensList, piegesMoustiques, appatsLetaux }: Props) {
  const router = useRouter()
  const isLocked = intervention.status !== 'draft'
  const isSigned = intervention.status === 'signed' || intervention.status === 'sent'
  const [articles, setArticles] = useState<ArticleRow[]>(initialArticles)
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [sendFeedback, setSendFeedback] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [dolibarrModal, setDolibarrModal] = useState(false)
  const [devisRef, setDevisRef] = useState(intervention.dolibarr_devis_ref)
  const [devisStatus, setDevisStatus] = useState(intervention.dolibarr_devis_status ?? 0)
  const [factureRef, setFactureRef] = useState(intervention.dolibarr_facture_ref)
  const [importState, setImportState] = useState<ImportState>('idle')
  const [lastIntervention, setLastIntervention] = useState<LastInterventionSummary | null>(null)
  const [importRevision, setImportRevision] = useState(0)
  const [currentPlanUrl, setCurrentPlanUrl] = useState(planUrl)
  const [planRevision, setPlanRevision] = useState(0)

  const TECHS = techniciensList?.length ? techniciensList : ['Alex', 'Fabrice']
  const [customTech, setCustomTech] = useState(
    () => intervention.technician_name !== '' && !TECHS.includes(intervention.technician_name)
  )

  function handleArticleReadingChange(id: string, field: ReadingField, value: string | null) {
    setArticles(ps => ps.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function handleArticleRelevesChange(id: string, releves: Record<string, unknown>) {
    setArticles(ps => ps.map(p => p.id === id ? { ...p, releves } : p))
    updateArticleReleves(id, releves)
  }

  function handleResetAll() {
    const resetReleves = { etat: 'Intact', consommation: 'Nulle', traces: 'Aucune', action: 'RAS' }
    setArticles(ps => ps.map(p => ({ ...p, releves: resetReleves })))
    bulkResetReadings(articles.map(p => p.id))
  }
  const STORAGE_KEY = `intervention-draft-${intervention.id}`

  const [form, setForm] = useState<InterventionDraft>({
    dolibarr_tiers_id: intervention.dolibarr_tiers_id,
    client_name: intervention.client_name,
    client_address: intervention.client_address,
    client_email: intervention.client_email ?? '',
    intervention_date: intervention.intervention_date.slice(0, 10),
    technician_name: intervention.technician_name,
    type_intervention: intervention.type_intervention ?? '',
    synthese: intervention.synthese ?? '',
    biocides: intervention.biocides ?? [],
    extra_data: intervention.extra_data ?? {},
  })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as Partial<InterventionDraft>
      setForm(f => ({ ...f, ...parsed }))
    } catch {}
  }, [STORAGE_KEY])

  const persist = useCallback(async (data: InterventionDraft) => {
    if (isLocked) return
    if (savingRef.current) {
      // Un save est en cours — on replanifie avec les données les plus récentes
      if (retryRef.current) clearTimeout(retryRef.current)
      retryRef.current = setTimeout(() => persist(data), 600)
      return
    }
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null }
    savingRef.current = true
    setSaveStatus('saving')
    try {
      await saveIntervention(intervention.id, data)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2500)
    } catch {
      setSaveStatus('error')
    } finally {
      savingRef.current = false
    }
  }, [intervention.id, isLocked])

  function update(patch: Partial<InterventionDraft>) {
    const next = { ...form, ...patch }
    setForm(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => persist(next), 1000)
  }

  function handleClientChange(data: ClientData) {
    update({
      dolibarr_tiers_id: data.dolibarr_tiers_id,
      client_name: data.client_name,
      client_address: data.client_address,
      client_email: data.client_email,
    })
    setLastIntervention(null)
    setImportState('idle')
    if (data.dolibarr_tiers_id) {
      setImportState('loading')
      getLastInterventionForClient(data.dolibarr_tiers_id, intervention.id).then(result => {
        if (result.data) {
          setLastIntervention(result.data)
          setImportState('ready')
        } else {
          setImportState('idle')
        }
      })
    }
  }

  async function handleTypeChange(newType: InterventionType) {
    setItypeState(newType)
    await setInterventionType(intervention.id, newType)
  }

  async function handleImportLast() {
    if (!lastIntervention) return
    setImportState('importing')
    const result = await importFromPreviousIntervention(lastIntervention.id, intervention.id)
    if (!result.ok) {
      setImportState('ready')
      toast.error(result.error ?? 'Erreur lors de l\'import')
      return
    }
    // Mettre à jour l'état directement
    if (result.articles) setArticles(result.articles as ArticleRow[])
    if (result.planSignedUrl) {
      setCurrentPlanUrl(result.planSignedUrl)
      setPlanRevision(r => r + 1)
    }
    update({
      biocides: (result.biocides ?? []) as BiocideEntry[],
      synthese: result.synthese ?? '',
      extra_data: result.extra_data ?? {},
      type_intervention: result.type_intervention ?? '',
    })
    setImportRevision(r => r + 1)
    setImportState('idle')
    toast.success(`Données importées depuis ${lastIntervention.reference}`)
  }

  async function handleSend() {
    setSendStatus('sending')
    setSendFeedback(null)
    const result = await sendReport(intervention.id)
    if (!result.ok) {
      setSendStatus('error')
      setSendFeedback(result.error)
      toast.error(result.error)
      return
    }
    setSendStatus('sent')
    const parts: string[] = []
    if (result.tiersCreated) parts.push('Client créé dans Dolibarr')
    else if (result.tiersError) parts.push(`Dolibarr: ${result.tiersError}`)
    if (result.emailSent) parts.push('Email envoyé')
    else if (result.emailError) parts.push(`Email échoué : ${result.emailError}`)
    else if (intervention.client_email) parts.push('Email non envoyé')
    else parts.push('Pas d\'email client')
    if (result.crmCreated) parts.push('CRM enregistré')
    setSendFeedback(parts.join(' · '))
    if (result.emailSent) {
      toast.success('Rapport envoyé', { description: parts.join(' · ') })
    } else {
      toast.warning('Rapport traité', { description: parts.join(' · ') })
    }
  }

  async function handleDuplicate() {
    setDuplicating(true)
    await createInterventionFromSite(intervention.id)
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteIntervention(intervention.id)
    if (result.ok) {
      router.push('/interventions')
    } else {
      setDeleting(false)
      setDeleteConfirm(false)
      toast.error(result.error ?? 'Erreur lors de la suppression')
    }
  }

  const statusBadge: Record<string, string> = {
    draft: 'Brouillon',
    signed: 'Signé',
    sent: 'Envoyé',
  }
  const statusColor: Record<string, string> = {
    draft: 'bg-[#f5f5f4] text-[#78716c]',
    signed: 'bg-blue-50 text-blue-700',
    sent: 'bg-[#d1f5ed] text-[#0a5e53]',
  }

  const [itype, setItypeState] = useState<InterventionType>(intervention.intervention_type ?? 'rats')
  const template = itype !== 'mixte' ? INTERVENTION_TEMPLATES[itype] : null
  const showPlan = template?.showPlan ?? true
  const articlesTitle = template?.articlesTitle ?? 'Postes'
  const extraData = (form.extra_data ?? {}) as Record<string, unknown>

  const ESPECES: Partial<Record<InterventionType, { label: string; img: string }[]>> = {
    fourmis: [
      { label: 'Fourmi noire', img: '/especes/fourmi-noire.jpg' },
      { label: 'Fourmi charpentière', img: '/especes/fourmi-charpentiere.jpg' },
      { label: 'Fourmi pharaon', img: '/especes/fourmi-pharaon.jpg' },
      { label: 'Fourmi odorante', img: '/especes/fourmi-odorante.jpg' },
      { label: 'Fourmi acrobate', img: '/especes/fourmi-acrobate.jpg' },
      { label: 'Autre', img: '' },
    ],
    frelons_guepes: [
      { label: 'Frelon asiatique', img: '/especes/frelon-asiatique.jpg' },
      { label: 'Frelon européen', img: '/especes/frelon-europeen.jpg' },
      { label: 'Guêpe commune', img: '/especes/guepe-commune.jpg' },
      { label: 'Guêpe germanique', img: '/especes/guepe-germanique.jpg' },
      { label: 'Poliste', img: '/especes/poliste.jpg' },
      { label: 'Autre', img: '' },
    ],
  }

  function updateExtraData(key: string, val: unknown) {
    update({ extra_data: { ...extraData, [key]: val } })
  }

  // Build ordered sections with auto-numbering
  let sn = -1
  const S = () => { sn++; return sn }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/interventions" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">
              ← Interventions
            </Link>
            {intervention.dolibarr_tiers_id && (
              <Link
                href={`/sites/${intervention.dolibarr_tiers_id}`}
                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Historique du site →
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <h1 className="text-xl font-semibold text-[#1c1917]">{intervention.reference}</h1>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor[intervention.status] ?? ''}`}>
              {statusBadge[intervention.status] ?? intervention.status}
            </span>
            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                title="Supprimer l'intervention"
                className="p-1.5 text-[#c7c3c0] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                </svg>
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-[12px]">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-600 font-medium hover:underline disabled:opacity-50"
                >
                  {deleting ? 'Suppression…' : 'Confirmer'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="text-[#a8a29e] hover:text-[#57534e]"
                >
                  Annuler
                </button>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap sm:shrink-0 sm:justify-end">
          <SaveIndicator status={saveStatus} />
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            title="Dupliquer cette intervention"
            className="flex items-center gap-1.5 border border-[#d6d3d1] text-[#57534e] text-sm px-3 py-2.5 rounded-lg font-medium hover:bg-[#f5f5f4] disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            {duplicating ? 'Duplication…' : 'Dupliquer'}
          </button>
          {isLocked && (
            <>
              <SharePdfButton
                url={`/api/pdf/${intervention.id}`}
                filename={`${intervention.reference}.pdf`}
                label="Rapport"
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                  </svg>
                }
              />
              <SharePdfButton
                url={`/api/attestation/${intervention.id}`}
                filename={`attestation-${intervention.reference}.pdf`}
                label="Attestation"
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                }
              />
              <button
                type="button"
                disabled={reopening}
                onClick={async () => {
                  setReopening(true)
                  const res = await reopenIntervention(intervention.id)
                  if (res.ok) {
                    router.refresh()
                  } else {
                    toast.error(res.error ?? 'Impossible de réouvrir')
                    setReopening(false)
                  }
                }}
                className="flex items-center gap-1.5 border border-amber-300 text-amber-700 bg-amber-50 text-sm px-3 py-2.5 rounded-lg font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors min-h-[44px]"
                title="Repasser en brouillon pour modifier"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                {reopening ? 'Réouverture…' : 'Réouvrir'}
              </button>
            </>
          )}
          {form.dolibarr_tiers_id && (
            <button
              type="button"
              onClick={() => setDolibarrModal(true)}
              className={`flex items-center gap-1.5 border text-sm px-3 py-2.5 rounded-lg font-medium transition-colors min-h-[44px] ${
                factureRef
                  ? 'border-[#0a5e53]/30 bg-[#d1f5ed] text-[#0a5e53] hover:bg-[#b8f0e2]'
                  : devisRef
                    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'border-[#d6d3d1] text-[#57534e] hover:bg-[#f5f5f4]'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              {factureRef ? `Facturé · ${factureRef}` : devisRef ? `Devis · ${devisRef}` : 'Devis / Facture'}
            </button>
          )}
          {isSigned && (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={handleSend}
                disabled={sendStatus === 'sending' || sendStatus === 'sent'}
                className="flex items-center gap-1.5 bg-primary text-white text-sm px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 active:scale-95 disabled:opacity-60 transition-all min-h-[44px]"
              >
                {sendStatus === 'sending' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                    Envoi…
                  </>
                ) : sendStatus === 'sent' ? (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Envoyé
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    {intervention.status === 'sent' ? 'Renvoyer le rapport' : 'Envoyer le rapport'}
                  </>
                )}
              </button>
              {sendFeedback && (
                <span className={`text-[11px] ${sendStatus === 'error' ? 'text-red-600' : 'text-[#78716c]'}`}>
                  {sendFeedback}
                </span>
              )}
            </div>
          )}
          {!isLocked && (
            <button
              type="button"
              onClick={() => persist(form)}
              disabled={saveStatus === 'saving'}
              className="bg-primary text-white text-sm px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 active:scale-95 disabled:opacity-50 transition-all min-h-[44px]"
            >
              {saveStatus === 'saving' ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          )}
        </div>
      </div>

      {/* Section — Client */}
      {PROTOCOLES[itype] && (
        <ProtocoleButton
          interventionId={intervention.id}
          titre={PROTOCOLES[itype].titre}
          url={protocoleUrl(itype) ?? '#'}
          clientEmail={form.client_email || null}
          envoyeAt={intervention.protocole_envoye_at ?? null}
        />
      )}

      <FormSection number={S()} title="Client">
        <ClientSearch
          initialData={{
            dolibarr_tiers_id: form.dolibarr_tiers_id,
            client_name: form.client_name,
            client_address: form.client_address,
            client_email: form.client_email,
          }}
          onChange={handleClientChange}
          disabled={isLocked}
        />
      </FormSection>

      {/* Bandeau dernier passage */}
      {!isLocked && importState === 'loading' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl text-sm text-[#78716c]">
          <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
          Recherche du dernier passage…
        </div>
      )}
      {!isLocked && importState === 'ready' && lastIntervention && (() => {
        const nbBiocides = lastIntervention.biocides?.length ?? 0
        const hasSynthese = !!lastIntervention.synthese
        const hasPlan = !!lastIntervention.plan_image_path
        const nbArticles = lastIntervention.articles_count
        const nbPhotos = lastIntervention.photos_count
        const chips = [
          nbBiocides > 0 && `${nbBiocides} biocide${nbBiocides > 1 ? 's' : ''}`,
          hasSynthese && 'Synthèse',
          hasPlan && nbArticles > 0 && `Plan (${nbArticles} poste${nbArticles > 1 ? 's' : ''})`,
          nbPhotos > 0 && `${nbPhotos} photo${nbPhotos > 1 ? 's' : ''}`,
        ].filter(Boolean) as string[]
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-start gap-2 text-sm text-blue-800">
              <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              <span>
                Dernier passage le{' '}
                <strong>{new Date(lastIntervention.intervention_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                {lastIntervention.intervention_type && ` — ${lastIntervention.intervention_type}`}
                {' · '}
                <Link href={`/interventions/${lastIntervention.id}`} className="underline underline-offset-2" target="_blank">
                  {lastIntervention.reference}
                </Link>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {chips.length > 0 ? chips.map(c => (
                  <span key={c} className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">{c}</span>
                )) : (
                  <span className="text-[12px] text-[#a8a29e]">Aucune donnée disponible dans ce passage</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleImportLast}
                disabled={chips.length === 0}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Importer tout
              </button>
            </div>
          </div>
        )
      })()}
      {!isLocked && importState === 'importing' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
          Import en cours — plan, postes, photos, biocides, synthèse…
        </div>
      )}

      {/* Section — Informations générales */}
      <FormSection number={S()} title="Informations générales">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
              Date d'intervention
            </label>
            <input
              type="date"
              value={form.intervention_date}
              onChange={e => update({ intervention_date: e.target.value })}
              disabled={isLocked}
              className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px] bg-white disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
              Technicien
            </label>
            <select
              value={customTech ? '__autre__' : form.technician_name}
              onChange={e => {
                if (e.target.value === '__autre__') {
                  setCustomTech(true)
                  update({ technician_name: '' })
                } else {
                  setCustomTech(false)
                  update({ technician_name: e.target.value })
                }
              }}
              disabled={isLocked}
              className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px] bg-white disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
            >
              <option value="">— Sélectionner —</option>
              {TECHS.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="__autre__">Autre…</option>
            </select>
            {customTech && !isLocked && (
              <input
                type="text"
                value={form.technician_name}
                onChange={e => update({ technician_name: e.target.value })}
                placeholder="Nom du technicien"
                autoFocus
                className="mt-2 w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
              />
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
              Nuisible traité
            </label>
            <select
              value={itype}
              onChange={e => handleTypeChange(e.target.value as InterventionType)}
              disabled={isLocked}
              className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px] bg-white disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
            >
              <option value="rats">Rongeurs</option>
              <option value="fourmis">Fourmis</option>
              <option value="cafards">Cafards</option>
              <option value="punaises_lit">Punaises de lit - Puces</option>
              <option value="frelons_guepes">Frelons / Guêpes</option>
              <option value="moustiques">Moustiques</option>
              <option value="mixte">Mixte</option>
            </select>
          </div>
          {ESPECES[itype] && (
            <div className="sm:col-span-2">
              <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
                Espèce identifiée
              </label>
              <EspeceSection
                options={ESPECES[itype]!}
                value={(extraData.espece as string) ?? ''}
                onChange={v => updateExtraData('espece', v)}
                disabled={isLocked}
              />
            </div>
          )}
        </div>
      </FormSection>

      {/* Section — État initial (punaises uniquement) */}
      {itype === 'punaises_lit' && (
        <FormSection number={S()} title="État initial du logement">
          <EtatInitialSection
            value={(extraData.etat_initial as Record<string, unknown>) ?? {}}
            onChange={v => updateExtraData('etat_initial', v)}
            disabled={isLocked}
          />
        </FormSection>
      )}

      {/* Section — Conditions d'intervention (frelons uniquement) */}
      {itype === 'frelons_guepes' && (
        <FormSection number={S()} title="Conditions d'intervention">
          <ConditionsInterventionSection
            value={(extraData.conditions as Record<string, unknown>) ?? {}}
            onChange={v => updateExtraData('conditions', v)}
            disabled={isLocked}
          />
        </FormSection>
      )}

      {/* Section — Plan d'implantation (si showPlan) */}
      {showPlan && (
        <FormSection number={S()} title={articlesTitle}>
          <PlanSection
            key={planRevision}
            interventionId={intervention.id}
            interventionType={itype}
            articles={articles}
            onArticlesChange={setArticles}
            initialPlanPath={intervention.plan_image_path}
            initialPlanUrl={currentPlanUrl}
            disabled={isLocked}
          />
        </FormSection>
      )}

      {/* Section — Articles / Zones (si pas de plan) */}
      {!showPlan && (
        <FormSection number={S()} title={articlesTitle}>
          <RelevesSection
            interventionType={itype}
            articles={articles}
            onArticleRelevesChange={handleArticleRelevesChange}
            onResetAll={handleResetAll}
            disabled={isLocked}
          />
        </FormSection>
      )}

      {/* Section — Relevés (si plan présent, les relevés sont une section séparée) */}
      {showPlan && (
        <FormSection number={S()} title="Relevés">
          <RelevesSection
            interventionType={itype}
            articles={articles}
            onArticleRelevesChange={handleArticleRelevesChange}
            onResetAll={handleResetAll}
            disabled={isLocked}
          />
        </FormSection>
      )}

      {/* Section — Pièges moustiques (type moustiques uniquement) */}
      {itype === 'moustiques' && (
        <FormSection number={S()} title="Pièges anti-moustiques">
          <PiegesMoustiquesSection
            interventionId={intervention.id}
            interventionDate={form.intervention_date}
            dolibarrTiersId={form.dolibarr_tiers_id}
            clientName={form.client_name}
            clientAddress={form.client_address || null}
            initialPieges={piegesMoustiques ?? []}
            disabled={isLocked}
          />
        </FormSection>
      )}

      {/* Section — Appâts létaux : rongeurs (ou multi-nuisibles), ou si des appâts existent déjà */}
      {(itype === 'rats' || itype === 'mixte' || (appatsLetaux?.length ?? 0) > 0) && (
      <FormSection number={S()} title="Appâts létaux — rongeurs">
        <AppatsLetauxSection
          interventionId={intervention.id}
          interventionDate={form.intervention_date}
          dolibarrTiersId={form.dolibarr_tiers_id}
          clientName={form.client_name}
          clientAddress={form.client_address || null}
          initialAppats={appatsLetaux ?? []}
          disabled={isLocked}
        />
      </FormSection>
      )}

      {/* Section — Biocides */}
      <FormSection number={S()} title="Produits biocides utilisés">
        <BiocidesSection
          key={importRevision}
          value={form.biocides}
          onChange={v => update({ biocides: v })}
          disabled={isLocked}
          interventionType={itype}
          dbProduits={biocideProducts}
          dbProduitsRich={biocideProductsRich}
        />
      </FormSection>

      {/* Section — Photos */}
      <FormSection number={S()} title="Photos">
        <PhotosSection
          interventionId={intervention.id}
          initialPhotos={photos}
          disabled={isLocked}
        />
      </FormSection>

      {/* Section — Consignes post-traitement (punaises uniquement) */}
      {itype === 'punaises_lit' && (
        <FormSection number={S()} title="Consignes post-traitement">
          <ConsignesPostSection
            value={(extraData.consignes_post as Record<string, unknown>) ?? {}}
            onChange={v => updateExtraData('consignes_post', v)}
            disabled={isLocked}
          />
        </FormSection>
      )}

      {/* Section — Synthèse */}
      <FormSection number={S()} title="Synthèse">
        <SyntheseSection
          key={importRevision}
          value={form.synthese}
          onChange={v => update({ synthese: v })}
          phraseTemplates={phraseTemplates}
          interventionType={itype}
          espece={(extraData.espece as string) || undefined}
          disabled={isLocked}
        />
      </FormSection>

      {/* Section — Signature */}
      <FormSection number={S()} title="Signature">
        <SignatureSection
          interventionId={intervention.id}
          initialSignatureUrl={intervention.signature_data_url}
          initialSignataireNom={intervention.signataire_nom}
          isLocked={isLocked}
        />
      </FormSection>

      {isLocked && (
        <ScheduleNextVisit
          dolibarr_tiers_id={intervention.dolibarr_tiers_id}
          client_name={intervention.client_name}
        />
      )}

      {dolibarrModal && (
        <CreateDolibarrDoc
          interventionId={intervention.id}
          interventionType={itype}
          clientName={intervention.client_name}
          clientEmail={intervention.client_email}
          interventionDate={intervention.intervention_date}
          dolibarrProducts={dolibarrProducts ?? []}
          savedLines={(intervention.dolibarr_lines as DocLine[] | null)}
          devisRef={devisRef}
          devisStatus={devisStatus}
          factureRef={factureRef}
          onClose={() => setDolibarrModal(false)}
          onDevisSaved={ref => { setDevisRef(ref); setDevisStatus(0) }}
          onDevisValidated={() => setDevisStatus(1)}
          onDevisLinked={(ref, status) => { setDevisRef(ref); setDevisStatus(status >= 1 ? 1 : 0) }}
          onFactureCreated={ref => { setFactureRef(ref); setDolibarrModal(false) }}
        />
      )}
    </div>
  )
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  const map: Record<SaveStatus, { text: string; cls: string }> = {
    idle: { text: '', cls: '' },
    saving: { text: 'Enregistrement…', cls: 'text-[#a8a29e]' },
    saved: { text: '✓ Enregistré', cls: 'text-primary' },
    error: { text: '⚠ Échec de la sauvegarde', cls: 'text-red-500' },
  }
  const { text, cls } = map[status]
  return <span className={`text-xs font-medium ${cls}`}>{text}</span>
}

function FormSection({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f5f5f4] bg-[#fafaf9]">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0">
          {number}
        </span>
        <h2 className="font-medium text-sm text-[#1c1917]">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

function PlaceholderSection({ number, title, step }: { number: number; title: string; step: number }) {
  return (
    <div className="bg-white border border-[#e7e5e4] border-dashed rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f5f5f4]/60 bg-[#fafaf9]/60">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#f5f5f4] text-[#a8a29e] text-[11px] font-bold shrink-0">
          {number}
        </span>
        <h2 className="font-medium text-sm text-[#a8a29e]">{title}</h2>
      </div>
      <div className="px-4 py-5 text-center text-[13px] text-[#c7c3c0]">
        À venir — Étape {step}
      </div>
    </div>
  )
}
