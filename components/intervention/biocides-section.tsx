'use client'

import { useState } from 'react'
import type { BiocideEntry } from '@/app/actions/interventions'

// Mettre à jour cette liste avec vos produits habituels
const PRODUITS = [
  'Ratimox Bloc',
  'Brodifacoum WB',
  'Ficam W',
  'Solfac EW 50',
  'K-Othrine SC 7.5',
  'Demand CS',
  'Cislin 10 SC',
]

interface Props {
  value: BiocideEntry[]
  onChange: (v: BiocideEntry[]) => void
  disabled: boolean
}

export default function BiocidesSection({ value, onChange, disabled }: Props) {
  function add() {
    onChange([...value, { produit: '', quantite: '' }])
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  function updateEntry(i: number, patch: Partial<BiocideEntry>) {
    onChange(value.map((e, idx) => idx === i ? { ...e, ...patch } : e))
  }

  if (disabled && value.length === 0) {
    return <p className="text-sm text-[#a8a29e]">Aucun biocide utilisé.</p>
  }

  return (
    <div className="space-y-2">
      {value.map((entry, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1">
            <ProductField
              value={entry.produit}
              onChange={produit => updateEntry(i, { produit })}
              disabled={disabled}
            />
          </div>
          <input
            type="text"
            placeholder="Quantité (ex. 500g)"
            value={entry.quantite}
            onChange={e => updateEntry(i, { quantite: e.target.value })}
            disabled={disabled}
            className="w-36 shrink-0 px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px] disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-2.5 text-[#c7c3c0] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      ))}

      {!disabled && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium py-1 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Ajouter un produit biocide
        </button>
      )}
    </div>
  )
}

function ProductField({ value, onChange, disabled }: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const isCustom = value !== '' && !PRODUITS.includes(value)
  const [showInput, setShowInput] = useState(isCustom)

  if (disabled && isCustom) {
    return (
      <input
        type="text"
        value={value}
        disabled
        className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm min-h-[44px] bg-[#f5f5f4] text-[#a8a29e]"
      />
    )
  }

  return (
    <div className="space-y-1.5">
      <select
        value={showInput ? '__autre__' : value}
        onChange={e => {
          if (e.target.value === '__autre__') {
            setShowInput(true)
            onChange('')
          } else {
            setShowInput(false)
            onChange(e.target.value)
          }
        }}
        disabled={disabled}
        className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px] bg-white disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
      >
        <option value="">— Sélectionner un produit —</option>
        {PRODUITS.map(p => <option key={p} value={p}>{p}</option>)}
        <option value="__autre__">Autre…</option>
      </select>
      {showInput && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Nom du produit"
          autoFocus
          disabled={disabled}
          className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px] disabled:bg-[#f5f5f4]"
        />
      )}
    </div>
  )
}
