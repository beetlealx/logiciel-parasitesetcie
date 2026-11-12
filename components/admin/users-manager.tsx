'use client'

import { useState, useTransition } from 'react'
import {
  inviteUser,
  sendPasswordReset,
  deleteUser,
  setUserPassword,
  type AppUser,
} from '@/app/actions/admin-users'
import { toast } from 'sonner'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type DeleteState = 'idle' | 'confirming' | 'deleting'
type ResetState = 'idle' | 'sending' | 'sent'
type PwdState = 'idle' | 'open' | 'saving'

export default function UsersManager({ initialUsers }: { initialUsers: AppUser[] }) {
  const [users, setUsers] = useState<AppUser[]>(initialUsers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isPending, startTransition] = useTransition()

  const [deleteStates, setDeleteStates] = useState<Record<string, DeleteState>>({})
  const [resetStates, setResetStates] = useState<Record<string, ResetState>>({})
  const [pwdStates, setPwdStates] = useState<Record<string, PwdState>>({})
  const [pwdValues, setPwdValues] = useState<Record<string, string>>({})

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

  function startDelete(id: string) {
    setDeleteStates(s => ({ ...s, [id]: 'confirming' }))
  }

  function cancelDelete(id: string) {
    setDeleteStates(s => ({ ...s, [id]: 'idle' }))
  }

  async function confirmDelete(user: AppUser) {
    setDeleteStates(s => ({ ...s, [user.id]: 'deleting' }))
    const result = await deleteUser(user.id)
    if (result.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id))
      toast.success(`Utilisateur ${user.email} supprimé`)
    } else {
      setDeleteStates(s => ({ ...s, [user.id]: 'idle' }))
      toast.error(result.error ?? 'Erreur lors de la suppression')
    }
  }

  function togglePwd(id: string) {
    setPwdStates(s => {
      const next = s[id] === 'open' ? 'idle' : 'open'
      return { ...s, [id]: next }
    })
    setPwdValues(s => ({ ...s, [id]: '' }))
  }

  async function handleSetPassword(user: AppUser) {
    const pwd = pwdValues[user.id] ?? ''
    if (!pwd) return
    setPwdStates(s => ({ ...s, [user.id]: 'saving' }))
    const result = await setUserPassword(user.id, pwd)
    if (result.ok) {
      setPwdStates(s => ({ ...s, [user.id]: 'idle' }))
      setPwdValues(s => ({ ...s, [user.id]: '' }))
      toast.success(`Mot de passe de ${user.email} mis à jour`)
    } else {
      setPwdStates(s => ({ ...s, [user.id]: 'open' }))
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
            const resetState = resetStates[u.id] ?? 'idle'
            const deleteState = deleteStates[u.id] ?? 'idle'
            const pwdState = pwdStates[u.id] ?? 'idle'
            const pwdValue = pwdValues[u.id] ?? ''

            return (
              <div key={u.id}>
                <div className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1c1917] truncate">{u.email}</p>
                    <p className="text-[11px] text-[#a8a29e] mt-0.5">
                      Créé le {fmtDate(u.created_at)}
                      {u.last_sign_in_at && ` · Dernière connexion ${fmtDate(u.last_sign_in_at)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Réinitialiser par email */}
                    <button
                      type="button"
                      onClick={() => handleReset(u)}
                      disabled={resetState !== 'idle' || deleteState === 'deleting'}
                      title="Envoyer un lien de réinitialisation par email"
                      className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-[#d6d3d1] text-[#57534e] hover:bg-[#f5f5f4] disabled:opacity-50 transition-colors"
                    >
                      {resetState === 'sending' ? (
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                      ) : resetState === 'sent' ? (
                        <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      )}
                      {resetState === 'sent' ? 'Envoyé' : 'Lien email'}
                    </button>

                    {/* Changer mot de passe directement */}
                    <button
                      type="button"
                      onClick={() => togglePwd(u.id)}
                      disabled={deleteState === 'deleting'}
                      title="Définir un nouveau mot de passe"
                      className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                        pwdState === 'open' || pwdState === 'saving'
                          ? 'border-primary/40 bg-primary/5 text-primary'
                          : 'border-[#d6d3d1] text-[#57534e] hover:bg-[#f5f5f4]'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 17v-2m-6 2v-2M18 17v-2M3 10h18M5 20h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg>
                      MDP
                    </button>

                    {/* Supprimer */}
                    {deleteState === 'idle' && (
                      <button
                        type="button"
                        onClick={() => startDelete(u.id)}
                        title="Supprimer l'utilisateur"
                        className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-[#d6d3d1] text-[#ef4444] hover:bg-red-50 hover:border-red-200 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        Supprimer
                      </button>
                    )}
                    {deleteState === 'confirming' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#ef4444] font-medium">Confirmer ?</span>
                        <button
                          type="button"
                          onClick={() => confirmDelete(u)}
                          className="text-[12px] px-2.5 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelDelete(u.id)}
                          className="text-[12px] px-2.5 py-1.5 rounded-lg border border-[#d6d3d1] text-[#57534e] hover:bg-[#f5f5f4] transition-colors"
                        >
                          Non
                        </button>
                      </div>
                    )}
                    {deleteState === 'deleting' && (
                      <svg className="w-4 h-4 animate-spin text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
                    )}
                  </div>
                </div>

                {/* Formulaire changement mot de passe (inline) */}
                {(pwdState === 'open' || pwdState === 'saving') && (
                  <div className="px-4 pb-3 flex gap-2 items-center bg-[#fafaf9] border-t border-[#f5f5f4]">
                    <div className="relative flex-1">
                      <input
                        type="password"
                        value={pwdValue}
                        onChange={e => setPwdValues(s => ({ ...s, [u.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleSetPassword(u) }}
                        placeholder="Nouveau mot de passe (min. 8 car.)"
                        autoFocus
                        className="w-full px-3 py-2 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSetPassword(u)}
                      disabled={pwdState === 'saving' || pwdValue.length < 8}
                      className="px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {pwdState === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePwd(u.id)}
                      disabled={pwdState === 'saving'}
                      className="px-3 py-2 border border-[#d6d3d1] text-sm text-[#57534e] rounded-lg hover:bg-[#f5f5f4] transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                )}
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
