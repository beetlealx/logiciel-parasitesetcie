'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'verifying' | 'ready' | 'loading' | 'done' | 'invalid'>('verifying')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const supabase = createClient()

    if (token_hash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash, type: 'recovery' }).then(({ error }) => {
        if (error) {
          console.error('[reset-password] verifyOtp:', error.message)
          setStatus('invalid')
        } else {
          setStatus('ready')
        }
      })
    } else {
      // Invite flow: session already set by /auth/callback
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setStatus('ready')
        } else {
          setStatus('invalid')
        }
      })
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setStatus('loading'); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setStatus('ready') }
    else { setStatus('done'); setTimeout(() => router.push('/interventions'), 2000) }
  }

  const Logo = () => (
    <div className="flex flex-col items-center gap-3 mb-8">
      <Image src="/logo-horizontal.png" alt="Parasites & Cie — Objectif zéro nuisance" width={300} height={100} className="w-[300px] max-w-full h-auto" priority />
      <div className="text-xs text-[#57534e]">Compte rendu d'intervention</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Logo />
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 shadow-sm">

          {status === 'verifying' && (
            <div className="text-center py-6 text-sm text-[#78716c]">Vérification du lien…</div>
          )}

          {status === 'invalid' && (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <p className="font-medium text-[#1c1917]">Lien invalide ou expiré</p>
              <p className="text-sm text-[#78716c] mt-1">Demandez un nouveau lien depuis la page de connexion.</p>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Retour à la connexion
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="font-medium text-[#1c1917]">Mot de passe mis à jour</p>
              <p className="text-sm text-[#78716c] mt-1">Redirection en cours…</p>
            </div>
          )}

          {(status === 'ready' || status === 'loading') && (
            <>
              <h1 className="text-base font-semibold mb-1">Nouveau mot de passe</h1>
              <p className="text-sm text-[#78716c] mb-5">Choisissez un mot de passe d'au moins 8 caractères.</p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">Confirmer</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
                  />
                </div>
                {error && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">{error}</p>}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-primary text-primary-foreground rounded-lg py-3 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 min-h-[44px]"
                >
                  {status === 'loading' ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
        <div className="text-sm text-[#78716c]">Chargement…</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
