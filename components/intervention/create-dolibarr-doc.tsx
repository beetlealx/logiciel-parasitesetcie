'use client'

'use client'

import { useState, useEffect } from 'react'
import { saveDevis, convertToFacture, validateDevis, sendDevisByEmail, getClientDevis, linkExistingDevis } from '@/app/actions/dolibarr-docs'
import type { DolibarrProduct, DocLine, DevisItem } from '@/lib/dolibarr'

const PRESTATION_BY_TYPE: Record<string, string> = {
  rats:           'Dératisation — Intervention',
  frelons_guepes: 'Destruction nid de frelons/guêpes',
  fourmis:        'Désinsectisation fourmis',
  punaises_lit:   'Traitement punaises de lit',
  cafards:        'Désinsectisation cafards',
  moustiques:     'Traitement anti-moustiques',
  mixte:          'Intervention multi-nuisibles',
}

const TVA_OPTIONS = [0, 5.5, 10, 20]

const fmtEur = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)

interface Line extends DocLine { key: string }

interface Props {
  interventionId: string
  interventionType: string
  clientName: string
  clientEmail: string | null
  interventionDate: string
  dolibarrProducts: DolibarrProduct[]
  savedLines: DocLine[] | null
  devisRef: string | null
  devisStatus: number | null
  factureRef: string | null
  onClose: () => void
  onDevisSaved: (ref: string) => void
  onDevisValidated: () => void
  onDevisLinked: (ref: string, status: number, lines: DocLine[]) => void
  onFactureCreated: (ref: string) => void
}

function toLines(saved: DocLine[] | null, interventionType: string): Line[] {
  if (saved && saved.length > 0) {
    return saved.map(l => ({ ...l, key: crypto.randomUUID() }))
  }
  return [{
    key: crypto.randomUUID(),
    fk_product: null,
    desc: PRESTATION_BY_TYPE[interventionType] ?? 'Prestation',
    qty: 1,
    subprice: 0,
    tva_tx: 10,
  }]
}

const STATUT_DEVIS: Record<number, { label: string; cls: string }> = {
  0: { label: 'Brouillon', cls: 'bg-[#f5f5f4] text-[#78716c]' },
  1: { label: 'Validé',    cls: 'bg-blue-50 text-blue-700' },
  2: { label: 'Signé',     cls: 'bg-green-50 text-green-700' },
  3: { label: 'Non signé', cls: 'bg-red-50 text-red-600' },
  4: { label: 'Facturé',   cls: 'bg-[#d1f5ed] text-[#0a5e53]' },
}

