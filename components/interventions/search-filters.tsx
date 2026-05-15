'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export default function SearchFilters({
  defaultQ,
  defaultStatus,
}: {
  defaultQ: string
  defaultStatus: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(defaultQ)
  const [status, setStatus] = useState(defaultStatus)
  const isFirstRender = useRef(true)

  // Debounce la recherche texte (300ms)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status !== 'all') params.set('status', status)
      router.replace(`${pathname}?${params.toString()}`)
    }, 300)
    return () => clearTimeout(timer)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  // Le filtre statut s'applique immédiatement
  function handleStatusChange(value: string) {
    setStatus(value)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (value !== 'all') params.set('status', value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8a29e] pointer-events-none"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Rechercher par client, adresse, référence…"
          className="w-full pl-9 pr-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow min-h-[44px]"
        />
      </div>

      <select
        value={status}
        onChange={e => handleStatusChange(e.target.value)}
        className="px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 bg-white text-[#1c1917] min-h-[44px]"
      >
        <option value="all">Tous les statuts</option>
        <option value="draft">Brouillons</option>
        <option value="signed">Signés</option>
        <option value="sent">Envoyés</option>
      </select>
    </div>
  )
}
