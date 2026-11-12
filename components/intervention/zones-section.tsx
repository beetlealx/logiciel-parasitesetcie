'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { addZone, deleteZone, reprendreZonesPrecedentes, updateZone, type Niveau, type ZoneRow } from '@/app/actions/zones'
import { deletePhoto, uploadPhoto, type PhotoRow } from '@/app/actions/photos'

const ZONES_TYPES = ['Cuisine', 'Salle de bain', 'WC', 'Séjour', 'Chambre', 'Cave', 'Parties communes', 'Local poubelles', 'Extérieur']

const NIVEAUX: { value: Niveau; label: string; cls: string }[] = [
  { value: 'nul', label: 'Nul', cls: 'bg-[#d1f5ed] text-[#064e44] border-[#a7e8d8]' },
  { value: 'faible', label: 'Faible', cls: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  { value: 'moyen', label: 'Moyen', cls: 'bg-orange-50 text-orange-800 border-orange-200' },
  { value: 'fort', label: 'Fort', cls: 'bg-red-50 text-red-700 border-red-200' },
]

interface Props {
  interventionId: string
  initialZones: ZoneRow[]
  initialPhotos: PhotoRow[] // photos rattachées à une zone
  canReprendre: boolean // passage n > 1 : zones du passage précédent disponibles
  disabled?: boolean
}

export default function ZonesSection({ interventionId, initialZones, initialPhotos, canReprendre, disabled }: Props) {
  const [zones, setZones] = useState<ZoneRow[]>(initialZones)
  const [photos, setPhotos] = useState<PhotoRow[]>(initialPhotos)
  const [newLabel, setNewLabel] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleAdd(label: string) {
    if (!label.trim()) return
    setBusy(true)
    try {
      const z = await addZone(interventionId, label)
      setZones(zs => [...zs, z])
      setNewLabel('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    }
    setBusy(false)
  }

  async function handleReprendre() {
    setBusy(true)
    try {
      const created = await reprendreZonesPrecedentes(interventionId)
      if (created.length) setZones(zs => [...zs, ...created])
      else toast.info('Aucune zone au passage précédent')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    }
    setBusy(false)
  }

  function patchZone(id: string, patch: Partial<ZoneRow>) {
    setZones(zs => zs.map(z => (z.id === id ? { ...z, ...patch } : z)))
    updateZone(id, patch)
  }

  async function handleDeleteZone(id: string) {
    setZones(zs => zs.filter(z => z.id !== id))
    setPhotos(ps => ps.filter(p => p.zone_id !== id))
    await deleteZone(id)
  }

  return (
    <div className="space-y-4">
      {zones.length === 0 && (
        <p className="text-[13px] text-[#a8a29e]">
          Découpez le site en zones (pièces, logements, parties communes). Chaque zone a ses photos avant et après.
        </p>
      )}

      {zones.map(z => (
        <ZoneCard
          key={z.id}
          zone={z}
          interventionId={interventionId}
          photos={photos.filter(p => p.zone_id === z.id)}
          disabled={disabled}
          onPatch={patch => patchZone(z.id, patch)}
          onDelete={() => handleDeleteZone(z.id)}
          onPhotoAdded={p => setPhotos(ps => [...ps, p])}
          onPhotoDeleted={id => setPhotos(ps => ps.filter(p => p.id !== id))}
        />
      ))}

      {!disabled && (
        <div className="space-y-2">
          {canReprendre && zones.length === 0 && (
            <button type="button" onClick={handleReprendre} disabled={busy}
              className="w-full border border-primary/40 text-primary text-sm py-2.5 rounded-lg font-medium hover:bg-primary/5 min-h-[44px]">
              Reprendre les zones du passage précédent
            </button>
          )}
          <div className="flex flex-wrap gap-1.5">
            {ZONES_TYPES.map(l => (
              <button key={l} type="button" disabled={busy} onClick={() => handleAdd(l)}
                className="text-[12.5px] px-2.5 py-1.5 rounded-full border border-[#e7e5e4] text-[#57534e] hover:border-primary hover:text-primary">
                + {l}
              </button>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); handleAdd(newLabel) }} className="flex gap-2">
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Autre zone (ex. Logement 12 — 3e étage)"
              className="flex-1 px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary min-h-[44px]"
            />
            <button type="submit" disabled={busy || !newLabel.trim()}
              className="bg-primary text-white text-sm px-4 rounded-lg font-medium disabled:opacity-50 min-h-[44px]">
              Ajouter
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function ZoneCard({
  zone, interventionId, photos, disabled, onPatch, onDelete, onPhotoAdded, onPhotoDeleted,
}: {
  zone: ZoneRow
  interventionId: string
  photos: PhotoRow[]
  disabled?: boolean
  onPatch: (patch: Partial<ZoneRow>) => void
  onDelete: () => void
  onPhotoAdded: (p: PhotoRow) => void
  onPhotoDeleted: (id: string) => void
}) {
  const [label, setLabel] = useState(zone.label)
  const [traitement, setTraitement] = useState(zone.traitement ?? '')
  const [constat, setConstat] = useState(zone.constat ?? '')
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="border border-[#e7e5e4] rounded-xl p-3 space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          onBlur={() => label !== zone.label && onPatch({ label })}
          disabled={disabled}
          className="flex-1 font-medium text-[14px] px-2 py-1.5 rounded-lg border border-transparent hover:border-[#e7e5e4] focus:border-primary focus:outline-none disabled:bg-transparent"
        />
        {!disabled && (confirm ? (
          <span className="flex gap-2 text-[12px]">
            <button type="button" onClick={onDelete} className="text-red-600 font-medium">Supprimer</button>
            <button type="button" onClick={() => setConfirm(false)} className="text-[#a8a29e]">Annuler</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} title="Supprimer la zone" className="p-1.5 text-[#c7c3c0] hover:text-red-500">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          </button>
        ))}
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">Niveau d&apos;infestation</div>
        <div className="grid grid-cols-4 gap-1.5">
          {NIVEAUX.map(n => (
            <button
              key={n.value}
              type="button"
              disabled={disabled}
              onClick={() => onPatch({ niveau: zone.niveau === n.value ? null : n.value })}
              className={`text-[12.5px] py-2 rounded-lg border font-medium min-h-[40px] transition-colors ${
                zone.niveau === n.value ? n.cls : 'border-[#e7e5e4] text-[#78716c] bg-white'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PhotoColumn title="Avant" phase="avant" zoneId={zone.id} interventionId={interventionId}
          photos={photos.filter(p => p.phase !== 'apres')} disabled={disabled} onAdded={onPhotoAdded} onDeleted={onPhotoDeleted} />
        <PhotoColumn title="Après" phase="apres" zoneId={zone.id} interventionId={interventionId}
          photos={photos.filter(p => p.phase === 'apres')} disabled={disabled} onAdded={onPhotoAdded} onDeleted={onPhotoDeleted} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={traitement}
          onChange={e => setTraitement(e.target.value)}
          onBlur={() => traitement !== (zone.traitement ?? '') && onPatch({ traitement })}
          disabled={disabled}
          placeholder="Traitement (ex. gel posé, vapeur + pulvérisation)"
          className="px-3 py-2 border border-[#d6d3d1] rounded-lg text-[13px] focus:outline-none focus:border-primary disabled:bg-[#f5f5f4]"
        />
        <input
          value={constat}
          onChange={e => setConstat(e.target.value)}
          onBlur={() => constat !== (zone.constat ?? '') && onPatch({ constat })}
          disabled={disabled}
          placeholder="Constat (ex. déjections derrière le frigo)"
          className="px-3 py-2 border border-[#d6d3d1] rounded-lg text-[13px] focus:outline-none focus:border-primary disabled:bg-[#f5f5f4]"
        />
      </div>
    </div>
  )
}

function PhotoColumn({
  title, phase, zoneId, interventionId, photos, disabled, onAdded, onDeleted,
}: {
  title: string
  phase: 'avant' | 'apres'
  zoneId: string
  interventionId: string
  photos: PhotoRow[]
  disabled?: boolean
  onAdded: (p: PhotoRow) => void
  onDeleted: (id: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    for (const f of files) {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('zone_id', zoneId)
      fd.append('phase', phase)
      const r = await uploadPhoto(interventionId, fd)
      if ('id' in r) onAdded(r)
      else toast.error(r.error)
    }
    setUploading(false)
  }

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">{title}</div>
      <div className="grid grid-cols-2 gap-1.5">
        {photos.map(p => (
          <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-[#f5f5f4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`${title}`} className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={async () => { onDeleted(p.id); await deletePhoto(p.id, p.storage_path) }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-red-500 text-xs flex items-center justify-center shadow-sm"
                title="Supprimer"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-[#d6d3d1] text-[#a8a29e] hover:border-primary hover:text-primary flex flex-col items-center justify-center text-[11px] gap-1"
          >
            <span className="text-lg leading-none">{uploading ? '…' : '+'}</span>
            Photo
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFiles} />
    </div>
  )
}
