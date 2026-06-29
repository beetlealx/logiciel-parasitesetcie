'use client'

import { useState } from 'react'
import { createClient } from '@/app/actions/admin-clients'

interface Result { id: number | null; ref?: string; error?: string }

export default function CreateClientForm() {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<Result | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading'); setResult(null)
    const res = await createClient({ name: name.trim(), address: address.trim(), email: email.trim() || null })
    if (res.id) {
      setResult({ id: res.id })
      setStatus('done')
      setName(''); setAddress(''); setEmail('')
    } else {
      setResult({ id: null, error: res.error })
      setStatus('error')
    }
  }

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-[#f5f5f4] bg-[#fafaf9]">
        <h2 className="font-medium text-sm text-[#1c1917]">Créer un nouveau client</h2>
        <p className="text-[12px] text-[#a8a29e] mt-0.5">Le client sera créé directement dans Dolibarr.</p>
      </div>
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
            Nom / Raison sociale <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Nom du client ou de la société"
            className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">Adresse</label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            rows={2}
            placeholder="Adresse complète"
            className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@exemple.fr"
            className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
          />
        </div>

        {status === 'done' && result?.id && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Client créé dans Dolibarr (ID : {result.id})
          </div>
        )}
        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {result?.error ?? 'Erreur lors de la création'}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading' || !name.trim()}
          className="w-full bg-primary text-white text-sm font-medium py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px]"
        >
          {status === 'loading' ? 'Création en cours…' : 'Créer le client'}
        </button>
      </form>
    </div>
  )
}
