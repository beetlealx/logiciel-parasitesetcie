'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  SPECIES, SPECIES_PHOTOS, CATEGORY_SPECIES, CATEGORY_QUESTIONS, CATEGORY_META,
  type Category, type SpeciesKey, type Species,
} from '@/lib/identification/data'
import { createInterventionFromDiagnostic } from '@/app/actions/interventions'
import { toast } from 'sonner'

type Step = 'category' | 'questions' | 'results'

function ScoreBar({ pct, couleur }: { pct: number; couleur: string }) {
  return (
    <div className="h-2 bg-[#f0efee] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: couleur }}
      />
    </div>
  )
}

function SpeciesFiche({ species, pct, onCreateIntervention }: { species: Species; pct: number; onCreateIntervention: (s: Species) => void }) {
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const photoUrl = SPECIES_PHOTOS[species.id]
  return (
    <div className="border border-[#e7e5e4] rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-5 py-4 flex items-center gap-4"
      >
        <div className="text-3xl w-10 text-center shrink-0">{species.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-[15px] text-[#1c1917]">{species.nom}</span>
            {species.vecteur_maladie && (
              <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⚠ Vecteur maladie</span>
            )}
          </div>
          <div className="text-[12px] text-[#78716c] italic mb-2">{species.latin}</div>
          <ScoreBar pct={pct} couleur={species.couleur} />
          <div className="text-[11px] font-semibold mt-1" style={{ color: species.couleur }}>
            Probabilité {pct}%
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-[#a8a29e] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#f0efee] pt-4 space-y-4">
          {photoUrl && !imgError && (
            <div className="relative rounded-xl overflow-hidden bg-[#f5f5f4] h-48">
              <Image
                src={photoUrl}
                alt={`${species.nom} — ${species.latin}`}
                fill
                className="object-cover"
                onError={() => setImgError(true)}
                sizes="(max-width: 640px) 100vw, 600px"
              />
            </div>
          )}
          <p className="text-[13.5px] text-[#44403c] leading-relaxed">{species.description}</p>

          <div>
            <div className="text-[11px] font-bold text-[#78716c] uppercase tracking-wide mb-2">Signes distinctifs</div>
            <ul className="space-y-1.5">
              {species.signes_distinctifs.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[#44403c]">
                  <span className="text-primary font-bold mt-0.5">·</span>{s}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-bold text-[#78716c] uppercase tracking-wide mb-2">Zones à inspecter</div>
            <div className="flex flex-wrap gap-1.5">
              {species.zones_inspection.map((z, i) => (
                <span key={i} className="text-[11.5px] bg-[#fafaf9] border border-[#e7e5e4] text-[#44403c] px-2.5 py-1 rounded-lg">
                  {z}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-[#78716c] uppercase tracking-wide mb-1.5">Traitement recommandé</div>
            <p className="text-[13px] text-[#44403c] leading-relaxed">{species.traitement}</p>
          </div>

          <button
            onClick={() => onCreateIntervention(species)}
            className="w-full bg-primary text-white rounded-xl py-3 text-[13.5px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Créer une intervention ({species.interventionLabel})
          </button>
        </div>
      )}
    </div>
  )
}

export default function IdentificationClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('category')
  const [category, setCategory] = useState<Category | null>(null)
  const [questionIdx, setQuestionIdx] = useState(0)
  const [scores, setScores] = useState<Partial<Record<SpeciesKey, number>>>({})
  const [history, setHistory] = useState<Array<{ questionIdx: number; scores: Partial<Record<SpeciesKey, number>> }>>([])
  const [isPending, startTransition] = useTransition()

  const questions = category ? CATEGORY_QUESTIONS[category] : []
  const currentQuestion = questions[questionIdx]
  const progress = questions.length > 0 ? ((questionIdx) / questions.length) * 100 : 0

  const results = useMemo(() => {
    if (!category) return []
    const speciesKeys = CATEGORY_SPECIES[category]
    const scored = speciesKeys.map(id => ({ species: SPECIES[id], score: scores[id] ?? 0 }))
    const total = scored.reduce((s, x) => s + x.score, 0)
    return scored
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => ({ ...x, pct: total > 0 ? Math.min(99, Math.round((x.score / total) * 100)) : 0 }))
  }, [category, scores])

  function handleCategorySelect(cat: Category) {
    setCategory(cat)
    setScores({})
    setQuestionIdx(0)
    setHistory([])
    setStep('questions')
  }

  function handleAnswer(optionScores: Partial<Record<SpeciesKey, number>>) {
    const newScores = { ...scores }
    for (const [k, v] of Object.entries(optionScores)) {
      newScores[k as SpeciesKey] = (newScores[k as SpeciesKey] ?? 0) + (v ?? 0)
    }
    setHistory(h => [...h, { questionIdx, scores }])
    const next = questionIdx + 1
    if (next >= questions.length) {
      setScores(newScores)
      setStep('results')
    } else {
      setScores(newScores)
      setQuestionIdx(next)
    }
  }

  function handleBack() {
    if (step === 'results') {
      const last = history[history.length - 1]
      if (last) {
        setScores(last.scores)
        setQuestionIdx(last.questionIdx)
        setHistory(h => h.slice(0, -1))
        setStep('questions')
      }
      return
    }
    if (step === 'questions') {
      if (history.length === 0) {
        setStep('category')
        setCategory(null)
        return
      }
      const last = history[history.length - 1]
      setScores(last.scores)
      setQuestionIdx(last.questionIdx)
      setHistory(h => h.slice(0, -1))
    }
  }

  function handleReset() {
    setStep('category')
    setCategory(null)
    setScores({})
    setQuestionIdx(0)
    setHistory([])
  }

  function handleCreateIntervention(species: Species) {
    startTransition(async () => {
      const result = await createInterventionFromDiagnostic(species.interventionLabel, species.nom)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      if (result?.id) {
        toast.success(`Intervention créée — ${species.nom} pré-rempli`)
        router.push(`/interventions/${result.id}`)
      }
    })
  }

  // ── CATEGORY SELECTION ──
  if (step === 'category') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#1c1917]">Identification nuisible</h1>
          <p className="text-[13.5px] text-[#78716c] mt-1">
            Répondez aux questions pour identifier l'espèce et obtenir les recommandations de traitement.
          </p>
        </div>

        <div>
          <p className="text-[12px] font-semibold text-[#78716c] uppercase tracking-wide mb-3">Quel type de nuisible suspectez-vous ?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][]).map(([cat, meta]) => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className="flex items-center gap-4 bg-white border border-[#e7e5e4] rounded-2xl px-5 py-4 text-left hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.98] min-h-[72px]"
              >
                <span className="text-3xl shrink-0">{meta.emoji}</span>
                <div>
                  <div className="text-[14px] font-semibold text-[#1c1917]">{meta.label}</div>
                  <div className="text-[12px] text-[#a8a29e] mt-0.5">{meta.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── QUESTIONNAIRE ──
  if (step === 'questions' && currentQuestion) {
    const catMeta = CATEGORY_META[category!]
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 rounded-xl hover:bg-[#f5f5f4] transition-colors">
            <svg className="w-5 h-5 text-[#78716c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{catMeta.emoji}</span>
              <span className="text-[12px] font-semibold text-[#78716c]">{catMeta.label}</span>
              <span className="text-[12px] text-[#a8a29e] ml-auto">{questionIdx + 1}/{questions.length}</span>
            </div>
            <div className="h-1.5 bg-[#f0efee] rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl border border-[#e7e5e4] p-5">
          <p className="text-[16px] font-semibold text-[#1c1917] leading-snug mb-1">{currentQuestion.text}</p>
          {currentQuestion.hint && (
            <p className="text-[12px] text-[#a8a29e] mb-1">{currentQuestion.hint}</p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {currentQuestion.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt.scores)}
              className="w-full flex items-start gap-3 bg-white border border-[#e7e5e4] rounded-2xl px-5 py-4 text-left hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.99] min-h-[60px]"
            >
              <span className="w-6 h-6 rounded-full border-2 border-[#e7e5e4] shrink-0 mt-0.5 flex items-center justify-center text-[11px] font-bold text-[#a8a29e]">
                {String.fromCharCode(65 + i)}
              </span>
              <div>
                <div className="text-[13.5px] font-medium text-[#1c1917]">{opt.label}</div>
                {opt.desc && <div className="text-[12px] text-[#a8a29e] mt-0.5">{opt.desc}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── RESULTS ──
  if (step === 'results') {
    const catMeta = CATEGORY_META[category!]
    const noResult = results.length === 0
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-[#1c1917]">Résultat du diagnostic</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span>{catMeta.emoji}</span>
              <span className="text-[12.5px] text-[#78716c]">{catMeta.label}</span>
            </div>
          </div>
          <button onClick={handleReset} className="text-[12.5px] font-semibold text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary/5 transition-colors">
            Nouveau diagnostic
          </button>
        </div>

        {noResult ? (
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-[14px] font-medium text-[#1c1917]">Identification incertaine</p>
            <p className="text-[12.5px] text-[#78716c] mt-1">Les réponses ne permettent pas d'identifier une espèce avec certitude. Un examen visuel approfondi sur site est recommandé.</p>
            <button onClick={handleBack} className="mt-4 text-[13px] font-semibold text-primary hover:underline">
              ← Modifier mes réponses
            </button>
          </div>
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-[12.5px] text-amber-800">
              <strong>Attention :</strong> Ce diagnostic est une aide à l'identification — la confirmation sur site reste indispensable.
            </div>

            <div className="space-y-3">
              {results.map(({ species, pct }, i) => (
                <div key={species.id}>
                  {i === 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wide">Espèce la plus probable</span>
                    </div>
                  )}
                  {i === 1 && results.length > 1 && (
                    <div className="flex items-center gap-2 mb-2 mt-4">
                      <span className="text-[11px] font-semibold text-[#78716c] uppercase tracking-wide">Espèces alternatives</span>
                    </div>
                  )}
                  <SpeciesFiche
                    species={species}
                    pct={pct}
                    onCreateIntervention={handleCreateIntervention}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleBack}
              className="text-[13px] font-semibold text-[#78716c] hover:text-[#1c1917] transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Modifier mes réponses
            </button>
          </>
        )}

        {isPending && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl px-8 py-6 flex items-center gap-3 shadow-xl">
              <svg className="w-5 h-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span className="text-[14px] font-medium">Création de l'intervention…</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
