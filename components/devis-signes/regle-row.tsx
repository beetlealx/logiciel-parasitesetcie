'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateRegle } from '@/app/actions/devis-signes'

interface Regle {
  intervention_type: string
  label: string
  keywords: string[]
  schedule_offsets: number[]
  default_billing: 'par_passage' | 'par_contrat'
}

export default function RegleRow({ regle }: { regle: Regle }) {
  const [keywords, setKeywords] = useState(regle.keywords.join(', '))
  const [offsets, setOffsets] = useState(regle.schedule_offsets.join(', '))
  const [facturation, setFacturation] = useState(regle.default_billing)
  const [saving, setSaving] = useState(false)
  const dirty =
    keywords !== regle.keywords.join(', ') ||
    offsets !== regle.schedule_offsets.join(', ') ||
    facturation !== regle.default_billing

  async function save() {
    setSaving(true)
    const r = await updateRegle(regle.intervention_type, { keywords, offsets, facturation })
    setSaving(false)
    if (r.ok) toast.success(`${regle.label} enregistré`)
    else toast.error(r.error)
  }

  const input = 'w-full px-2.5 py-1.5 border border-[#d6d3d1] rounded-lg text-[12.5px] focus:outline-none focus:border-primary bg-white'
  return (
    <div className="py-3 grid grid-cols-1 md:grid-cols-[120px_1fr_110px_130px_auto] gap-2 items-center">
      <div className="font-medium text-[13px]">{regle.label}</div>
      <input aria-label="Mots-clés" className={input} value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Mots-clés" />
      <input aria-label="Passages (jours après signature)" className={input} value={offsets} onChange={e => setOffsets(e.target.value)} placeholder="0, 15" />
      <select aria-label="Facturation" className={input} value={facturation} onChange={e => setFacturation(e.target.value as Regle['default_billing'])}>
        <option value="par_passage">Par passage</option>
        <option value="par_contrat">Par contrat</option>
      </select>
      <button type="button" onClick={save} disabled={!dirty || saving}
        className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-30">
        {saving ? '…' : 'Enregistrer'}
      </button>
    </div>
  )
}
