'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { envoyerProtocoleAction } from '@/app/actions/protocole'

interface Props {
  interventionId: string
  titre: string
  url: string
  clientEmail: string | null
  envoyeAt: string | null
}

/** Fiche de préparation du client : état d'envoi, aperçu, envoi / renvoi manuel. */
export default function ProtocoleButton({ interventionId, titre, url, clientEmail, envoyeAt: initial }: Props) {
  const [envoyeAt, setEnvoyeAt] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    const r = await envoyerProtocoleAction(interventionId)
    setBusy(false)
    if (r.ok) {
      setEnvoyeAt(r.at ?? new Date().toISOString())
      toast.success(`Fiche envoyée à ${r.email}`)
    } else {
      toast.error(r.error)
    }
  }

  const date = envoyeAt
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(envoyeAt))
    : null

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap text-[13px]">
      <div className="flex-1 min-w-[200px]">
        <div className="font-medium text-[#1c1917]">Fiche de préparation — {titre}</div>
        <div className="text-[12px] text-[#78716c]">
          {date
            ? `Envoyée au client le ${date}`
            : clientEmail
              ? 'Envoi automatique quelques jours avant l’intervention'
              : 'Ajoutez l’e-mail du client pour l’envoyer'}
        </div>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">Voir</a>
      <button
        type="button"
        onClick={send}
        disabled={busy || !clientEmail}
        className="border border-[#d6d3d1] text-[#57534e] px-3 py-1.5 rounded-lg font-medium hover:bg-[#f5f5f4] disabled:opacity-40 min-h-[36px]"
      >
        {busy ? 'Envoi…' : date ? 'Renvoyer' : 'Envoyer maintenant'}
      </button>
    </div>
  )
}
