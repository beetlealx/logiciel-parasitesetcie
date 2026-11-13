'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { requestPasswordReset } from '@/app/actions/auth'

type Mode = 'login' | 'forgot' | 'forgot-sent'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
    } else {
      router.push('/interventions')
      router.refresh()
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    await requestPasswordReset(email)
    setLoading(false)
    setMode('forgot-sent')
  }

  const Logo = () => (
    <div className="flex flex-col items-center gap-3 mb-8">
      <Image src="/logo-horizontal.png" alt="Parasites & Cie — Objectif zéro nuisance" width={300} height={100} className="w-[300px] max-w-full h-auto" priority />
      <div className="text-xs text-[#57534e]">Compte rendu d'intervention</div>
    </div>
  )

  if (mode === 'forgot-sent') {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Logo />
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-sm text-center">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="font-medium text-[#1c1917]">Email envoyé</p>
            <p className="text-sm text-[#78716c] mt-1">Si un compte existe pour {email}, vous recevrez un lien de réinitialisation.</p>
            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Logo />
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-sm">
            <h1 className="text-base font-semibold mb-1">Mot de passe oublié</h1>
            <p className="text-sm text-[#78716c] mb-5">Entrez votre email pour recevoir un lien de réinitialisation.</p>
            <form onSubmit={handleForgot} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
                />
              </div>
              {error && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground rounded-lg py-3 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className="text-sm text-[#78716c] hover:text-[#1c1917] text-center transition-colors"
              >
                ← Retour à la connexion
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Logo />
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-sm">
          <h1 className="text-base font-semibold mb-5">Connexion</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium">Mot de passe</label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError('') }}
                  className="text-[11px] text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
              />
            </div>
            {error && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-lg py-3 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 mt-1 min-h-[44px]"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
