'use client'

import { useState } from 'react'
import { scheduleVisit } from '@/app/actions/schedule-visit'

const TYPE_OPTIONS = [
  'Contrôle mensuel',
  'Dératisation',
  'Désinsectisation',
  'Désinfection',
  'Visite de suivi',
]

interface Props {
  dolibarr_tiers_id: number | null
  client_name: string
}

type Status = 'idle' | 'submitting' | 'done' | 'error'

export default function ScheduleNextVisit({ dolibarr_tiers_id, client_name }: Props) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [type, setType] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setError(null)
    const result = await scheduleVisit({ dolibarr_tiers_id, client_name, date, type, note })
    if (result.ok) {
      setStatus('done')
    } else {
      setStatus('error')
      setError(result.error ?? 'Erreur inconnue')
    }
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
        Prochaine visite planifiée dans Dolibarr
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#fafaf9] border-b border-[#f5f5f4] text-sm font-medium text-[#1c1917] hover:bg-[#f5f5f4] transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Planifier la prochaine visite
        </span>
        <svg
          className={`w-4 h-4 text-[#a8a29e] transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
                Type d'intervention
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 bg-white"
              >
                <option value="">— Sélectionner —</option>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
              Note (optionnelle)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Instructions ou remarques pour cette visite…"
              className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={status === 'submitting' || !date}
              className="bg-primary text-white text-sm px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-all min-h-[44px]"
            >
              {status === 'submitting' ? 'Planification…' : 'Planifier dans Dolibarr'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
