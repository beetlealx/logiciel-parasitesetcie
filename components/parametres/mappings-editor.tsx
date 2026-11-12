'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { addProductMapping, deleteProductMapping } from '@/app/actions/parametres'

interface Props {
  mappings: { dolibarr_product_ref: string; prestation_code: string }[]
  types: { code: string; label: string }[]
}

export default function MappingsEditor({ mappings, types }: Props) {
  const router = useRouter()
  const [ref, setRef] = useState('')
  const [code, setCode] = useState(types[0]?.code ?? '')
  const label = (c: string) => types.find(t => t.code === c)?.label ?? c

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const r = await addProductMapping(ref, code)
    if (r.ok) { setRef(''); router.refresh() } else toast.error(r.error)
  }

  async function remove(r: string) {
    await deleteProductMapping(r)
    router.refresh()
  }

  return (
    <div className="py-2 space-y-3">
      {mappings.length > 0 ? (
        <div className="divide-y divide-[#f5f5f4]">
          {mappings.map(m => (
            <div key={m.dolibarr_product_ref} className="py-2 flex items-center gap-3 text-[13px]">
              <span className="font-mono w-44 truncate">{m.dolibarr_product_ref}</span>
              <span className="flex-1 text-[#57534e]">→ {label(m.prestation_code)}</span>
              <button type="button" onClick={() => remove(m.dolibarr_product_ref)} className="text-[12px] text-[#a8a29e] hover:text-red-600">Retirer</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-[#a8a29e]">Aucune correspondance : les lignes sont reconnues par mots-clés.</p>
      )}
      <form onSubmit={add} className="flex items-center gap-2 flex-wrap">
        <input
          value={ref}
          onChange={e => setRef(e.target.value)}
          placeholder="Réf. produit Dolibarr"
          className="w-48 px-2.5 py-1.5 border border-[#d6d3d1] rounded-lg text-[12.5px] font-mono focus:outline-none focus:border-primary"
        />
        <select value={code} onChange={e => setCode(e.target.value)} className="px-2.5 py-1.5 border border-[#d6d3d1] rounded-lg text-[12.5px] bg-white">
          {types.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
        </select>
        <button type="submit" disabled={!ref.trim()} className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg border border-[#d6d3d1] hover:bg-[#f5f5f4] disabled:opacity-40">
          Ajouter
        </button>
      </form>
    </div>
  )
}
