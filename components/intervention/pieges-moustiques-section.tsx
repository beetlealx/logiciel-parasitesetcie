'use client'

import { useState, useTransition } from 'react'
import {
  addPiege,
  recordMaintenancePiege,
  archiverPiege,
  type PiegeMoustique,
  type PiegeType,
} from '@/app/actions/pieges-moustiques'

const TYPE_LABELS: Record<PiegeType, string> = {
  'bg-gat':      'BG-Gat',
  'bg-protector': 'BG-Protector',
  'bg-counter':  'BG-Counter',
}
const TYPE_COLORS: Record<PiegeType, string> = {
  'bg-gat':      '#0ea5e9',
  'bg-protector': '#8b5cf6',
  'bg-counter':  '#10b981',
}

interface Maintenance { gaz: boolean; attractif: boolean; plaque: boolean }

interface Props {
  interventionId: string
  interventionDate: string      // YYYY-MM-DD
  dolibarrTiersId: number | null
  clientName: string
  clientAddress: string | null
  initialPieges: PiegeMoustique[]
  disabled: boolean
}

export default function PiegesMoustiquesSection({
  interventionId,
  interventionDate,
  dolibarrTiersId,
  clientName,
  clientAddress,
  initialPieges,
  disabled,
}: Props) {
  const [pieges, setPieges] = useState<PiegeMoustique[]>(initialPieges)
  const [maintenance, setMaintenance] = useState<Record<string, Maintenance>>(
    () => Object.fromEntries(initialPieges.map(p => [p.id, { gaz: false, attractif: false, plaque: false }]))
  )
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState<PiegeType>('bg-gat')
  const [newNumero, setNewNumero] = useState('')
  const [newDate, setNewDate] = useState(interventionDate)
  const [, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  function setMsg(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  function toggleMaintenance(piegeId: string, key: keyof Maintenance, checked: boolean) {
    const next = { ...maintenance[piegeId], [key]: checked }
    setMaintenance(prev => ({ ...prev, [piegeId]: next }))

    startTransition(async () => {
      const res = await recordMaintenancePiege(piegeId, {
        gaz: key === 'gaz' ? checked : false,
        attractif: key === 'attractif' ? checked : false,
        plaque: key === 'plaque' ? checked : false,
        date: interventionDate,
      })
      if (!res.ok) setMsg(`Erreur : ${res.error}`)
      else {
        setPieges(prev => prev.map(p => {
          if (p.id !== piegeId) return p
          return {
            ...p,
            date_dernier_gaz:        key === 'gaz' && checked        ? interventionDate : p.date_dernier_gaz,
            date_dernier_attractif:  key === 'attractif' && checked  ? interventionDate : p.date_dernier_attractif,
            date_derniere_plaque:    key === 'plaque' && checked     ? interventionDate : p.date_derniere_plaque,
          }
        }))
      }
    })
  }

  function handleAdd() {
    if (!newNumero.trim()) return
    startTransition(async () => {
      const res = await addPiege({
        dolibarr_tiers_id: dolibarrTiersId,
        client_name: clientName,
        client_address: clientAddress,
        type_piege: newType,
        numero: newNumero.trim(),
        date_installation: newDate,
        installation_intervention_id: interventionId,
      })
      if (!res.ok || !res.piege) { setMsg(`Erreur : ${res.error}`); return }
      setPieges(prev => [...prev, res.piege!])
      setMaintenance(prev => ({ ...prev, [res.piege!.id]: { gaz: false, attractif: false, plaque: false } }))
      setNewNumero('')
      setShowAdd(false)
    })
  }

  function handleArchiver(id: string) {
    startTransition(async () => {
      const res = await archiverPiege(id)
      if (!res.ok) { setMsg(`Erreur : ${res.error}`); return }
      setPieges(prev => prev.filter(p => p.id !== id))
    })
  }

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{feedback}</div>
      )}

      {pieges.length === 0 && !showAdd && (
        <p className="text-sm text-[#a8a29e]">Aucun piège enregistré pour ce site.</p>
      )}

      {pieges.map(p => {
        const m = maintenance[p.id] ?? { gaz: false, attractif: false, plaque: false }
        const color = TYPE_COLORS[p.type_piege as PiegeType] ?? '#6b7280'
        return (
          <div key={p.id} className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-3 space-y-3">
            {/* En-tête */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ background: color }}
                >
                  {TYPE_LABELS[p.type_piege as PiegeType] ?? p.type_piege}
                </span>
                <span className="text-[13px] font-semibold text-[#1c1917]">{p.numero}</span>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleArchiver(p.id)}
                  className="text-[11px] text-[#a8a29e] hover:text-red-500 transition-colors"
                >
                  Retirer
                </button>
              )}
            </div>

            {/* Dates de dernière maintenance */}
            <div className="grid grid-cols-3 gap-2 text-[11px] text-[#78716c]">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#a8a29e] mb-0.5">Dernier gaz</div>
                {fmtDate(p.date_dernier_gaz)}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#a8a29e] mb-0.5">Dernier attractif</div>
                {fmtDate(p.date_dernier_attractif)}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#a8a29e] mb-0.5">Dernière plaque</div>
                {fmtDate(p.date_derniere_plaque)}
              </div>
            </div>

            {/* Checkboxes entretien effectué lors de cette visite */}
            {!disabled && (
              <div className="space-y-1.5 pt-1 border-t border-[#ede9e4]">
                <p className="text-[10px] uppercase tracking-wide text-[#a8a29e] font-medium">Cette visite :</p>
                {([
                  { key: 'gaz',      label: 'Bouteille de gaz remplacée' },
                  { key: 'attractif', label: 'Attractif remplacé' },
                  { key: 'plaque',   label: 'Plaque collante vérifiée / remplacée' },
                ] as { key: keyof Maintenance; label: string }[]).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={m[key]}
                      onChange={e => toggleMaintenance(p.id, key, e.target.checked)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-sm text-[#57534e]">{label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Mode lecture */}
            {disabled && (
              <div className="text-[12px] text-[#78716c] pt-1 border-t border-[#ede9e4]">
                Installé le {fmtDate(p.date_installation)}
              </div>
            )}
          </div>
        )
      })}

      {/* Formulaire ajout piège */}
      {showAdd && !disabled && (
        <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-xl p-3 space-y-3">
          <p className="text-[11px] uppercase tracking-wide text-[#0369a1] font-semibold">Nouveau piège</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1">Modèle</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as PiegeType)}
                className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
              >
                <option value="bg-gat">BG-Gat</option>
                <option value="bg-protector">BG-Protector</option>
                <option value="bg-counter">BG-Counter</option>
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1">Numéro / Emplacement</label>
              <input
                type="text"
                value={newNumero}
                onChange={e => setNewNumero(e.target.value)}
                placeholder="ex : P1, Terrasse"
                className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1">Date d'installation</label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full sm:w-48 px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newNumero.trim()}
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
          Ajouter un piège
        </button>
      )}
    </div>
  )
}
