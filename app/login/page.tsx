'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ERREURS: Record<string, string> = {
  acces: 'Accès réservé aux comptes @parasites-compagnie.fr activés par un gérant.',
  google: 'La connexion Google a échoué. Réessayez.',
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: errorCode } = use(searchParams)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(errorCode ? ERREURS[errorCode] ?? '' : '')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Compte connecté mais sans profil actif : on ferme la session.
    if (errorCode === 'acces') createClient().auth.signOut()
  }, [errorCode])

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: 'parasites-compagnie.fr', prompt: 'select_account' },
      },
    })
    if (error) {
      setError('Impossible de lancer la connexion Google.')
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
    } else {
      router.push('/dossiers')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            P
          </div>
          <div>
            <div className="font-semibold text-[15px]">Parasites Compagnie</div>
            <div className="text-xs text-[#57534e]">Compte rendu d'intervention</div>
          </div>
        </div>

        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-sm">
          <h1 className="text-base font-semibold mb-5">Connexion</h1>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 border border-[#d6d3d1] rounded-lg py-3 text-sm font-medium hover:bg-[#f5f5f4] transition-colors disabled:opacity-60 min-h-[44px]"
          >
            <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/>
            </svg>
            {googleLoading ? 'Redirection…' : 'Se connecter avec Google'}
          </button>
          <p className="text-[11.5px] text-[#a8a29e] text-center mt-2 mb-5">Compte @parasites-compagnie.fr</p>

          <div className="flex items-center gap-3 mb-4 text-[11px] uppercase tracking-wide text-[#c7c3c0]">
            <span className="flex-1 border-t border-[#e7e5e4]" />ou<span className="flex-1 border-t border-[#e7e5e4]" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
                Email
              </label>
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
              <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
              />
            </div>

            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                {error}
              </p>
            )}

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
