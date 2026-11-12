'use client'

import { useState } from 'react'

interface Props {
  url: string
  filename: string
  label: string
  icon: React.ReactNode
}

export default function SharePdfButton({ url, filename, label, icon }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('http error')
      const blob = await res.blob()
      const file = new File([blob], filename, { type: 'application/pdf' })

      // Tente le partage natif avec le fichier (Android, desktop Chrome)
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename })
          return
        } catch (e) {
          // AbortError = annulé par l'utilisateur → rien à faire
          if (e instanceof Error && e.name === 'AbortError') return
          // NotAllowedError sur iOS (user gesture expiré après le fetch) → fallback
        }
      }

      // Tente le téléchargement direct (desktop)
      try {
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(objectUrl)
        return
      } catch {
        // Ignoré si le download ne fonctionne pas (iOS Safari)
      }
    } catch {
      // Fetch échoué : on tombe dans le fallback ci-dessous
    } finally {
      setLoading(false)
    }

    // Fallback universel : ouvrir dans un nouvel onglet
    // Sur iOS Safari, l'utilisateur peut ensuite sauvegarder depuis la barre de partage native
    window.open(url, '_blank', 'noopener')
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className="flex items-center gap-1.5 border border-[#d6d3d1] text-[#57534e] text-sm px-3 py-2.5 rounded-lg font-medium hover:bg-[#f5f5f4] disabled:opacity-50 transition-colors min-h-[44px]"
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" strokeOpacity="0.25"/>
          <path d="M21 12a9 9 0 00-9-9"/>
        </svg>
      ) : icon}
      {loading ? 'Chargement…' : label}
    </button>
  )
}
