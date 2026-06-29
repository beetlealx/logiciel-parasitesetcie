'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  uploadPlanImage,
  createArticle,
  updateArticlePosition,
  updateArticleLabel,
  deleteArticle,
  type ArticleRow,
} from '@/app/actions/plan'
import {
  INTERVENTION_TEMPLATES,
  MIXTE_META,
  ARTICLE_TYPE_FOR_INTERVENTION,
  INTERVENTION_TYPE_ORDER,
  getArticleColor,
  type InterventionType,
} from '@/lib/intervention-templates'

interface Props {
  interventionId: string
  interventionType: InterventionType
  articles: ArticleRow[]
  onArticlesChange: (articles: ArticleRow[]) => void
  initialPlanPath: string | null
  initialPlanUrl: string
  disabled?: boolean
}

export default function PlanSection({
  interventionId,
  interventionType,
  articles,
  onArticlesChange,
  initialPlanPath,
  initialPlanUrl,
  disabled,
}: Props) {
  const template = interventionType !== 'mixte' ? INTERVENTION_TEMPLATES[interventionType] : null
  const defaultPrefix = template?.article_prefix ?? 'P'
  const defaultArticleType = interventionType !== 'mixte'
    ? ARTICLE_TYPE_FOR_INTERVENTION[interventionType]
    : 'poste_appatage'
  const defaultColor = interventionType !== 'mixte' ? template!.color : MIXTE_META.color
  // Local copy for smooth drag — synced from parent on committed changes
  const [localArticles, setLocalArticles] = useState<ArticleRow[]>(articles)
  const [planUrl, setPlanUrl] = useState(initialPlanUrl)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pendingClick, setPendingClick] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState<{
    id: string
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const articlesRef = useRef(localArticles)
  const onArticlesChangeRef = useRef(onArticlesChange)
  const hasMoved = useRef(false)

  useEffect(() => { articlesRef.current = localArticles }, [localArticles])
  useEffect(() => { onArticlesChangeRef.current = onArticlesChange }, [onArticlesChange])
  // Sync parent → local when articles are added/removed outside this component
  useEffect(() => { setLocalArticles(articles) }, [articles])

  // Global pointer listeners during drag
  useEffect(() => {
    if (!dragging) return

    let lastPos: { x: number; y: number } | null = null

    function onMove(e: PointerEvent) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const dx = ((e.clientX - dragging!.startX) / rect.width) * 100
      const dy = ((e.clientY - dragging!.startY) / rect.height) * 100
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) hasMoved.current = true
      const newX = Math.max(2, Math.min(98, dragging!.origX + dx))
      const newY = Math.max(2, Math.min(98, dragging!.origY + dy))
      lastPos = { x: newX, y: newY }
      setLocalArticles(ps =>
        ps.map(p => p.id === dragging!.id ? { ...p, x: newX, y: newY } : p)
      )
    }

    function onUp() {
      if (hasMoved.current && lastPos) {
        const { x, y } = lastPos
        updateArticlePosition(dragging!.id, x, y)
        const committed = articlesRef.current.map(p =>
          p.id === dragging!.id ? { ...p, x, y } : p
        )
        onArticlesChangeRef.current(committed)
      }
      setDragging(null)
      hasMoved.current = false
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging])

  const selectedArticle = localArticles.find(p => p.id === selectedId) ?? null

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadPlanImage(interventionId, fd)
    if ('url' in result) setPlanUrl(result.url)
    setUploading(false)
  }

  async function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled || hasMoved.current) return
    if (pendingClick) { setPendingClick(null); return }
    if (selectedId) { setSelectedId(null); return }

    const rect = containerRef.current!.getBoundingClientRect()
    const x = Number(((e.clientX - rect.left) / rect.width * 100).toFixed(2))
    const y = Number(((e.clientY - rect.top) / rect.height * 100).toFixed(2))

    if (interventionType === 'mixte') {
      setPendingClick({ x, y })
      return
    }

    const n = articlesRef.current.length + 1
    const label = `${defaultPrefix}${n}`
    const newArticle = await createArticle(interventionId, label, x, y, defaultArticleType)
    if (newArticle) {
      const updated = [...articlesRef.current, newArticle]
      setLocalArticles(updated)
      onArticlesChangeRef.current(updated)
      setSelectedId(newArticle.id)
      setEditLabel(newArticle.label)
    }
  }

  async function handleSubTypeSelect(subType: Exclude<InterventionType, 'mixte'>) {
    if (!pendingClick) return
    const tpl = INTERVENTION_TEMPLATES[subType]
    const articleType = ARTICLE_TYPE_FOR_INTERVENTION[subType]
    const count = articlesRef.current.filter(a => a.article_type === articleType).length
    const label = `${tpl.article_prefix}${count + 1}`
    const newArticle = await createArticle(interventionId, label, pendingClick.x, pendingClick.y, articleType)
    if (newArticle) {
      const updated = [...articlesRef.current, newArticle]
      setLocalArticles(updated)
      onArticlesChangeRef.current(updated)
      setSelectedId(newArticle.id)
      setEditLabel(newArticle.label)
    }
    setPendingClick(null)
  }

  function handleArticlePointerDown(e: React.PointerEvent, article: ArticleRow) {
    e.preventDefault()
    e.stopPropagation()
    hasMoved.current = false
    setDragging({ id: article.id, startX: e.clientX, startY: e.clientY, origX: article.x, origY: article.y })
  }

  function handleArticleClick(e: React.MouseEvent, article: ArticleRow) {
    e.stopPropagation()
    if (hasMoved.current) return
    if (selectedId === article.id) {
      setSelectedId(null)
    } else {
      setSelectedId(article.id)
      setEditLabel(article.label)
    }
  }

  async function handleLabelBlur() {
    if (!selectedId || !editLabel.trim()) return
    const trimmed = editLabel.trim()
    await updateArticleLabel(selectedId, trimmed)
    const updated = articlesRef.current.map(p => p.id === selectedId ? { ...p, label: trimmed } : p)
    setLocalArticles(updated)
    onArticlesChangeRef.current(updated)
  }

  async function handleDeleteArticle() {
    if (!selectedId) return
    await deleteArticle(selectedId)
    const updated = articlesRef.current.filter(p => p.id !== selectedId)
    setLocalArticles(updated)
    onArticlesChangeRef.current(updated)
    setSelectedId(null)
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {!planUrl ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed border-[#d6d3d1] rounded-xl bg-[#fafaf9]">
          <svg className="w-10 h-10 text-[#c7c3c0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
          </svg>
          <p className="text-sm text-[#78716c]">Aucun plan chargé</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="bg-primary text-white text-sm px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 min-h-[44px] transition-colors"
          >
            {uploading ? 'Chargement…' : '+ Ajouter un plan'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Interactive map */}
          <div
            ref={containerRef}
            className={`relative w-full rounded-xl overflow-hidden border border-[#e7e5e4] select-none touch-none bg-white ${!disabled && !selectedId ? 'cursor-crosshair' : 'cursor-default'}`}
            style={{ aspectRatio: '4/3' }}
            onClick={handleMapClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={planUrl}
              alt="Plan d'implantation"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />

            {/* Articles */}
            {localArticles.map(article => {
              const color = getArticleColor(interventionType, article.article_type)
              const isSelected = selectedId === article.id
              const isDragging = dragging?.id === article.id
              return (
                <div
                  key={article.id}
                  className="absolute"
                  style={{ left: `${article.x}%`, top: `${article.y}%` }}
                >
                  <button
                    type="button"
                    className={`
                      -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center
                      text-[11px] font-bold shadow-md border-2 transition-transform
                      ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'}
                    `}
                    style={isSelected
                      ? { backgroundColor: color, color: 'white', borderColor: 'white', outline: `3px solid ${color}`, outlineOffset: '1px', transform: 'translate(-50%, -50%) scale(1.1)' }
                      : { backgroundColor: 'white', color, borderColor: color }
                    }
                    onPointerDown={e => !disabled && handleArticlePointerDown(e, article)}
                    onClick={e => handleArticleClick(e, article)}
                  >
                    {article.label}
                  </button>
                </div>
              )
            })}

            {/* Pending click marker (mixte) */}
            {pendingClick && (
              <div
                className="absolute pointer-events-none"
                style={{ left: `${pendingClick.x}%`, top: `${pendingClick.y}%` }}
              >
                <div className="-translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border-2 border-dashed border-[#78716c] bg-white/60 animate-pulse" />
              </div>
            )}

            {/* Mixte sub-type picker popover */}
            {pendingClick && (
              <div
                className="absolute z-20 bg-white rounded-xl shadow-xl border border-[#e7e5e4] p-3 w-52"
                style={{
                  left: `${Math.min(Math.max(pendingClick.x, 25), 75)}%`,
                  ...(pendingClick.y > 60
                    ? { bottom: `${100 - pendingClick.y + 6}%` }
                    : { top: `${pendingClick.y + 6}%` }),
                  transform: 'translateX(-50%)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <p className="text-[11px] text-[#78716c] font-medium mb-2 text-center">Quel type de nuisible ?</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(INTERVENTION_TYPE_ORDER.filter(t => t !== 'mixte') as Exclude<InterventionType, 'mixte'>[]).map(subType => {
                    const tpl = INTERVENTION_TEMPLATES[subType]
                    return (
                      <button
                        key={subType}
                        type="button"
                        onClick={() => handleSubTypeSelect(subType)}
                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[12px] font-medium text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: tpl.color }}
                      >
                        <span>{tpl.icon}</span>
                        <span className="truncate">{tpl.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Edit panel */}
          {selectedArticle && (
            <div className="flex items-center gap-2 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl px-3 py-2.5">
              <span className="text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium shrink-0">Étiquette</span>
              <input
                type="text"
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                onBlur={handleLabelBlur}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                disabled={disabled}
                maxLength={6}
                className="w-20 px-2 py-1.5 border border-[#d6d3d1] rounded-lg text-sm text-center font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <span className="text-[12px] text-[#a8a29e] flex-1">
                Position : {selectedArticle.x.toFixed(0)}%, {selectedArticle.y.toFixed(0)}%
              </span>
              <button
                type="button"
                onClick={handleDeleteArticle}
                disabled={disabled}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Supprimer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="p-2 text-[#a8a29e] hover:text-[#57534e] hover:bg-[#f5f5f4] rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Fermer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#a8a29e]">
              {disabled ? '' : selectedId
                ? "Déplacez ou modifiez l'étiquette"
                : `Appuyez pour ajouter · ${localArticles.length} ${template?.article_label ?? 'article'}${localArticles.length !== 1 ? 's' : ''}`}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[12px] text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {uploading ? 'Chargement…' : 'Changer le plan'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
