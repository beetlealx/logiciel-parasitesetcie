import Link from 'next/link'
import { listUsers } from '@/app/actions/admin-users'
import UsersManager from '@/components/admin/users-manager'

export default async function AdminUsersPage() {
  const { users, error } = await listUsers()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">
          ← Administration
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1c1917]">Utilisateurs</h1>
        <p className="text-sm text-[#78716c] mt-1">Gérer les accès et réinitialiser les mots de passe.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">{error}</div>
      )}

      <UsersManager initialUsers={users} />
    </div>
  )
}
