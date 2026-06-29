'use client'

import { useState, useTransition } from 'react'
import { saveRappelSettings } from '@/app/actions/rappels'

const DELAIS_OPTIONS = [1, 3, 7, 14, 30]

interface Props {
  initialSettings: {
    id: string
    email_dest: string
    jours_avant: number[]
    actif: boolean
  } | null
  userEmail: string
}

export default function RappelSettingsForm({ initialSettings, userEmail }: Props) {
  const [email, setEmail] = useState(initialSettings?.email_dest ?? userEmail)
  const [joursAvant, setJoursAvant] = useState<number[]>(initialSettings?.jours_avant ?? [7, 1])
  const [actif, setActif] = useState(initialSettings?.actif ?? true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleJour(j: number) {
    setJoursAvant(prev =>
      prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j].sort((a, b) => b - a)
    )
  }

  function handleSave() {
    if (!email.trim()) { setError('Email requis'); return }
    if (joursAvant.length === 0) { setError('Sélectionnez au moins un délai'); return }
    setError(null)
    startTransition(async () => {
      const res = await saveRappelSettings({ email_dest: email.trim(), jours_avant: joursAvant, actif })
      if (res?.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl p-5 space-y-5">
      {/* Actif / inactif */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm text-[#1c1917]">Rappels activés</div>
          <div className="text-[12px] text-[#78716c] mt-0.5">Un email est envoyé chaque matin à 8h</div>
        </div>
        <button
          type="button"
          onClick={() => setActif(a => !a)}
          className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${actif ? 'bg-primary' : 'bg-[#d6d3d1]'}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${actif ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Email */}
      <div>
        <label className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-1.5 block">
          Email de réception
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="vous@example.com"
          className="w-full border border-[#d6d3d1] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {/* Délais */}
      <div>
        <label className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-2 block">
          Envoyer un rappel…
        </label>
        <div className="flex flex-wrap gap-2">
          {DELAIS_OPTIONS.map(j => (
            <button
              key={j}
              type="button"
              onClick={() => toggleJour(j)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                joursAvant.includes(j)
                  ? 'bg-primary text-white border-primary'
                  : 'border-[#e7e5e4] text-[#78716c] hover:border-[#c7c3c0]'
              }`}
            >
              J-{j}
            </button>
          ))}
          <button
            type="button"
            onClick={() => toggleJour(0)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              joursAvant.includes(0)
                ? 'bg-primary text-white border-primary'
                : 'border-[#e7e5e4] text-[#78716c] hover:border-[#c7c3c0]'
            }`}
          >
            Jour J
          </button>
        </div>
        <p className="text-[11.5px] text-[#a8a29e] mt-2">
          Délais sélectionnés : {joursAvant.length === 0 ? 'aucun' : joursAvant.map(j => j === 0 ? 'Jour J' : `J-${j}`).join(', ')}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
          saved
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50'
        }`}
      >
        {isPending ? 'Enregistrement...' : saved ? '✓ Enregistré' : 'Enregistrer'}
      </button>
    </div>
  )
}
