'use client'

import { updatePosteReadings, type PosteRow, type ReadingField } from '@/app/actions/plan'

const ETAT_OPTIONS    = ['Intact', 'Dégradé', 'Manquant'] as const
const CONSO_OPTIONS   = ['Nulle', 'Partielle', 'Totale'] as const
const TRACES_OPTIONS  = ['Aucune', 'Déjections', 'Rongeurs'] as const
const ACTION_OPTIONS  = ['RAS', 'Renouvellement', 'Repositionnement'] as const

const FIELDS: { key: ReadingField; label: string; options: readonly string[] }[] = [
  { key: 'etat',        label: 'État',        options: ETAT_OPTIONS   },
  { key: 'consommation',label: 'Consommation',options: CONSO_OPTIONS  },
  { key: 'traces',      label: 'Traces',      options: TRACES_OPTIONS },
  { key: 'action',      label: 'Action',      options: ACTION_OPTIONS },
]

// Color hint for non-null values
const VALUE_COLORS: Record<string, string> = {
  Intact: 'text-emerald-700', Dégradé: 'text-amber-600', Manquant: 'text-red-600',
  Nulle: 'text-[#78716c]', Partielle: 'text-amber-600', Totale: 'text-red-600',
  Aucune: 'text-[#78716c]', Déjections: 'text-amber-600', Rongeurs: 'text-red-600',
  RAS: 'text-[#78716c]', Renouvellement: 'text-blue-600', Repositionnement: 'text-blue-600',
}

interface Props {
  postes: PosteRow[]
  onPosteReadingChange: (id: string, field: ReadingField, value: string | null) => void
  onResetAll: () => void
  disabled?: boolean
}

export default function RelevesSection({ postes, onPosteReadingChange, onResetAll, disabled }: Props) {
  if (postes.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[#a8a29e]">
        Ajoutez des postes dans le plan d'implantation (Section 2) pour saisir les relevés.
      </div>
    )
  }

  function handleChange(posteId: string, field: ReadingField, value: string) {
    const val = value || null
    onPosteReadingChange(posteId, field, val)
    updatePosteReadings(posteId, field, val)
  }

  const filled = postes.filter(p => p.etat && p.consommation && p.traces && p.action).length

  return (
    <div className="space-y-3">
      {/* Progress + bouton RAS global */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-[#f5f5f4] rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: postes.length ? `${(filled / postes.length) * 100}%` : '0%' }}
          />
        </div>
        <span className="text-[12px] text-[#a8a29e] shrink-0">
          {filled}/{postes.length} poste{postes.length > 1 ? 's' : ''} rempli{filled > 1 ? 's' : ''}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={onResetAll}
            className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-[#d6d3d1] text-[#57534e] hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors whitespace-nowrap"
            title="Intact · Nulle · Aucune · RAS pour tous les postes"
          >
            Aucune présence
          </button>
        )}
      </div>

      {/* Poste cards */}
      {postes.map(poste => {
        const complete = !!(poste.etat && poste.consommation && poste.traces && poste.action)
        return (
          <div
            key={poste.id}
            className={`border rounded-xl overflow-hidden transition-colors ${
              complete ? 'border-primary/30 bg-white' : 'border-[#e7e5e4] bg-white'
            }`}
          >
            {/* Card header */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#fafaf9] border-b border-[#f5f5f4]">
              <span className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold border-2 shrink-0 ${
                complete ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-primary'
              }`}>
                {poste.label}
              </span>
              {complete && (
                <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>

            {/* Selects grid */}
            <div className="grid grid-cols-2 gap-px bg-[#f5f5f4]">
              {FIELDS.map(({ key, label, options }) => {
                const val = poste[key] ?? ''
                return (
                  <div key={key} className="bg-white px-3 py-2.5">
                    <label className="block text-[10px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1">
                      {label}
                    </label>
                    <select
                      value={val}
                      onChange={e => handleChange(poste.id, key, e.target.value)}
                      disabled={disabled}
                      className={`w-full px-2 py-1.5 border border-[#e7e5e4] rounded-lg text-[13px] font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[40px] bg-white disabled:bg-[#f5f5f4] appearance-none cursor-pointer ${
                        val ? VALUE_COLORS[val] ?? '' : 'text-[#c7c3c0]'
                      }`}
                    >
                      <option value="">—</option>
                      {options.map(o => (
                        <option key={o} value={o} className="text-[#1c1917]">{o}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
