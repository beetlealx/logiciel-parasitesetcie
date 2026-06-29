'use client'

import { useState, useTransition } from 'react'
import { createPortailToken, deletePortailToken, type PortailToken } from '@/app/actions/portail'

interface Props {
  tiersId: number
  clientName: string
  tokens: PortailToken[]
}

export default function PortailLinkManager({ tiersId, clientName, tokens: initialTokens }: Props) {
  const [tokens, setTokens] = useState<PortailToken[]>(initialTokens)
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const siteUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? ''

  function handleCreate() {
    startTransition(async () => {
      const res = await createPortailToken(tiersId, clientName)
      if (res.token) {
        const newToken: PortailToken = {
          id: crypto.randomUUID(),
          token: res.token,
          dolibarr_tiers_id: tiersId,
          client_name: clientName,
          actif: true,
          created_at: new Date().toISOString(),
          expires_at: null,
        }
        setTokens(t => [newToken, ...t])
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Révoquer ce lien ? Le client ne pourra plus y accéder.')) return
    startTransition(async () => {
      await deletePortailToken(id)
      setTokens(t => t.filter(tk => tk.id !== id))
    })
  }

  function copyLink(token: string) {
    const url = `${siteUrl}/portail/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const activeTokens = tokens.filter(t => t.actif)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm text-[#78716c] hover:text-primary border border-[#e7e5e4] rounded-lg px-3 py-2 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
        Portail client
        {activeTokens.length > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            {activeTokens.length}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 bg-white border border-[#e7e5e4] rounded-xl p-4 space-y-3">
          <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Liens d&apos;accès client</div>

          {tokens.length === 0 ? (
            <p className="text-sm text-[#78716c]">Aucun lien généré. Créez-en un pour partager les rapports avec ce client.</p>
          ) : (
            <div className="space-y-2">
              {tokens.map(t => (
                <div key={t.id} className={`flex items-center gap-2 p-2.5 rounded-lg border ${t.actif ? 'border-[#e7e5e4] bg-[#fafaf9]' : 'border-[#f5f5f4] bg-[#fafaf9] opacity-50'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] text-[#78716c] truncate">
                      /portail/{t.token}
                    </div>
                    <div className="text-[10.5px] text-[#a8a29e] mt-0.5">
                      Créé le {new Date(t.created_at).toLocaleDateString('fr-FR')}
                      {!t.actif && ' · Révoqué'}
                    </div>
                  </div>
                  {t.actif && (
                    <button
                      type="button"
                      onClick={() => copyLink(t.token)}
                      className={`flex items-center gap-1 text-[11.5px] font-medium px-2.5 py-1.5 rounded-lg transition-colors shrink-0 ${
                        copied === t.token
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-primary/5 text-primary hover:bg-primary/10'
                      }`}
                    >
                      {copied === t.token ? (
                        <>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          Copié
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          Copier
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 text-[#c7c3c0] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Révoquer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Générer un nouveau lien
          </button>
        </div>
      )}
    </div>
  )
}
