'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  uploadPlanImage,
  createPoste,
  updatePostePosition,
  updatePosteLabel,
  deletePoste,
  type PosteRow,
} from '@/app/actions/plan'

interface Props {
  interventionId: string
  postes: PosteRow[]
  onPostesChange: (postes: PosteRow[]) => void
  initialPlanPath: string | null
  initialPlanUrl: string
  disabled?: boolean
}

export default function PlanSection({
  interventionId,
  postes,
  onPostesChange,
  initialPlanPath,
  initialPlanUrl,
  disabled,
}: Props) {
  // Local copy for smooth drag — synced from parent on committed changes
  const [localPostes, setLocalPostes] = useState<PosteRow[]>(postes)
  const [planUrl, setPlanUrl] = useState(initialPlanUrl)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState<{
    id: string
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const postesRef = useRef(localPostes)
  const onPostesChangeRef = useRef(onPostesChange)
  const hasMoved = useRef(false)

  useEffect(() => { postesRef.current = localPostes }, [localPostes])
  useEffect(() => { onPostesChangeRef.current = onPostesChange }, [onPostesChange])
  // Sync parent → local when postes are added/removed outside this component
  useEffect(() => { setLocalPostes(postes) }, [postes])

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
      setLocalPostes(ps =>
        ps.map(p => p.id === dragging!.id ? { ...p, x: newX, y: newY } : p)
      )
    }

    function onUp() {
      if (hasMoved.current && lastPos) {
        const { x, y } = lastPos
        updatePostePosition(dragging!.id, x, y)
        const committed = postesRef.current.map(p =>
          p.id === dragging!.id ? { ...p, x, y } : p
        )
        onPostesChangeRef.current(committed)
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

  const selectedPoste = localPostes.find(p => p.id === selectedId) ?? null

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
    if (selectedId) { setSelectedId(null); return }

    const rect = containerRef.current!.getBoundingClientRect()
    const x = Number(((e.clientX - rect.left) / rect.width * 100).toFixed(2))
    const y = Number(((e.clientY - rect.top) / rect.height * 100).toFixed(2))
    const n = postesRef.current.length + 1
    const label = `P${n}`

    const newPoste = await createPoste(interventionId, label, x, y)
    if (newPoste) {
      const updated = [...postesRef.current, newPoste]
      setLocalPostes(updated)
      onPostesChangeRef.current(updated)
      setSelectedId(newPoste.id)
      setEditLabel(newPoste.label)
    }
  }

  function handlePostePointerDown(e: React.PointerEvent, poste: PosteRow) {
    e.preventDefault()
    e.stopPropagation()
    hasMoved.current = false
    setDragging({ id: poste.id, startX: e.clientX, startY: e.clientY, origX: poste.x, origY: poste.y })
  }

  function handlePosteClick(e: React.MouseEvent, poste: PosteRow) {
    e.stopPropagation()
    if (hasMoved.current) return
    if (selectedId === poste.id) {
      setSelectedId(null)
    } else {
      setSelectedId(poste.id)
      setEditLabel(poste.label)
    }
  }

  async function handleLabelBlur() {
    if (!selectedId || !editLabel.trim()) return
    const trimmed = editLabel.trim()
    await updatePosteLabel(selectedId, trimmed)
    const updated = postesRef.current.map(p => p.id === selectedId ? { ...p, label: trimmed } : p)
    setLocalPostes(updated)
    onPostesChangeRef.current(updated)
  }

  async function handleDeletePoste() {
    if (!selectedId) return
    await deletePoste(selectedId)
    const updated = postesRef.current.filter(p => p.id !== selectedId)
    setLocalPostes(updated)
    onPostesChangeRef.current(updated)
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

            {/* Postes */}
            {localPostes.map(poste => (
              <div
                key={poste.id}
                className="absolute"
                style={{ left: `${poste.x}%`, top: `${poste.y}%` }}
              >
                <button
                  type="button"
                  className={`
                    -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center
                    text-[11px] font-bold shadow-md border-2 transition-transform
                    ${selectedId === poste.id
                      ? 'bg-primary text-white border-white ring-2 ring-primary ring-offset-1 scale-110'
                      : 'bg-white text-primary border-primary hover:scale-105 active:scale-110'
                    }
                    ${dragging?.id === poste.id ? 'cursor-grabbing scale-110' : 'cursor-grab'}
                  `}
                  onPointerDown={e => !disabled && handlePostePointerDown(e, poste)}
                  onClick={e => handlePosteClick(e, poste)}
                >
                  {poste.label}
                </button>
              </div>
            ))}
          </div>

          {/* Edit panel */}
          {selectedPoste && (
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
                Position : {selectedPoste.x.toFixed(0)}%, {selectedPoste.y.toFixed(0)}%
              </span>
              <button
                type="button"
                onClick={handleDeletePoste}
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
              {disabled ? '' : selectedId ? 'Déplacez le poste ou modifiez son étiquette' : `Appuyez sur le plan pour ajouter un poste · ${localPostes.length} poste${localPostes.length !== 1 ? 's' : ''}`}
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
