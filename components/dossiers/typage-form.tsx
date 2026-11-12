'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { typerDossier, type AffectationLigne } from '@/app/actions/dossiers'
import type { LigneTypee } from '@/lib/typage'

interface Props {
  dossierId: string
  lignes: LigneTypee[]
  types: { code: string; label: string }[]
  mode: 'par_passage' | 'par_contrat'
}

interface Etat {
  code: string // '' = non rattachée
  memoriser: boolean
  motCle: string
}

export default function TypageForm({ dossierId, lignes, types, mode: initialMode }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState(initialMode)
  const [saving, setSaving] = useState(false)
  const [etats, setEtats] = useState<Etat[]>(
    lignes.map(l => ({ code: l.type_codes[0] ?? '', memoriser: !!l.product_ref, motCle: '' })),
  )

  function set(i: number, patch: Partial<Etat>) {
    setEtats(es => es.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  }

  async function handleSubmit() {
    const affectations: AffectationLigne[] = etats.map((e, index) => ({
      index,
      // une ligne multi-types déjà détectée garde ses types si on ne la change pas
      type_codes: e.code === (lignes[index].type_codes[0] ?? '') && lignes[index].type_codes.length > 1
        ? lignes[index].type_codes
        : e.code ? [e.code] : [],
      memoriserProduit: e.memoriser && !!e.code && lignes[index].source !== 'produit',
      motCle: e.code && lignes[index].type_codes.length === 0 ? e.motCle : undefined,
    }))
    setSaving(true)
    const r = await typerDossier(dossierId, affectations, mode)
    setSaving(false)
    if (r.ok) {
      toast.success(r.passages ? `${r.passages} passage(s) créé(s)` : 'Typage enregistré')
      router.refresh()
    } else {
      toast.error(r.error)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-[#57534e]">
        Choisissez le type de prestation de chaque ligne. Les frais (déplacement, remise…) restent « non rattachés ».
      </p>
      <div className="divide-y divide-[#f5f5f4]">
        {lignes.map((l, i) => {
          const e = etats[i]
          const nouveau = l.type_codes.length === 0
          return (
            <div key={i} className="py-3 grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2 items-start">
              <div className="min-w-0 text-[13px]">
                <div className="font-medium">{l.label || l.description.replace(/<[^>]+>/g, '').slice(0, 80) || 'Ligne'}</div>
                <div className="text-[12px] text-[#a8a29e]">
                  {l.product_ref && <span className="font-mono mr-2">{l.product_ref}</span>}
                  {l.qty} × · {l.total_ht.toFixed(2)} € HT
                  {l.type_codes.length > 1 && <span className="ml-2">({l.type_codes.length} types détectés)</span>}
                </div>
              </div>
              <div className="space-y-1.5">
                <select
                  value={e.code}
                  onChange={ev => set(i, { code: ev.target.value })}
                  className={`w-full px-2.5 py-2 border rounded-lg text-[13px] bg-white min-h-[40px] focus:outline-none focus:border-primary ${
                    e.code ? 'border-[#d6d3d1]' : l.ignoree ? 'border-[#e7e5e4] text-[#a8a29e]' : 'border-amber-300'
                  }`}
                >
                  <option value="">— Non rattachée —</option>
                  {types.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
                {e.code && nouveau && l.product_ref && (
                  <label className="flex items-center gap-1.5 text-[11.5px] text-[#57534e]">
                    <input type="checkbox" checked={e.memoriser} onChange={ev => set(i, { memoriser: ev.target.checked })} />
                    Mémoriser pour le produit {l.product_ref}
                  </label>
                )}
                {e.code && nouveau && !l.product_ref && (
                  <input
                    value={e.motCle}
                    onChange={ev => set(i, { motCle: ev.target.value })}
                    placeholder="Mot-clé à mémoriser (optionnel)"
                    className="w-full px-2.5 py-1.5 border border-[#e7e5e4] rounded-lg text-[12px] focus:outline-none focus:border-primary"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <label className="flex items-center gap-2 text-[13px] text-[#57534e]">
          Facturation
          <select
            value={mode}
            onChange={ev => setMode(ev.target.value as Props['mode'])}
            className="px-2.5 py-1.5 border border-[#d6d3d1] rounded-lg text-[13px] bg-white"
          >
            <option value="par_passage">Une facture par passage</option>
            <option value="par_contrat">Une facture par contrat</option>
          </select>
        </label>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || etats.every(e => !e.code)}
          className="bg-primary text-white text-sm px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
        >
          {saving ? 'Création…' : 'Valider et créer les passages'}
        </button>
      </div>
    </div>
  )
}
