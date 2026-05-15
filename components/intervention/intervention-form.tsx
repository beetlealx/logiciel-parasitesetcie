'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ClientSearch, { type ClientData } from '@/components/interventions/client-search'
import { saveIntervention, type InterventionDraft, type BiocideEntry } from '@/app/actions/interventions'
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
import type { PosteRow, ReadingField } from '@/app/actions/plan'
import { bulkResetReadings } from '@/app/actions/plan'
import type { PhotoRow } from '@/app/actions/photos'
import type { PhraseTemplate } from '@/app/actions/phrases'

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
  type_intervention: string | null
  synthese: string | null
  biocides: BiocideEntry[] | null
  plan_image_path: string | null
  signature_data_url: string | null
  signataire_nom: string | null
}

interface Props {
  intervention: Intervention
  postes: PosteRow[]
  planUrl: string
  photos: PhotoRow[]
  phraseTemplates: PhraseTemplate[]
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type SendStatus = 'idle' | 'sending' | 'sent' | 'error'

export default function InterventionForm({ intervention, postes: initialPostes, planUrl, photos, phraseTemplates }: Props) {
  const router = useRouter()
  const isLocked = intervention.status !== 'draft'
  const isSigned = intervention.status === 'signed' || intervention.status === 'sent'
  const [postes, setPostes] = useState<PosteRow[]>(initialPostes)
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [sendFeedback, setSendFeedback] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  const TECHS = ['Alex', 'Fabrice'] as const
  const [customTech, setCustomTech] = useState(
    () => intervention.technician_name !== '' && !(TECHS as readonly string[]).includes(intervention.technician_name)
  )

  function handlePosteReadingChange(id: string, field: ReadingField, value: string | null) {
    setPostes(ps => ps.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function handleResetAll() {
    setPostes(ps => ps.map(p => ({ ...p, etat: 'Intact', consommation: 'Nulle', traces: 'Aucune', action: 'RAS' })))
    bulkResetReadings(postes.map(p => p.id))
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
            <a
              href={`/api/pdf/${intervention.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-[#d6d3d1] text-[#57534e] text-sm px-3 py-2.5 rounded-lg font-medium hover:bg-[#f5f5f4] transition-colors min-h-[44px]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              PDF
            </a>
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

      {/* Section 0 — Client */}
      <FormSection number={0} title="Client">
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

      {/* Section 1 — Informations générales */}
      <FormSection number={1} title="Informations générales">
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
              Type d'intervention
            </label>
            <select
              value={form.type_intervention}
              onChange={e => update({ type_intervention: e.target.value })}
              disabled={isLocked}
              className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px] bg-white disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
            >
              <option value="">— Sélectionner —</option>
              <option value="Dératisation">Dératisation</option>
              <option value="Désinsectisation">Désinsectisation</option>
              <option value="Désinfection">Désinfection</option>
              <option value="Traitement préventif">Traitement préventif</option>
              <option value="Traitement curatif">Traitement curatif</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
        </div>
      </FormSection>

      {/* Section 2 — Plan d'implantation */}
      <FormSection number={2} title="Plan d'implantation">
        <PlanSection
          interventionId={intervention.id}
          postes={postes}
          onPostesChange={setPostes}
          initialPlanPath={intervention.plan_image_path}
          initialPlanUrl={planUrl}
          disabled={isLocked}
        />
      </FormSection>

      {/* Section 3 — Relevés par poste */}
      <FormSection number={3} title="Relevés par poste">
        <RelevesSection
          postes={postes}
          onPosteReadingChange={handlePosteReadingChange}
          onResetAll={handleResetAll}
          disabled={isLocked}
        />
      </FormSection>

      {/* Section 4 — Biocides */}
      <FormSection number={4} title="Produits biocides utilisés">
        <BiocidesSection
          value={form.biocides}
          onChange={v => update({ biocides: v })}
          disabled={isLocked}
        />
      </FormSection>

      {/* Section 5 — Photos */}
      <FormSection number={5} title="Photos">
        <PhotosSection
          interventionId={intervention.id}
          initialPhotos={photos}
          disabled={isLocked}
        />
      </FormSection>

      {/* Section 6 — Synthèse */}
      <FormSection number={6} title="Synthèse">
        <SyntheseSection
          value={form.synthese}
          onChange={v => update({ synthese: v })}
          phraseTemplates={phraseTemplates}
          disabled={isLocked}
        />
      </FormSection>

      {/* Section 7 — Signature */}
      <FormSection number={7} title="Signature">
        <SignatureSection
          interventionId={intervention.id}
          initialSignatureUrl={intervention.signature_data_url}
          initialSignataireNom={intervention.signataire_nom}
          isLocked={isLocked}
        />
      </FormSection>

      {/* Planifier la prochaine visite — visible une fois l'intervention signée */}
      {isLocked && (
        <ScheduleNextVisit
          dolibarr_tiers_id={intervention.dolibarr_tiers_id}
          client_name={intervention.client_name}
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
