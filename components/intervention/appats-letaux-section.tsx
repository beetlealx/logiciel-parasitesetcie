'use client'

import { useState, useTransition } from 'react'
import {
  addAppatsLetal,
  releverAppatsLetal,
  archiverAppatsLetal,
  type AppatsLetal,
} from '@/app/actions/appats-letaux'

interface Props {
  interventionId: string
  interventionDate: string        // YYYY-MM-DD
  dolibarrTiersId: number | null
  clientName: string
  clientAddress: string | null
  initialAppats: AppatsLetal[]
  disabled: boolean
}

export default function AppatsLetauxSection({
  interventionId,
  interventionDate,
  dolibarrTiersId,
  clientName,
  clientAddress,
  initialAppats,
  disabled,
}: Props) {
  const [appats, setAppats] = useState<AppatsLetal[]>(initialAppats)
  const [showAdd, setShowAdd] = useState(false)
  const [newEmplacement, setNewEmplacement] = useState('')
  const [newDate, setNewDate] = useState(interventionDate)
  const [releveModal, setReleveModal] = useState<AppatsLetal | null>(null)
  const [releveDate, setReleveDate] = useState(interventionDate)
  const [releveIndice, setReleveIndice] = useState<'positif' | 'negatif' | ''>('')
  const [releveNotes, setReleveNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function setMsg(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  function daysUntil(d: string) {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
    if (diff < 0) return { label: `${Math.abs(diff)}j de retard`, color: '#dc2626' }
    if (diff === 0) return { label: "Aujourd'hui", color: '#dc2626' }
    if (diff <= 7) return { label: `Dans ${diff}j`, color: '#d97706' }
    return { label: `Dans ${diff}j`, color: '#57534e' }
  }

  function handleAdd() {
    if (!newEmplacement.trim()) return
    startTransition(async () => {
      const res = await addAppatsLetal({
        dolibarr_tiers_id: dolibarrTiersId,
        client_name: clientName,
        client_address: clientAddress,
        emplacement: newEmplacement.trim(),
        date_pose: newDate,
        intervention_pose_id: interventionId,
      })
      if (!res.ok || !res.appat) { setMsg(`Erreur : ${res.error}`); return }
      setAppats(prev => [...prev, res.appat!])
      setNewEmplacement('')
      setShowAdd(false)
    })
  }

  function openReleve(appat: AppatsLetal) {
    setReleveModal(appat)
    setReleveDate(interventionDate)
    setReleveIndice('')
    setReleveNotes('')
  }

  function handleReleve() {
    if (!releveModal || !releveIndice) return
    startTransition(async () => {
      const res = await releverAppatsLetal(releveModal.id, {
        date_releve_effective: releveDate,
        indice_presence: releveIndice as 'positif' | 'negatif',
        intervention_releve_id: interventionId,
        notes: releveNotes || undefined,
      })
      if (!res.ok) { setMsg(`Erreur : ${res.error}`); return }
      setAppats(prev => prev.filter(a => a.id !== releveModal.id))
      setReleveModal(null)
    })
  }

  function handleArchiver(id: string) {
    startTransition(async () => {
      const res = await archiverAppatsLetal(id)
      if (!res.ok) { setMsg(`Erreur : ${res.error}`); return }
      setAppats(prev => prev.filter(a => a.id !== id))
    })
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{feedback}</div>
      )}

      {/* Appâts en attente de relevé */}
      {appats.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium">
            En attente de relevé — {appats.length} appât{appats.length > 1 ? 's' : ''}
          </p>
          {appats.map(a => {
            const { label, color } = daysUntil(a.date_releve_prevue)
            return (
              <div key={a.id} className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-[13px] font-semibold text-[#1c1917]">{a.emplacement}</div>
                    <div className="text-[11px] text-[#78716c]">Posé le {fmtDate(a.date_pose)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-semibold" style={{ color }}>
                      Relevé : {label}
                    </div>
                    <div className="text-[11px] text-[#a8a29e]">
                      Échéance : {fmtDate(a.date_releve_prevue)}
                    </div>
                  </div>
                </div>
                {!disabled && (
                  <div className="flex gap-2 pt-2 border-t border-[#ede9e4]">
                    <button
                      type="button"
                      onClick={() => openReleve(a)}
                      className="flex-1 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                    >
                      Relever cet appât
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchiver(a.id)}
                      className="px-3 py-2 text-[12px] text-[#a8a29e] hover:text-red-500 transition-colors"
                    >
                      Archiver
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {appats.length === 0 && !showAdd && (
        <p className="text-sm text-[#a8a29e]">Aucun appât létal en cours sur ce site.</p>
      )}

      {/* Formulaire ajout */}
      {showAdd && !disabled && (
        <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-xl p-3 space-y-3">
          <p className="text-[11px] uppercase tracking-wide text-[#c2410c] font-semibold">Poser un appât létal</p>
          <div>
            <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1">Emplacement</label>
            <input
              type="text"
              value={newEmplacement}
              onChange={e => setNewEmplacement(e.target.value)}
              placeholder="ex : Cave Nord, Local poubelles, Trappe technique"
              className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1">Date de pose</label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full sm:w-48 px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
            />
          </div>
          <div className="text-[11.5px] text-[#92400e] bg-amber-50 rounded-lg px-3 py-2">
            Relevé obligatoire avant le {(() => {
              const d = new Date(newDate)
              d.setDate(d.getDate() + 35)
              return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
            })()} (règle des 35 jours)
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newEmplacement.trim()}
              className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-[#78716c] hover:text-[#1c1917] transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {!disabled && !showAdd && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium py-1 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Poser un appât létal
        </button>
      )}

      {/* Modal de relevé */}
      {releveModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#a8a29e] font-semibold">Relevé appât létal</p>
              <p className="text-base font-bold text-[#1c1917] mt-0.5">{releveModal.emplacement}</p>
              <p className="text-[12px] text-[#78716c]">Posé le {fmtDate(releveModal.date_pose)}</p>
            </div>

            <div>
              <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1.5">Date de relevé</label>
              <input
                type="date"
                value={releveDate}
                onChange={e => setReleveDate(e.target.value)}
                className="w-full sm:w-48 px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
              />
            </div>

            <div>
              <p className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-2">Indices de présence</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'negatif', label: 'Négatif', color: '#16a34a', bg: '#f0fdf4' },
                  { value: 'positif', label: 'Positif', color: '#dc2626', bg: '#fef2f2' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReleveIndice(opt.value as 'positif' | 'negatif')}
                    className="py-3 rounded-xl border-2 text-sm font-semibold transition-colors"
                    style={releveIndice === opt.value
                      ? { borderColor: opt.color, background: opt.bg, color: opt.color }
                      : { borderColor: '#e7e5e4', color: '#57534e' }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1">Notes (optionnel)</label>
              <textarea
                value={releveNotes}
                onChange={e => setReleveNotes(e.target.value)}
                rows={2}
                placeholder="Observations, traces observées..."
                className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleReleve}
                disabled={!releveIndice}
                className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                Confirmer le relevé
              </button>
              <button
                type="button"
                onClick={() => setReleveModal(null)}
                className="px-4 py-3 text-sm text-[#78716c] hover:text-[#1c1917] transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
