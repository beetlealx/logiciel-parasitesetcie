'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updatePrestationType } from '@/app/actions/parametres'
import type { PrestationTypeDef } from '@/lib/typage'

const MODULE_LABEL: Record<string, string> = {
  rongeurs: 'Plan d’appâtage',
  moustiques: 'Moustiques',
  photo: 'Rapport photo',
}

export default function TypeRow({ type }: { type: PrestationTypeDef }) {
  const [keywords, setKeywords] = useState(type.keywords.join(', '))
  const [offsets, setOffsets] = useState(type.schedule_offsets.join(', '))
  const [duree, setDuree] = useState(type.default_duration_min)
  const [facturation, setFacturation] = useState(type.default_billing)
  const [saving, setSaving] = useState(false)
  const dirty =
    keywords !== type.keywords.join(', ') ||
    offsets !== type.schedule_offsets.join(', ') ||
    duree !== type.default_duration_min ||
    facturation !== type.default_billing

  async function save() {
    setSaving(true)
    const r = await updatePrestationType(type.code, { keywords, offsets, duree, facturation })
    setSaving(false)
    if (r.ok) toast.success(`${type.label} enregistré`)
    else toast.error(r.error)
  }

  const input = 'w-full px-2.5 py-1.5 border border-[#d6d3d1] rounded-lg text-[12.5px] focus:outline-none focus:border-primary bg-white'
  return (
    <div className="py-3 grid grid-cols-1 md:grid-cols-[150px_1fr_110px_80px_150px_auto] gap-2 items-center">
      <div>
        <div className="font-medium text-[13px]">{type.label}</div>
        <div className="text-[11px] text-[#a8a29e]">{MODULE_LABEL[type.module]}</div>
      </div>
      <input aria-label="Mots-clés" className={input} value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Mots-clés" />
      <input aria-label="Passages (jours)" className={input} value={offsets} onChange={e => setOffsets(e.target.value)} placeholder="0, 15" />
      <input aria-label="Durée (min)" type="number" min={15} step={15} className={input} value={duree} onChange={e => setDuree(Number(e.target.value))} />
      <select aria-label="Facturation" className={input} value={facturation} onChange={e => setFacturation(e.target.value as PrestationTypeDef['default_billing'])}>
        <option value="par_passage">Par passage</option>
        <option value="par_contrat">Par contrat</option>
      </select>
      <button
        type="button"
        onClick={save}
        disabled={!dirty || saving}
        className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-30"
      >
        {saving ? '…' : 'Enregistrer'}
      </button>
    </div>
  )
}
