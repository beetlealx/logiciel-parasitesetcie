'use client'

import { useState, useTransition } from 'react'
import { addBiocideProduct, removeBiocideProduct, updateBiocideProduct, addMouvement, type BiocideProduct } from '@/app/actions/biocides'
import { INTERVENTION_TEMPLATES, INTERVENTION_TYPE_ORDER, getColor } from '@/lib/intervention-templates'

const TYPES = INTERVENTION_TYPE_ORDER.filter(t => t !== 'mixte')
const UNITES = ['g', 'kg', 'mL', 'L', 'pièce(s)', 'dose(s)']

function StockBar({ product }: { product: BiocideProduct }) {
  if (product.seuil_alerte <= 0) return null
  const pct = Math.min((product.quantite / (product.seuil_alerte * 2)) * 100, 100)
  const color = product.quantite <= 0 ? '#ef4444' : product.quantite <= product.seuil_alerte ? '#f59e0b' : '#10b981'
  return (
    <div className="px-4 pb-3">
      <div className="h-1.5 bg-[#f5f5f4] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function BiocidesManager({ initialProducts }: { initialProducts: BiocideProduct[] }) {
  const [products, setProducts] = useState<BiocideProduct[]>(initialProducts)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<BiocideProduct>>({})
  const [mouvementId, setMouvementId] = useState<string | null>(null)
  const [mvForm, setMvForm] = useState({ type: 'entree' as 'entree' | 'sortie', quantite: '', note: '' })
  const [mvError, setMvError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function grouped(type: string) {
    return products.filter(p => p.type_intervention === type)
  }

  function handleAdd(type: string) {
    const nom = drafts[type]?.trim()
    if (!nom) return
    const temp: BiocideProduct = {
      id: crypto.randomUUID(), type_intervention: type, nom, ordre: 999,
      numero_amm: null, substance_active: null, dosage_defaut: null, delai_reentree: null, mode_application: null,
      unite: 'g', quantite: 0, seuil_alerte: 0,
    }
    setProducts(ps => [...ps, temp])
    setDrafts(d => ({ ...d, [type]: '' }))
    startTransition(() => addBiocideProduct(type, nom))
  }

  function handleRemove(product: BiocideProduct) {
    setProducts(ps => ps.filter(p => p.id !== product.id))
    startTransition(() => removeBiocideProduct(product.id))
  }

  function startEdit(product: BiocideProduct) {
    setEditing(product.id)
    setEditData({
      numero_amm: product.numero_amm ?? '',
      substance_active: product.substance_active ?? '',
      dosage_defaut: product.dosage_defaut ?? '',
      delai_reentree: product.delai_reentree ?? '',
      mode_application: product.mode_application ?? '',
      unite: product.unite ?? 'g',
      seuil_alerte: product.seuil_alerte ?? 0,
    })
  }

  function saveEdit(product: BiocideProduct) {
    const patch = {
      numero_amm: (editData.numero_amm as string) || null,
      substance_active: (editData.substance_active as string) || null,
      dosage_defaut: (editData.dosage_defaut as string) || null,
      delai_reentree: (editData.delai_reentree as string) || null,
      mode_application: (editData.mode_application as string) || null,
      unite: (editData.unite as string) || 'g',
      seuil_alerte: Number(editData.seuil_alerte) || 0,
    }
    setProducts(ps => ps.map(p => p.id === product.id ? { ...p, ...patch } : p))
    setEditing(null)
    startTransition(() => updateBiocideProduct(product.id, patch))
  }

  function handleMouvement(productId: string) {
    if (!mvForm.quantite || Number(mvForm.quantite) <= 0) { setMvError('Quantité invalide'); return }
    setMvError(null)
    startTransition(async () => {
      const res = await addMouvement({
        biocide_product_id: productId,
        type: mvForm.type,
        quantite: Number(mvForm.quantite),
        note: mvForm.note.trim() || null,
      })
      if (res?.error) { setMvError(res.error); return }
      setMouvementId(null)
      setMvForm({ type: 'entree', quantite: '', note: '' })
      setProducts(ps => ps.map(p => {
        if (p.id !== productId) return p
        const delta = mvForm.type === 'entree' ? Number(mvForm.quantite) : -Number(mvForm.quantite)
        return { ...p, quantite: p.quantite + delta }
      }))
    })
  }

  const alertCount = products.filter(p => p.seuil_alerte > 0 && p.quantite <= p.seuil_alerte).length

  return (
    <div className="space-y-6">
      {alertCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {alertCount} produit{alertCount > 1 ? 's' : ''} en stock bas ou épuisé{alertCount > 1 ? 's' : ''}
        </div>
      )}

      {TYPES.map(type => {
        const tpl = INTERVENTION_TEMPLATES[type as keyof typeof INTERVENTION_TEMPLATES]
        const color = getColor(type)
        const list = grouped(type)

        return (
          <div key={type} className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#f5f5f4] bg-[#fafaf9]">
              <span className="text-base">{tpl.icon}</span>
              <h2 className="font-medium text-sm text-[#1c1917]">{tpl.label}</h2>
              <span className="ml-auto text-[12px] text-[#a8a29e]">{list.length} produit{list.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="divide-y divide-[#f5f5f4]">
              {list.length === 0 && (
                <p className="px-4 py-3 text-sm text-[#a8a29e]">Aucun produit configuré.</p>
              )}
              {list.map(product => (
                <div key={product.id}>
                  {editing === product.id ? (
                    <div className="px-4 py-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'numero_amm', label: 'N° AMM', placeholder: 'ex. 2150156' },
                          { key: 'substance_active', label: 'Substance active', placeholder: 'ex. Brodifacoum 0.005%' },
                          { key: 'dosage_defaut', label: 'Dosage par défaut', placeholder: 'ex. 150g/point' },
                          { key: 'delai_reentree', label: 'Délai de réentrée', placeholder: 'ex. 2h' },
                        ].map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <label className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1 block">{label}</label>
                            <input type="text" value={(editData[key as keyof BiocideProduct] as string) ?? ''}
                              onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))}
                              placeholder={placeholder}
                              className="w-full px-2.5 py-1.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                          </div>
                        ))}
                        <div className="col-span-2">
                          <label className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1 block">Mode d&apos;application</label>
                          <input type="text" value={(editData.mode_application as string) ?? ''}
                            onChange={e => setEditData(d => ({ ...d, mode_application: e.target.value }))}
                            placeholder="ex. Pulvérisation UBV, pose d'appâts"
                            className="w-full px-2.5 py-1.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                        </div>
                        <div>
                          <label className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1 block">Unité de stock</label>
                          <select value={(editData.unite as string) ?? 'g'}
                            onChange={e => setEditData(d => ({ ...d, unite: e.target.value }))}
                            className="w-full border border-[#d6d3d1] rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
                            {UNITES.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1 block">Seuil d&apos;alerte</label>
                          <input type="number" min="0" value={editData.seuil_alerte ?? 0}
                            onChange={e => setEditData(d => ({ ...d, seuil_alerte: Number(e.target.value) }))}
                            className="w-full px-2.5 py-1.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(product)} className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors">Enregistrer</button>
                        <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition-colors">Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-[#1c1917] font-medium">{product.nom}</span>
                            {product.numero_amm && (
                              <span className="text-[11px] font-mono text-[#78716c] bg-[#f5f5f4] px-2 py-0.5 rounded">AMM {product.numero_amm}</span>
                            )}
                          </div>
                          {product.seuil_alerte > 0 && (
                            <div className={`text-[11.5px] mt-0.5 font-medium ${product.quantite <= 0 ? 'text-red-600' : product.quantite <= product.seuil_alerte ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {product.quantite} {product.unite}
                              {product.quantite <= 0 ? ' — Épuisé' : product.quantite <= product.seuil_alerte ? ' — Stock bas' : ''}
                              <span className="text-[#a8a29e] font-normal"> · alerte à {product.seuil_alerte} {product.unite}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setMouvementId(mouvementId === product.id ? null : product.id); setMvForm({ type: 'entree', quantite: '', note: '' }); setMvError(null) }}
                            className="px-2 py-1.5 text-[11px] font-medium border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] transition-colors text-[#78716c]"
                          >± Stock</button>
                          <button onClick={() => startEdit(product)} className="p-1.5 text-[#a8a29e] hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={() => handleRemove(product)} className="p-1.5 text-[#a8a29e] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      <StockBar product={product} />

                      {mouvementId === product.id && (
                        <div className="border-t border-[#f5f5f4] px-4 py-3 bg-[#fafaf9] space-y-3">
                          <div className="flex gap-2">
                            {(['entree', 'sortie'] as const).map(t => (
                              <button key={t} onClick={() => setMvForm(f => ({ ...f, type: t }))}
                                className={`flex-1 py-1.5 text-sm rounded-lg font-medium border transition-colors ${mvForm.type === t
                                  ? t === 'entree' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                                  : 'border-[#e7e5e4] text-[#78716c] hover:bg-[#f5f5f4]'}`}>
                                {t === 'entree' ? '↑ Entrée' : '↓ Sortie'}
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1 block">Quantité ({product.unite})</label>
                              <input type="number" min="0.01" step="any" value={mvForm.quantite}
                                onChange={e => setMvForm(f => ({ ...f, quantite: e.target.value }))}
                                placeholder="0"
                                className="w-full border border-[#d6d3d1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                            </div>
                            <div>
                              <label className="text-[10.5px] text-[#a8a29e] uppercase tracking-wide mb-1 block">Note</label>
                              <input type="text" value={mvForm.note}
                                onChange={e => setMvForm(f => ({ ...f, note: e.target.value }))}
                                placeholder="Réappro, utilisation…"
                                className="w-full border border-[#d6d3d1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                            </div>
                          </div>
                          {mvError && <p className="text-sm text-red-600">{mvError}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => handleMouvement(product.id)} className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary/90 transition-colors">Valider</button>
                            <button onClick={() => setMouvementId(null)} className="px-3 py-1.5 text-sm text-[#78716c] hover:text-[#1c1917] transition-colors">Annuler</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 px-4 py-3 border-t border-[#f5f5f4] bg-[#fafaf9]">
              <input type="text" value={drafts[type] ?? ''}
                onChange={e => setDrafts(d => ({ ...d, [type]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(type) }}
                placeholder="Nom du produit…"
                className="flex-1 px-3 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[38px]" />
              <button onClick={() => handleAdd(type)} disabled={!drafts[type]?.trim()}
                className="px-3 py-2 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors min-h-[38px]">
                Ajouter
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
