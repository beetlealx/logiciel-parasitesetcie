'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { annulerDossier, effacerAlerte, setModeFacturation } from '@/app/actions/dossiers'

interface Props {
  dossierId: string
  mode: 'par_passage' | 'par_contrat'
  statut: string
  hasAlerte: boolean
}

export default function DossierActions({ dossierId, mode, statut, hasAlerte }: Props) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void>, msg: string) {
    setBusy(true)
    await fn()
    setBusy(false)
    setConfirm(false)
    toast.success(msg)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3 flex-wrap text-[13px]">
      <label className="flex items-center gap-2 text-[#57534e]">
        Facturation
        <select
          defaultValue={mode}
          disabled={statut === 'annule' || busy}
          onChange={e => run(() => setModeFacturation(dossierId, e.target.value as Props['mode']), 'Mode de facturation enregistré')}
          className="px-2.5 py-1.5 border border-[#d6d3d1] rounded-lg bg-white"
        >
          <option value="par_passage">Une facture par passage</option>
          <option value="par_contrat">Une facture par contrat</option>
        </select>
      </label>

      {hasAlerte && (
        <button type="button" disabled={busy} onClick={() => run(() => effacerAlerte(dossierId), 'Alerte levée')}
          className="border border-[#d6d3d1] text-[#57534e] px-3 py-1.5 rounded-lg hover:bg-[#f5f5f4]">
          Lever l&apos;alerte (garder les passages)
        </button>
      )}

      {statut !== 'annule' && (
        confirm ? (
          <span className="flex items-center gap-2">
            <span className="text-red-700">Annuler les passages non réalisés ?</span>
            <button type="button" disabled={busy} onClick={() => run(() => annulerDossier(dossierId), 'Dossier annulé')}
              className="text-red-700 font-medium hover:underline">Confirmer</button>
            <button type="button" onClick={() => setConfirm(false)} className="text-[#a8a29e]">Non</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)}
            className="text-[#a8a29e] hover:text-red-600 px-1 py-1.5">
            Annuler le dossier
          </button>
        )
      )}
    </div>
  )
}
