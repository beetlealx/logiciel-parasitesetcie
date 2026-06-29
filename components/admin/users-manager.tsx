'use client'

import { useState, useTransition } from 'react'
import { inviteUser, sendPasswordReset, type AppUser } from '@/app/actions/admin-users'
import { toast } from 'sonner'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function UsersManager({ initialUsers }: { initialUsers: AppUser[] }) {
  const [users] = useState<AppUser[]>(initialUsers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [resetStates, setResetStates] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({})

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    startTransition(async () => {
      const result = await inviteUser(inviteEmail.trim())
      if (result.ok) {
        toast.success(`Invitation envoyée à ${inviteEmail}`)
        setInviteEmail('')
      } else {
        toast.error(result.error ?? 'Erreur lors de l\'invitation')
      }
    })
  }

  async function handleReset(user: AppUser) {
    setResetStates(s => ({ ...s, [user.id]: 'sending' }))
    const result = await sendPasswordReset(user.email)
    if (result.ok) {
      setResetStates(s => ({ ...s, [user.id]: 'sent' }))
      toast.success(`Lien envoyé à ${user.email}`)
    } else {
      setResetStates(s => ({ ...s, [user.id]: 'idle' }))
      toast.error(result.error ?? 'Erreur')
    }
  }

  return (
    <div className="space-y-6">

      {/* Liste des utilisateurs */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#f5f5f4] bg-[#fafaf9]">
          <h2 className="font-medium text-sm text-[#1c1917]">Utilisateurs ({users.length})</h2>
        </div>
        <div className="divide-y divide-[#f5f5f4]">
          {users.map(u => {
            const state = resetStates[u.id] ?? 'idle'
            return (
              <div key={u.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1c1917] truncate">{u.email}</p>
                  <p className="text-[11px] text-[#a8a29e] mt-0.5">
                    Créé le {fmtDate(u.created_at)}
                    {u.last_sign_in_at && ` · Dernière connexion ${fmtDate(u.last_sign_in_at)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleReset(u)}
                  disabled={state !== 'idle'}
                  className="shrink-0 flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-[#d6d3d1] text-[#57534e] hover:bg-[#f5f5f4] disabled:opacity-50 transition-colors"
                >
                  {state === 'sending' ? (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                  ) : state === 'sent' ? (
                    <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  )}
                  {state === 'sent' ? 'Envoyé' : 'Réinitialiser'}
                </button>
              </div>
            )
          })}
          {users.length === 0 && (
            <p className="px-4 py-4 text-sm text-[#a8a29e]">Aucun utilisateur.</p>
          )}
        </div>
      </div>

      {/* Inviter un nouvel utilisateur */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#f5f5f4] bg-[#fafaf9]">
          <h2 className="font-medium text-sm text-[#1c1917]">Inviter un utilisateur</h2>
          <p className="text-[12px] text-[#a8a29e] mt-0.5">Un email d'invitation avec un lien de connexion sera envoyé.</p>
        </div>
        <form onSubmit={handleInvite} className="px-4 py-4 flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="email@exemple.fr"
            required
            className="flex-1 px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
          />
          <button
            type="submit"
            disabled={isPending || !inviteEmail.trim()}
            className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px] whitespace-nowrap"
          >
            {isPending ? 'Envoi…' : 'Inviter'}
          </button>
        </form>
      </div>

    </div>
  )
}
