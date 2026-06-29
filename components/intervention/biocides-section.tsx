'use client'

import { useState } from 'react'
import type { BiocideEntry } from '@/app/actions/interventions'
import type { BiocideProduct } from '@/app/actions/biocides'

const PRODUITS_BY_TYPE: Record<string, string[]> = {
  rats:           ['Ratimox Bloc', 'Brodifacoum WB', 'Maki Bloc Grains', 'Bromakil Block', 'Raticid Pro', 'Talon Bloc'],
  frelons_guepes: ['Solfac EW 50', 'K-Othrine SC 7.5', 'Demand CS', 'Ficam W', 'Guêpinex'],
  fourmis:        ['Ficam W', 'Demand CS', 'Cislin 10 SC', 'Advion Ant Gel', 'Goliath Fourmi Gel'],
  punaises_lit:   ['K-Othrine SC 7.5', 'Demand CS', 'Tempo 10 WP', 'Cislin 10 SC', 'Diatomix Pro'],
  cafards:        ['Ficam W', 'Solfac EW 50', 'Goliath Gel', 'Advion Cockroach Gel', 'K-Othrine SC 7.5'],
  moustiques:     ['Aqua K-Othrine', 'Bacillus thuringiensis', 'Biotrine 10', 'Aqua Resigen'],
  mixte:          ['Ratimox Bloc', 'Ficam W', 'Solfac EW 50', 'K-Othrine SC 7.5', 'Demand CS', 'Cislin 10 SC'],
}
const PRODUITS_DEFAUT = ['Ficam W', 'Solfac EW 50', 'K-Othrine SC 7.5', 'Demand CS']

interface Props {
  value: BiocideEntry[]
  onChange: (v: BiocideEntry[]) => void
  disabled: boolean
  interventionType?: string
  dbProduits?: Record<string, string[]>
  dbProduitsRich?: Record<string, BiocideProduct[]>
}

export default function BiocidesSection({ value, onChange, disabled, interventionType, dbProduits, dbProduitsRich }: Props) {
  const richList: BiocideProduct[] = interventionType ? (dbProduitsRich?.[interventionType] ?? []) : []
  const produits: string[] = (() => {
    if (richList.length) return richList.map(p => p.nom)
    if (interventionType && dbProduits?.[interventionType]?.length) return dbProduits[interventionType]
    return interventionType ? (PRODUITS_BY_TYPE[interventionType] ?? PRODUITS_DEFAUT) : PRODUITS_DEFAUT
  })()

  function add() {
    onChange([...value, { produit: '', quantite: '' }])
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  function updateEntry(i: number, patch: Partial<BiocideEntry>) {
    onChange(value.map((e, idx) => idx === i ? { ...e, ...patch } : e))
  }

  function handleSelectProduct(i: number, nom: string) {
    const rich = richList.find(p => p.nom === nom)
    updateEntry(i, {
      produit: nom,
      numero_amm: rich?.numero_amm ?? undefined,
      substance_active: rich?.substance_active ?? undefined,
      mode_application: rich?.mode_application ?? undefined,
      delai_reentree: rich?.delai_reentree ?? undefined,
      quantite: value[i]?.quantite || (rich?.dosage_defaut ?? ''),
    })
  }

  if (disabled && value.length === 0) {
    return <p className="text-sm text-[#a8a29e]">Aucun biocide utilisé.</p>
  }

  return (
    <div className="space-y-4">
      {value.map((entry, i) => (
        <div key={i} className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-3 space-y-3">
          {/* Ligne 1 : produit + quantité + suppr */}
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <ProductField
                value={entry.produit}
                onChange={nom => handleSelectProduct(i, nom)}
                disabled={disabled}
                produits={produits}
              />
            </div>
            <input
              type="text"
              placeholder="Quantité (ex. 500g)"
              value={entry.quantite}
              onChange={e => updateEntry(i, { quantite: e.target.value })}
              disabled={disabled}
              className="w-32 shrink-0 px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px] disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
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

          {/* Champs enrichis */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1 block">N° AMM</label>
              <input
                type="text"
                placeholder="ex. 2150156"
                value={entry.numero_amm ?? ''}
                onChange={e => updateEntry(i, { numero_amm: e.target.value })}
                disabled={disabled}
                className="w-full px-2.5 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
              />
            </div>
            <div>
              <label className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1 block">Substance active</label>
              <input
                type="text"
                placeholder="ex. Brodifacoum 0.005%"
                value={entry.substance_active ?? ''}
                onChange={e => updateEntry(i, { substance_active: e.target.value })}
                disabled={disabled}
                className="w-full px-2.5 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
              />
            </div>
            <div>
              <label className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1 block">Zone traitée</label>
              <input
                type="text"
                placeholder="ex. Cave, salle de stockage"
                value={entry.zone_traitee ?? ''}
                onChange={e => updateEntry(i, { zone_traitee: e.target.value })}
                disabled={disabled}
                className="w-full px-2.5 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
              />
            </div>
            <div>
              <label className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1 block">Délai réentrée</label>
              <input
                type="text"
                placeholder="ex. 2h, 24h"
                value={entry.delai_reentree ?? ''}
                onChange={e => updateEntry(i, { delai_reentree: e.target.value })}
                disabled={disabled}
                className="w-full px-2.5 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1 block">Mode d'application</label>
              <input
                type="text"
                placeholder="ex. Pulvérisation, pose d'appâts"
                value={entry.mode_application ?? ''}
                onChange={e => updateEntry(i, { mode_application: e.target.value })}
                disabled={disabled}
                className="w-full px-2.5 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
              />
            </div>
          </div>
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

function ProductField({ value, onChange, disabled, produits }: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
  produits: string[]
}) {
  const isCustom = value !== '' && !produits.includes(value)
  const [showInput, setShowInput] = useState(isCustom)

  if (disabled) {
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
        {produits.map(p => <option key={p} value={p}>{p}</option>)}
        <option value="__autre__">Autre…</option>
      </select>
      {showInput && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Nom du produit"
          autoFocus
          className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
        />
      )}
    </div>
  )
}
