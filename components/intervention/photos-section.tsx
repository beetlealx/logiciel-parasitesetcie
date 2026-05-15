'use client'

import { useState, useRef } from 'react'
import { uploadPhoto, updatePhotoCaption, deletePhoto, type PhotoRow } from '@/app/actions/photos'

interface Props {
  interventionId: string
  initialPhotos: PhotoRow[]
  disabled?: boolean
}

export default function PhotosSection({ interventionId, initialPhotos, disabled }: Props) {
  const [photos, setPhotos] = useState<PhotoRow[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''

    setUploading(true)
    setProgress({ done: 0, total: files.length })

    for (let i = 0; i < files.length; i++) {
      const fd = new FormData()
      fd.append('file', files[i])
      const result = await uploadPhoto(interventionId, fd)
      if ('id' in result) setPhotos(ps => [...ps, result])
      setProgress({ done: i + 1, total: files.length })
    }

    setUploading(false)
  }

  async function handleCaptionChange(id: string, caption: string) {
    setPhotos(ps => ps.map(p => p.id === id ? { ...p, caption } : p))
    await updatePhotoCaption(id, caption)
  }

  async function handleDelete(id: string, storagePath: string) {
    setPhotos(ps => ps.filter(p => p.id !== id))
    await deletePhoto(id, storagePath)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {!disabled && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60 min-h-[44px] transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              {uploading ? `Envoi ${progress.done + 1}/${progress.total}…` : 'Ajouter des photos'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesChange}
            />
          </>
        )}
        {photos.length > 0 && (
          <span className="text-[12px] text-[#a8a29e]">
            {photos.length} photo{photos.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              disabled={disabled}
              onCaptionChange={(caption) => handleCaptionChange(photo.id, caption)}
              onDelete={() => handleDelete(photo.id, photo.storage_path)}
            />
          ))}
        </div>
      ) : !uploading ? (
        <p className="py-8 text-center text-sm text-[#a8a29e]">
          Aucune photo — appuyez sur le bouton pour en ajouter.
        </p>
      ) : null}
    </div>
  )
}

function PhotoCard({
  photo,
  disabled,
  onCaptionChange,
  onDelete,
}: {
  photo: PhotoRow
  disabled?: boolean
  onCaptionChange: (caption: string) => void
  onDelete: () => void
}) {
  const [caption, setCaption] = useState(photo.caption ?? '')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await onDelete()
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[#e7e5e4] bg-white">
      {/* Thumbnail */}
      <div className="relative aspect-square bg-[#f5f5f4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={caption || 'Photo intervention'}
          className="w-full h-full object-cover"
        />
        {/* Delete button — toujours visible pour tablette */}
        {!disabled && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center transition-colors shadow-sm"
            title="Supprimer"
          >
            {deleting ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin block" />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Caption */}
      <div className="px-2.5 py-2 border-t border-[#f5f5f4]">
        <input
          type="text"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          onBlur={e => onCaptionChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          disabled={disabled}
          placeholder="Légende…"
          maxLength={80}
          className="w-full text-[12px] text-[#57534e] placeholder:text-[#c7c3c0] focus:outline-none bg-transparent min-h-[28px]"
        />
      </div>
    </div>
  )
}
