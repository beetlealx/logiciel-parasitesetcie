'use client'

import { useState, useRef } from 'react'
import type { PhraseTemplate } from '@/app/actions/phrases'

interface Props {
  value: string
  onChange: (value: string) => void
  phraseTemplates: PhraseTemplate[]
  interventionType?: string
  espece?: string
  disabled?: boolean
}

export default function SyntheseSection({ value, onChange, phraseTemplates, interventionType, espece, disabled }: Props) {
  const visiblePhrases = phraseTemplates.filter(p => {
    const typeOk = p.intervention_types.length === 0 || (interventionType && p.intervention_types.includes(interventionType))
    const especeOk = !p.especes || p.especes.length === 0 || (espece && p.especes.includes(espece))
    return typeOk && especeOk
  })
  const otherPhrases = phraseTemplates.filter(p => {
    const typeOk = p.intervention_types.length === 0 || (interventionType && p.intervention_types.includes(interventionType))
    const especeOk = !p.especes || p.especes.length === 0 || (espece && p.especes.includes(espece))
    return !typeOk || !especeOk
  })
  const [showPhrases, setShowPhrases] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    autoResize(e.target)
    onChange(e.target.value)
  }

  function insertPhrase(content: string) {
    const ta = textareaRef.current
    if (!ta) {
      onChange((value ? value.trimEnd() + '\n' : '') + content)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = value.slice(0, start)
    const after = value.slice(end)
    const sep = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
    const next = before + sep + content + after
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + sep.length + content.length
      ta.setSelectionRange(pos, pos)
      autoResize(ta)
    })
    setShowPhrases(false)
  }

  return (
    <div className="space-y-3">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Rédigez ici le compte rendu de l'intervention…"
        rows={6}
        className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none overflow-hidden disabled:bg-[#f5f5f4] disabled:text-[#a8a29e] leading-relaxed"
      />

      {/* Phrase picker toggle */}
      {!disabled && (
        <div>
          <button
            type="button"
            onClick={() => setShowPhrases(v => !v)}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showPhrases ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7"/>
            </svg>
            {showPhrases ? 'Masquer les phrases' : 'Insérer une phrase enregistrée'}
            <span className="text-[11px] font-normal text-[#a8a29e]">({visiblePhrases.length})</span>
          </button>

          {showPhrases && (
            <div className="mt-2 border border-[#e7e5e4] rounded-xl overflow-hidden divide-y divide-[#f5f5f4]">
              {visiblePhrases.length === 0 ? (
                <p className="px-4 py-4 text-sm text-[#a8a29e]">
                  Aucune phrase — <a href="/phrases" target="_blank" className="text-primary underline underline-offset-2">gérer la bibliothèque</a>.
                </p>
              ) : (
                visiblePhrases.map(phrase => (
                  <button
                    key={phrase.id}
                    type="button"
                    onClick={() => insertPhrase(phrase.content)}
                    className="w-full text-left px-4 py-3 hover:bg-[#f5f5f4] active:bg-primary/5 transition-colors flex items-start gap-3"
                  >
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-[#1c1917]">{phrase.label}</span>
                      <span className="block text-[12px] text-[#78716c] mt-0.5 line-clamp-1">{phrase.content}</span>
                    </span>
                  </button>
                ))
              )}
              {otherPhrases.length > 0 && (
                <div className="px-4 py-2 bg-[#fafaf9]">
                  <p className="text-[11px] text-[#a8a29e]">{otherPhrases.length} phrase{otherPhrases.length > 1 ? 's' : ''} pour d'autres types masquée{otherPhrases.length > 1 ? 's' : ''}</p>
                </div>
              )}
              <div className="px-4 py-2.5 bg-[#fafaf9]">
                <a
                  href="/phrases"
                  target="_blank"
                  className="text-[12px] text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Gérer la bibliothèque de phrases →
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
