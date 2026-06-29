'use client'

import { useState, useTransition } from 'react'
import { upsertTechnicien, deleteTechnicien } from '@/app/actions/techniciens'
import type { Technicien } from '@/app/actions/techniciens'

const EMPTY: Omit<Technicien, 'id'> = {
  nom: '', telephone: null, email: null,
  numero_certibiocide: null, certibiocide_expire: null, actif: true,
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function CertibiocideStatus({ expire }: { expire: string | null }) {
  const days = daysUntil(expire)
  if (days === null) return <span className="text-[11px] text-[#a8a29e]">Non renseigné</span>
  if (days < 0) return <span className="text-[11px] font-semibold text-red-600">Expiré</span>
  if (days <= 60) return <span className="text-[11px] font-semibold text-amber-600">Expire dans {days}j</span>
  return <span className="text-[11px] text-emerald-700">Valide ({days}j)</span>
}

interface FormState extends Omit<Technicien, 'id'> { id?: string }

export default function TechniciensManager({ initial }: { initial: Technicien[] }) {
  const [techs, setTechs] = useState<Technicien[]>(initial)
  const [editing, setEditing] = useState<FormState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openNew() {
    setEditing({ ...EMPTY })
    setError(null)
  }

  function openEdit(t: Technicien) {
    setEditing({ ...t })
    setError(null)
  }

  function handleSave() {
    if (!editing || !editing.nom.trim()) { setError('Nom requis'); return }
    setError(null)
    startTransition(async () => {
      const res = await upsertTechnicien(editing)
      if (res?.error) { setError(res.error); return }
      // Refresh list
      const { getTechniciens } = await import('@/app/actions/techniciens')
      setTechs(await getTechniciens())
      setEditing(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer ce technicien ?')) return
    startTransition(async () => {
      await deleteTechnicien(id)
      setTechs(prev => prev.filter(t => t.id !== id))
    })
  }

  // Alerts
  const alerts = techs.filter(t => t.actif && t.certibiocide_expire && (daysUntil(t.certibiocide_expire) ?? 999) <= 60)

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="text-[12px] font-semibold text-amber-800 mb-1">Certibiocide à renouveler</div>
          {alerts.map(t => (
            <div key={t.id} className="text-[12px] text-amber-700">
              {t.nom} — expire le {new Date(t.certibiocide_expire!).toLocaleDateString('fr-FR')}
              {(daysUntil(t.certibiocide_expire) ?? 1) < 0 ? ' (expiré)' : ''}
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl divide-y divide-[#f5f5f4]">
        {techs.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[#a8a29e]">Aucun technicien. Ajoutez le premier.</div>
        )}
        {techs.map(t => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[13.5px] text-[#1c1917]">{t.nom}</span>
                {!t.actif && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f5f5f4] text-[#a8a29e] uppercase tracking-wide">Inactif</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {t.telephone && <span className="text-[11.5px] text-[#78716c]">{t.telephone}</span>}
                {t.numero_certibiocide && (
                  <span className="text-[11px] font-mono text-[#a8a29e]">CB {t.numero_certibiocide}</span>
                )}
                <CertibiocideStatus expire={t.certibiocide_expire} />
              </div>
            </div>
            <button
              onClick={() => openEdit(t)}
              className="text-[12px] text-[#78716c] hover:text-primary px-2 py-1 rounded hover:bg-[#f5f5f4] transition-colors"
            >
              Modifier
            </button>
            <button
              onClick={() => handleDelete(t.id)}
              className="text-[12px] text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={openNew}
        className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Ajouter un technicien
      </button>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold text-[15px]">{editing.id ? 'Modifier' : 'Nouveau'} technicien</h2>

            <div>
              <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-1.5">Nom *</label>
              <input type="text" value={editing.nom} onChange={e => setEditing(p => ({ ...p!, nom: e.target.value }))}
                placeholder="Prénom Nom" className="input-base" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-1.5">Téléphone</label>
                <input type="tel" value={editing.telephone ?? ''} onChange={e => setEditing(p => ({ ...p!, telephone: e.target.value }))}
                  placeholder="06 …" className="input-base" />
              </div>
              <div>
                <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-1.5">Email</label>
                <input type="email" value={editing.email ?? ''} onChange={e => setEditing(p => ({ ...p!, email: e.target.value }))}
                  placeholder="prenom@…" className="input-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-1.5">N° Certibiocide</label>
                <input type="text" value={editing.numero_certibiocide ?? ''} onChange={e => setEditing(p => ({ ...p!, numero_certibiocide: e.target.value }))}
                  placeholder="CB-XXXXXX" className="input-base" />
              </div>
              <div>
                <label className="block text-[10.5px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-1.5">Expire le</label>
                <input type="date" value={editing.certibiocide_expire ?? ''} onChange={e => setEditing(p => ({ ...p!, certibiocide_expire: e.target.value || null }))}
                  className="w-full border border-[#d6d3d1] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEditing(p => ({ ...p!, actif: !p!.actif }))}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${editing.actif ? 'bg-primary' : 'bg-[#d6d3d1]'}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${editing.actif ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-[#57534e]">Actif</span>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-lg border border-[#e7e5e4] text-sm text-[#57534e] hover:bg-[#f5f5f4] transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={isPending}
                className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