export default function CreateDolibarrDoc({
  interventionId, interventionType, clientName, clientEmail, interventionDate,
  dolibarrProducts, savedLines, devisRef: initDevisRef, devisStatus, factureRef: initFactureRef,
  onClose, onDevisSaved, onDevisValidated, onDevisLinked, onFactureCreated,
}: Props) {
  const isFacture = !!initFactureRef
  const [localDevisRef, setLocalDevisRef] = useState(initDevisRef)
  const [date, setDate] = useState(interventionDate.slice(0, 10))
  const [lines, setLines] = useState<Line[]>(() => toLines(savedLines, interventionType))
  const [productSearch, setProductSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [submitting, setSubmitting] = useState<'devis' | 'valider' | 'envoyer' | 'facture' | 'link' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [localStatus, setLocalStatus] = useState(devisStatus ?? 0)
  const isValidated = localStatus >= 1 && !isFacture

  // Picker devis existants
  const [showExisting, setShowExisting] = useState(false)
  const [existingDevis, setExistingDevis] = useState<DevisItem[]>([])
  const [loadingExisting, setLoadingExisting] = useState(false)

  async function loadExistingDevis() {
    setLoadingExisting(true)
    const result = await getClientDevis(interventionId)
    setExistingDevis(result.items)
    setLoadingExisting(false)
  }

  async function handleLinkDevis(d: DevisItem) {
    setError(null); setSubmitting('link')
    const result = await linkExistingDevis(interventionId, d.id, d.ref, d.statut)
    setSubmitting(null)
    if (!result.ok) { setError(result.error ?? 'Erreur'); return }
    const linked = result.lines ?? []
    setLocalDevisRef(d.ref)
    setLocalStatus(d.statut >= 1 ? 1 : 0)
    setLines(linked.map(l => ({ ...l, key: crypto.randomUUID() })))
    setShowExisting(false)
    setEmailSent(false)
    onDevisLinked(d.ref, d.statut, linked)
  }

  const filteredProducts = dolibarrProducts.filter(p =>
    productSearch.length < 2 ||
    p.label.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.ref.toLowerCase().includes(productSearch.toLowerCase())
  )

  function updateLine(key: string, patch: Partial<Line>) {
    setLines(ls => ls.map(l => l.key === key ? { ...l, ...patch } : l))
  }
  function removeLine(key: string) {
    setLines(ls => ls.filter(l => l.key !== key))
  }
  function addProduct(p: DolibarrProduct) {
    setLines(ls => [...ls, { key: crypto.randomUUID(), fk_product: p.id, desc: p.label, qty: 1, subprice: p.price, tva_tx: p.tva_tx }])
    setProductSearch(''); setShowPicker(false)
  }
  function addFreeLine() {
    setLines(ls => [...ls, { key: crypto.randomUUID(), fk_product: null, desc: '', qty: 1, subprice: 0, tva_tx: 20 }])
  }

  function toDocLines(): DocLine[] {
    return lines.map(({ key: _k, ...l }) => l)
  }

  async function handleSaveDevis() {
    setError(null); setSubmitting('devis')
    const ts = Math.floor(new Date(date).getTime() / 1000)
    const result = await saveDevis(interventionId, ts, toDocLines())
    setSubmitting(null)
    if (!result.ok) { setError(result.error ?? 'Erreur'); return }
    setLocalDevisRef(result.ref!)
    setLocalStatus(0)
    onDevisSaved(result.ref!)
  }

  async function handleValidateDevis() {
    setError(null); setSubmitting('valider')
    const result = await validateDevis(interventionId)
    setSubmitting(null)
    if (!result.ok) { setError(result.error ?? 'Erreur'); return }
    setLocalStatus(1)
    onDevisValidated()
  }

  async function handleSendByEmail() {
    setError(null); setSubmitting('envoyer')
    const result = await sendDevisByEmail(interventionId)
    setSubmitting(null)
    if (!result.ok) { setError(result.error ?? 'Erreur'); return }
    setEmailSent(true)
  }

  async function handleConvertFacture() {
    setError(null); setSubmitting('facture')
    const ts = Math.floor(new Date(date).getTime() / 1000)
    const result = await convertToFacture(interventionId, ts)
    setSubmitting(null)
    if (!result.ok) { setError(result.error ?? 'Erreur'); return }
    onFactureCreated(result.ref!)
  }

  const totalHT  = lines.reduce((s, l) => s + l.qty * l.subprice, 0)
  const totalTTC = lines.reduce((s, l) => s + l.qty * l.subprice * (1 + l.tva_tx / 100), 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e5e4]">
          <div>
            <h2 className="font-semibold text-[#1c1917]">Devis / Facture</h2>
            <p className="text-[12px] text-[#a8a29e] mt-0.5">{clientName}</p>
          </div>
          <div className="flex items-center gap-2">
            {localDevisRef && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isValidated ? 'bg-blue-100 text-blue-800' : 'bg-blue-50 text-blue-700'}`}>
                {localDevisRef}{isValidated ? ' · Validé' : ''}
              </span>
            )}
            {initFactureRef && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#d1f5ed] text-[#0a5e53] font-medium">{initFactureRef}</span>
            )}
            <button type="button" onClick={onClose} className="p-2 text-[#a8a29e] hover:text-[#57534e] rounded-lg hover:bg-[#f5f5f4]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Facturée → read-only notice */}
          {isFacture && (
            <div className="flex items-center gap-2 bg-[#d1f5ed] rounded-xl px-4 py-3 text-sm text-[#0a5e53] font-medium">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Facture créée — document non modifiable.
            </div>
          )}

          {/* Validé → notice */}
          {isValidated && (
            <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800 font-medium">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Devis validé — vous pouvez l'envoyer au client ou le transformer en facture.
            </div>
          )}

          {/* Email envoyé */}
          {emailSent && (
            <div className="flex items-center gap-2 bg-green-50 rounded-xl px-4 py-3 text-sm text-green-800 font-medium">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Devis envoyé à {clientEmail}.
            </div>
          )}

          {/* Lier un devis existant — visible si aucun devis lié et pas de facture */}
          {!localDevisRef && !isFacture && (
            <div>
              <button
                type="button"
                onClick={() => { const next = !showExisting; setShowExisting(next); if (next) loadExistingDevis() }}
                className="flex items-center gap-1.5 text-sm text-[#78716c] font-medium hover:text-[#1c1917] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                Lier un devis existant de Dolibarr
              </button>

              {showExisting && (
                <div className="mt-2 border border-[#e7e5e4] rounded-xl overflow-hidden bg-white">
                  {loadingExisting ? (
                    <p className="px-4 py-3 text-sm text-[#a8a29e]">Chargement…</p>
                  ) : existingDevis.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-[#a8a29e]">Aucun devis trouvé pour ce client.</p>
                  ) : (
                    <div className="divide-y divide-[#f5f5f4] max-h-56 overflow-y-auto">
                      {existingDevis.map(d => {
                        const statut = STATUT_DEVIS[d.statut] ?? STATUT_DEVIS[0]
                        const dateStr = d.date ? new Date(d.date * 1000).toLocaleDateString('fr-FR') : '—'
                        const fmtEur = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)
                        return (
                          <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#fafaf9] gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[13px] font-medium text-[#1c1917]">{d.ref}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statut.cls}`}>{statut.label}</span>
                              </div>
                              <p className="text-[12px] text-[#a8a29e] mt-0.5">{dateStr} · {fmtEur(d.total_ttc)} TTC</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleLinkDevis(d)}
                              disabled={submitting === 'link'}
                              className="shrink-0 px-3 py-1.5 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 disabled:opacity-50 transition-colors"
                            >
                              {submitting === 'link' ? '…' : 'Lier'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Séparateur si aucun devis */}
          {!localDevisRef && !isFacture && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#e7e5e4]" />
              <span className="text-[11px] text-[#a8a29e] font-medium">ou créer un nouveau devis</span>
              <div className="flex-1 h-px bg-[#e7e5e4]" />
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={isFacture}
              className="px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px] disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
            />
          </div>

          {/* Lines */}
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-2">Lignes</label>
            <div className="space-y-2">
              {lines.map(line => (
                <div key={line.key} className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={line.desc}
                      onChange={e => updateLine(line.key, { desc: e.target.value })}
                      placeholder="Description"
                      disabled={isFacture}
                      className="flex-1 px-3 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[40px] disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
                    />
                    {!isFacture && (
                      <button type="button" onClick={() => removeLine(line.key)}
                        className="p-2 text-[#c7c3c0] hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0 min-w-[40px] flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-[#a8a29e]">Qté</label>
                      <input type="number" min="0.01" step="0.01" value={line.qty}
                        onChange={e => updateLine(line.key, { qty: Number(e.target.value) })}
                        disabled={isFacture}
                        className="w-16 px-2 py-1.5 border border-[#d6d3d1] rounded-lg text-sm text-center focus:outline-none focus:border-primary min-h-[36px] disabled:bg-[#f5f5f4]" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-[#a8a29e]">PU HT (€)</label>
                      <input type="number" min="0" step="0.01" value={line.subprice}
                        onChange={e => updateLine(line.key, { subprice: Number(e.target.value) })}
                        disabled={isFacture}
                        className="w-24 px-2 py-1.5 border border-[#d6d3d1] rounded-lg text-sm text-right focus:outline-none focus:border-primary min-h-[36px] disabled:bg-[#f5f5f4]" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-[#a8a29e]">TVA</label>
                      <select value={line.tva_tx}
                        onChange={e => updateLine(line.key, { tva_tx: Number(e.target.value) })}
                        disabled={isFacture}
                        className="px-2 py-1.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary min-h-[36px] bg-white disabled:bg-[#f5f5f4]">
                        {TVA_OPTIONS.map(t => <option key={t} value={t}>{t}%</option>)}
                      </select>
                    </div>
                    <span className="ml-auto text-[13px] font-medium text-[#57534e]">
                      {fmtEur(line.qty * line.subprice * (1 + line.tva_tx / 100))}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add buttons */}
            {!isFacture && (
              <div className="mt-2 flex flex-col gap-2">
                {dolibarrProducts.length > 0 && (
                  <div>
                    <button type="button" onClick={() => setShowPicker(v => !v)}
                      className="flex items-center gap-1.5 text-sm text-primary font-medium hover:text-primary/80 transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Ajouter depuis le catalogue Dolibarr
                    </button>
                    {showPicker && (
                      <div className="mt-2 border border-[#e7e5e4] rounded-xl overflow-hidden bg-white">
                        <div className="p-2 border-b border-[#f5f5f4]">
                          <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                            placeholder="Rechercher un produit…" autoFocus
                            className="w-full px-3 py-2 text-sm border border-[#d6d3d1] rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-[#f5f5f4]">
                          {filteredProducts.slice(0, 30).map(p => (
                            <button key={p.id} type="button" onClick={() => addProduct(p)}
                              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#f5f5f4] text-left transition-colors">
                              <span className="text-[13px] text-[#1c1917]">
                                <span className="font-mono text-[11px] text-[#a8a29e] mr-2">{p.ref}</span>{p.label}
                              </span>
                              <span className="text-[12px] text-[#78716c] shrink-0 ml-2">{fmtEur(p.price)} HT</span>
                            </button>
                          ))}
                          {filteredProducts.length === 0 && (
                            <p className="px-3 py-3 text-sm text-[#a8a29e]">Aucun produit trouvé.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <button type="button" onClick={addFreeLine}
                  className="flex items-center gap-1.5 text-sm text-[#78716c] font-medium hover:text-[#1c1917] transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Ajouter une ligne libre
                </button>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl px-4 py-3 flex justify-end gap-8 text-sm">
            <div className="text-right">
              <p className="text-[11px] text-[#a8a29e] uppercase tracking-wide">Total HT</p>
              <p className="font-medium text-[#1c1917]">{fmtEur(totalHT)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#a8a29e] uppercase tracking-wide">Total TTC</p>
              <p className="font-semibold text-[#1c1917] text-[15px]">{fmtEur(totalTTC)}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-[#e7e5e4] bg-[#fafaf9]">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 text-sm text-[#78716c] hover:text-[#1c1917] rounded-lg hover:bg-[#f5f5f4] transition-colors min-h-[44px]">
            {isFacture ? 'Fermer' : 'Annuler'}
          </button>

          {!isFacture && (
            <div className="flex flex-wrap gap-2 justify-end">
              {/* Transformer en facture — dispo dès qu'un devis existe */}
              {localDevisRef && (
                <button type="button" onClick={handleConvertFacture}
                  disabled={!!submitting}
                  className="px-4 py-2.5 bg-[#0a5e53] text-white text-sm font-medium rounded-lg hover:bg-[#0a5e53]/90 disabled:opacity-50 transition-colors min-h-[44px]">
                  {submitting === 'facture' ? 'Création…' : 'Transformer en facture'}
                </button>
              )}

              {/* Envoyer au client — dispo quand validé */}
              {isValidated && clientEmail && (
                <button type="button" onClick={handleSendByEmail}
                  disabled={!!submitting || emailSent}
                  className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[44px]">
                  {submitting === 'envoyer' ? 'Envoi…' : emailSent ? 'Envoyé ✓' : 'Envoyer au client'}
                </button>
              )}

              {/* Valider le devis — dispo quand devis existe et pas encore validé */}
              {localDevisRef && !isValidated && (
                <button type="button" onClick={handleValidateDevis}
                  disabled={!!submitting}
                  className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[44px]">
                  {submitting === 'valider' ? 'Validation…' : 'Valider le devis'}
                </button>
              )}

              {/* Créer / mettre à jour le devis */}
              <button type="button" onClick={handleSaveDevis}
                disabled={!!submitting || lines.length === 0}
                className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px]">
                {submitting === 'devis' ? 'Enregistrement…'
                  : localDevisRef ? 'Mettre à jour le devis' : 'Créer le devis'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
