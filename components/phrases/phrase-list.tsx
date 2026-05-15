'use client'

import { useState } from 'react'
import { createPhrase, updatePhrase, deletePhrase, type PhraseTemplate } from '@/app/actions/phrases'

export default function PhraseList({ initialPhrases }: { initialPhrases: PhraseTemplate[] }) {
  const [phrases, setPhrases] = useState<PhraseTemplate[]>(initialPhrases)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ label: '', content: '' })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newDraft, setNewDraft] = useState({ label: '', content: '' })
  const [saving, setSaving] = useState(false)

  // --- Add ---
  async function handleAdd() {
    if (!newDraft.label.trim() || !newDraft.content.trim()) return
    setSaving(true)
    await createPhrase(newDraft.label, newDraft.content)
    setPhrases(ps => [...ps, {
      id: crypto.randomUUID(),
      label: newDraft.label.trim(),
      content: newDraft.content.trim(),
      ordre: ps.length,
    }])
    setNewDraft({ label: '', content: '' })
    setIsAdding(false)
    setSaving(false)
  }

  // --- Edit ---
  function startEdit(phrase: PhraseTemplate) {
    setEditingId(phrase.id)
    setEditDraft({ label: phrase.label, content: phrase.content })
    setConfirmDeleteId(null)
  }

  async function handleSaveEdit() {
    if (!editingId || !editDraft.label.trim() || !editDraft.content.trim()) return
    setSaving(true)
    await updatePhrase(editingId, editDraft.label, editDraft.content)
    setPhrases(ps => ps.map(p =>
      p.id === editingId ? { ...p, label: editDraft.label.trim(), content: editDraft.content.trim() } : p
    ))
    setEditingId(null)
    setSaving(false)
  }

  // --- Delete ---
  async function handleDelete(id: string) {
    await deletePhrase(id)
    setPhrases(ps => ps.filter(p => p.id !== id))
    setConfirmDeleteId(null)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#78716c]">{phrases.length} phrase{phrases.length !== 1 ? 's' : ''} enregistrée{phrases.length !== 1 ? 's' : ''}</p>
        {!isAdding && (
          <button
            type="button"
            onClick={() => { setIsAdding(true); setEditingId(null) }}
            className="flex items-center gap-1.5 bg-primary text-white text-sm px-3 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors min-h-[40px]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nouvelle phrase
          </button>
        )}
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="bg-white border border-primary/30 rounded-xl p-4 space-y-3 shadow-sm">
          <p className="text-sm font-medium text-[#1c1917]">Nouvelle phrase</p>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1">Étiquette</label>
            <input
              type="text"
              value={newDraft.label}
              onChange={e => setNewDraft(d => ({ ...d, label: e.target.value }))}
              placeholder="Ex : Recommandation hygiène"
              maxLength={50}
              className="w-full px-3 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1">Contenu</label>
            <textarea
              value={newDraft.content}
              onChange={e => setNewDraft(d => ({ ...d, content: e.target.value }))}
              placeholder="Texte qui sera inséré dans la synthèse…"
              rows={3}
              className="w-full px-3 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setIsAdding(false); setNewDraft({ label: '', content: '' }) }}
              className="px-3 py-2 text-sm text-[#78716c] hover:text-[#1c1917] rounded-lg hover:bg-[#f5f5f4] transition-colors min-h-[36px]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newDraft.label.trim() || !newDraft.content.trim()}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[36px]"
            >
              {saving ? 'Enregistrement…' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* Phrase cards */}
      {phrases.length === 0 && !isAdding && (
        <p className="py-10 text-center text-sm text-[#a8a29e]">
          Aucune phrase enregistrée. Créez-en une pour commencer.
        </p>
      )}

      <div className="space-y-2">
        {phrases.map(phrase => (
          <div key={phrase.id} className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
            {editingId === phrase.id ? (
              /* Edit mode */
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1">Étiquette</label>
                  <input
                    type="text"
                    value={editDraft.label}
                    onChange={e => setEditDraft(d => ({ ...d, label: e.target.value }))}
                    maxLength={50}
                    className="w-full px-3 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1">Contenu</label>
                  <textarea
                    value={editDraft.content}
                    onChange={e => setEditDraft(d => ({ ...d, content: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 text-sm text-[#78716c] hover:text-[#1c1917] rounded-lg hover:bg-[#f5f5f4] transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1c1917]">{phrase.label}</p>
                  <p className="text-[13px] text-[#78716c] mt-0.5 line-clamp-2">{phrase.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(phrase)}
                    className="p-2 text-[#a8a29e] hover:text-primary hover:bg-primary/5 rounded-lg transition-colors min-h-[36px] min-w-[36px]"
                    title="Modifier"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  {confirmDeleteId === phrase.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(phrase.id)}
                        className="px-2.5 py-1.5 text-[12px] font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Confirmer
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 text-[12px] text-[#78716c] hover:text-[#1c1917] rounded-lg hover:bg-[#f5f5f4] transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(phrase.id)}
                      className="p-2 text-[#a8a29e] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors min-h-[36px] min-w-[36px]"
                      title="Supprimer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
