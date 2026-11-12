'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { importerDevis, synchroniserMaintenant } from '@/app/actions/devis-signes'

export default function ImportDevisForm() {
  const router = useRouter()
  const [ref, setRef] = useState('')
  const [busy, setBusy] = useState<'import' | 'sync' | null>(null)

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!ref.trim()) return
    setBusy('import')
    const r = await importerDevis(ref)
    setBusy(null)
    if (r.status === 'cree') {
      toast.success(`Dossier créé pour ${r.ref}`, { description: r.aTyper ? 'Aucune ligne reconnue : à typer' : `${r.passages} intervention(s) créée(s)` })
      setRef('')
      router.push(`/admin/devis-signes/${r.dossierId}`)
    } else if (r.status === 'existant') {
      toast.info(`${r.ref} a déjà un dossier`)
      router.push(`/admin/devis-signes/${r.dossierId}`)
    } else if (r.status === 'ignore') {
      toast.warning(r.raison)
    } else {
      toast.error(r.message)
    }
  }

  async function handleSync() {
    setBusy('sync')
    const r = await synchroniserMaintenant()
    setBusy(null)
    if (r.erreurs.length) toast.error(`${r.erreurs.length} erreur(s)`, { description: r.erreurs.slice(0, 3).join(' · ') })
    else toast.success(r.crees ? `${r.crees} dossier(s) importé(s)` : 'Aucun nouveau devis signé')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <form onSubmit={handleImport} className="flex items-center gap-2">
        <input
          value={ref}
          onChange={e => setRef(e.target.value)}
          placeholder="PR2611-0012"
          aria-label="Référence du devis Dolibarr"
          className="w-36 px-3 py-2 border border-[#d6d3d1] rounded-lg text-sm font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[40px]"
        />
        <button
          type="submit"
          disabled={busy !== null || !ref.trim()}
          className="border border-[#d6d3d1] text-[#57534e] text-sm px-3 py-2 rounded-lg font-medium hover:bg-[#f5f5f4] disabled:opacity-50 min-h-[40px]"
        >
          {busy === 'import' ? 'Import…' : 'Importer un devis'}
        </button>
      </form>
      <button
        type="button"
        onClick={handleSync}
        disabled={busy !== null}
        className="bg-primary text-white text-sm px-3 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 min-h-[40px]"
      >
        {busy === 'sync' ? 'Synchronisation…' : 'Synchroniser maintenant'}
      </button>
    </div>
  )
}
