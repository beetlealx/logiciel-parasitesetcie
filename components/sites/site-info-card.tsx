'use client'

import { useState, useTransition } from 'react'
import { saveSiteInfo } from '@/app/actions/site-infos'
import type { SiteInfo } from '@/app/actions/site-infos'

interface Props {
  tiersId: number
  initial: SiteInfo | null
}

const FIELDS: { key: keyof Omit<SiteInfo, 'id' | 'tiers_id'>; label: string; placeholder: string; multiline?: boolean; icon: React.ReactNode }[] = [
  {
    key: 'code_acces',
    label: 'Code d\'accès',
    placeholder: 'Digicode, badge, interphone…',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
  {
    key: 'interlocuteur',
    label: 'Interlocuteur sur site',
    placeholder: 'Nom du responsable ou contact local',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    key: 'telephone_site',
    label: 'Téléphone site',
    placeholder: '06 00 00 00 00',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
      </svg>
    ),
  },
  {
    key: 'instructions',
    label: 'Instructions spécifiques',
    placeholder: 'Appeler avant d\'arriver, chien dans la cour, accès uniquement le matin…',
    multiline: true,
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  {
    key: 'notes',
    label: 'Notes internes',
    placeholder: 'Observations, historique particulier, points de vigilance…',
    multiline: true,
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
]

export default function SiteInfoCard({ tiersId, initial }: Props) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({
    code_acces: initial?.code_acces ?? '',
    interlocuteur: initial?.interlocuteur ?? '',
    telephone_site: initial?.telephone_site ?? '',
    instructions: initial?.instructions ?? '',
    notes: initial?.notes ?? '',
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasContent = Object.values(form).some(v => v.trim())

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const res = await saveSiteInfo(tiersId, {
        code_acces: form.code_acces.trim() || null,
        interlocuteur: form.interlocuteur.trim() || null,
        telephone_site: form.telephone_site.trim() || null,
        instructions: form.instructions.trim() || null,
        notes: form.notes.trim() || null,
      })
      if (res?.error) { setError(res.error); return }
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  // Read-only view with content
  if (!editing && hasContent) {
    return (
      <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3.5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Fiche site</div>
          <button
            onClick={() => setEditing(true)}
            className="text-[11.5px] text-primary hover:underline"
          >
            Modifier
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIELDS.filter(f => form[f.key as string]?.trim()).map(f => (
            <div key={f.key as string} className={f.multiline ? 'sm:col-span-2' : ''}>
              <div className="flex items-center gap-1.5 text-[10.5px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-1">
                {f.icon}
                {f.label}
              </div>
              <div className={`text-[13px] text-[#1c1917] ${f.multiline ? 'whitespace-pre-wrap' : ''}`}>
                {form[f.key as string]}
              </div>
            </div>
          ))}
        </div>
        {saved && <p className="text-[11.5px] text-emerald-600 mt-2">✓ Enregistré</p>}
      </div>
    )
  }

  // Empty state — collapsed button
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full mb-4 flex items-center gap-2 text-sm text-[#78716c] hover:text-[#1c1917] border border-dashed border-[#e7e5e4] rounded-xl px-4 py-3 hover:border-[#c7c3c0] transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Ajouter une fiche site (code d'accès, interlocuteur, instructions…)
      </button>
    )
  }

  // Edit form
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-4 mb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Fiche site</div>
        <button onClick={() => setEditing(false)} className="text-[11.5px] text-[#a8a29e] hover:text-[#1c1917]">Annuler</button>
      </div>

      {FIELDS.map(f => (
        <div key={f.key as string}>
          <label className="flex items-center gap-1.5 text-[10.5px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-1.5">
            {f.icon}
            {f.label}
          </label>
          {f.multiline ? (
            <textarea
              value={form[f.key as string]}
              onChange={e => setForm(prev => ({ ...prev, [f.key as string]: e.target.value }))}
              placeholder={f.placeholder}
              rows={3}
              className="w-full border border-[#d6d3d1] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
            />
          ) : (
            <input
              type="text"
              value={form[f.key as string]}
              onChange={e => setForm(prev => ({ ...prev, [f.key as string]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full border border-[#d6d3d1] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Enregistrement…' : 'Enregistrer la fiche site'}
      </button>
    </div>
  )
}
