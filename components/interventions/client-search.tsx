'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { DolibarrTiers } from '@/app/api/dolibarr/search/route'

export interface ClientData {
  dolibarr_tiers_id: number | null
  client_name: string
  client_address: string
  client_email: string
}

interface ClientSearchProps {
  initialData: ClientData
  onChange: (data: ClientData) => void
  disabled?: boolean
}

export default function ClientSearch({ initialData, onChange, disabled }: ClientSearchProps) {
  const [isManual, setIsManual] = useState(initialData.dolibarr_tiers_id === null && initialData.client_name !== 'Client à définir' && initialData.client_name !== '')
  const [query, setQuery] = useState(initialData.client_name === 'Client à définir' ? '' : initialData.client_name)
  const [results, setResults] = useState<DolibarrTiers[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selected, setSelected] = useState<DolibarrTiers | null>(null)
  const [manualData, setManualData] = useState<ClientData>(initialData)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ferme le dropdown si clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setIsOpen(false); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/dolibarr/search?q=${encodeURIComponent(q)}`)
      const data: DolibarrTiers[] = await res.json()
      setResults(data)
      setIsOpen(data.length > 0)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  function handleSelect(tiers: DolibarrTiers) {
    setSelected(tiers)
    setQuery(tiers.nom)
    setIsOpen(false)
    setResults([])
    onChange({
      dolibarr_tiers_id: tiers.id,
      client_name: tiers.nom,
      client_address: tiers.adresse_complete,
      client_email: tiers.email,
    })
  }

  function handleManualChange(field: keyof ClientData, value: string | null) {
    const updated = { ...manualData, [field]: value }
    setManualData(updated)
    onChange(updated)
  }

  function switchToManual() {
    setIsManual(true)
    setIsOpen(false)
    setResults([])
    // Préserve le nom saisi dans la recherche, ou le nom déjà existant — évite un save parasite avec un nom vide
    const data: ClientData = {
      dolibarr_tiers_id: null,
      client_name: query.trim() || manualData.client_name,
      client_address: manualData.client_address,
      client_email: manualData.client_email,
    }
    setManualData(data)
    onChange(data)
  }

  function switchToDolibarr() {
    setIsManual(false)
    setQuery('')
    setSelected(null)
    const data: ClientData = {
      dolibarr_tiers_id: null,
      client_name: 'Client à définir',
      client_address: '',
      client_email: '',
    }
    onChange(data)
  }

  if (isManual) {
    return (
      <div className="space-y-3">
        {/* Alerte hors Dolibarr */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2.5 text-[12.5px]">
          <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Client saisi manuellement — il sera créé automatiquement dans Dolibarr lors de l'envoi du rapport.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">Nom du client *</label>
            <input
              type="text"
              value={manualData.client_name}
              onChange={e => handleManualChange('client_name', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
              placeholder="Restaurant Le Tilleul"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={manualData.client_email}
              onChange={e => handleManualChange('client_email', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
              placeholder="contact@client.fr"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">Adresse</label>
          <input
            type="text"
            value={manualData.client_address}
            onChange={e => handleManualChange('client_address', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
            placeholder="14 rue de la Paix, 69002 Lyon"
          />
        </div>

        <button
          type="button"
          onClick={switchToDolibarr}
          disabled={disabled}
          className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
        >
          ← Rechercher dans Dolibarr
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="relative">
        <div className="relative">
          {/* Icône loupe ou check */}
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {selected ? (
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            ) : isLoading ? (
              <span className="w-4 h-4 border-2 border-[#d6d3d1] border-t-primary rounded-full animate-spin block" />
            ) : (
              <svg className="w-4 h-4 text-[#a8a29e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            )}
          </span>

          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            disabled={disabled}
            placeholder="Rechercher un client Dolibarr…"
            className="w-full pl-9 pr-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px] transition-shadow"
          />
        </div>

        {/* Dropdown résultats */}
        {isOpen && results.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#e7e5e4] rounded-xl shadow-md overflow-hidden">
            {results.map(tiers => (
              <button
                key={tiers.id}
                type="button"
                onMouseDown={() => handleSelect(tiers)}
                className="w-full text-left px-4 py-3 hover:bg-[#f5f5f4] transition-colors border-b border-[#f5f5f4] last:border-0"
              >
                <div className="font-medium text-sm text-[#1c1917]">{tiers.nom}</div>
                <div className="text-xs text-[#57534e] mt-0.5 flex gap-2 flex-wrap">
                  {tiers.adresse_complete && <span>{tiers.adresse_complete}</span>}
                  {tiers.code_client && <span className="font-mono text-[#a8a29e]">{tiers.code_client}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Infos du tiers sélectionné */}
      {selected && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-[12.5px] text-primary flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>{selected.adresse_complete}</span>
          {selected.email && <span className="opacity-75">· {selected.email}</span>}
        </div>
      )}

      {/* Bouton hors Dolibarr */}
      <button
        type="button"
        onClick={switchToManual}
        disabled={disabled}
        className="text-xs text-[#57534e] hover:text-primary underline underline-offset-2"
      >
        Client hors Dolibarr (saisie manuelle)
      </button>
    </div>
  )
}
