'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateMembre } from '@/app/actions/parametres'

interface Membre {
  id: string
  email: string
  full_name: string | null
  role: 'gerant' | 'technicien'
  certibiocide: string | null
  active: boolean
}

export default function MembreRow({ membre, isSelf }: { membre: Membre; isSelf: boolean }) {
  const [fullName, setFullName] = useState(membre.full_name ?? '')
  const [role, setRole] = useState(membre.role)
  const [certibiocide, setCertibiocide] = useState(membre.certibiocide ?? '')
  const [active, setActive] = useState(membre.active)
  const [saving, setSaving] = useState(false)
  const dirty =
    fullName !== (membre.full_name ?? '') ||
    role !== membre.role ||
    certibiocide !== (membre.certibiocide ?? '') ||
    active !== membre.active

  async function save() {
    setSaving(true)
    const r = await updateMembre(membre.id, { full_name: fullName, role, certibiocide, active })
    setSaving(false)
    if (r.ok) toast.success('Profil enregistré')
    else toast.error(r.error)
  }

  const input = 'w-full px-2.5 py-1.5 border border-[#d6d3d1] rounded-lg text-[12.5px] focus:outline-none focus:border-primary bg-white'
  return (
    <div className="py-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_130px_140px_90px_auto] gap-2 items-center">
      <div className="text-[12.5px] text-[#57534e] truncate">{membre.email}{isSelf && ' (vous)'}</div>
      <input aria-label="Nom affiché" className={input} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nom affiché" />
      <select aria-label="Rôle" className={input} value={role} disabled={isSelf} onChange={e => setRole(e.target.value as Membre['role'])}>
        <option value="technicien">Technicien</option>
        <option value="gerant">Gérant</option>
      </select>
      <input aria-label="N° Certibiocide" className={input} value={certibiocide} onChange={e => setCertibiocide(e.target.value)} placeholder="N° Certibiocide" />
      <label className="flex items-center gap-1.5 text-[12.5px] text-[#57534e]">
        <input type="checkbox" checked={active} disabled={isSelf} onChange={e => setActive(e.target.checked)} /> Actif
      </label>
      <button type="button" onClick={save} disabled={!dirty || saving}
        className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-30">
        {saving ? '…' : 'Enregistrer'}
      </button>
    </div>
  )
}
