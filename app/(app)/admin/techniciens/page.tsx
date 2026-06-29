import Link from 'next/link'
import { getTechniciens } from '@/app/actions/techniciens'
import TechniciensManager from '@/components/admin/techniciens-manager'

export default async function TechniciensAdminPage() {
  const techniciens = await getTechniciens()

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/admin" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">
          ← Administration
        </Link>
        <h1 className="text-xl font-semibold text-[#1c1917] mt-1">Techniciens</h1>
        <p className="text-sm text-[#78716c] mt-0.5">
          Gérer l'équipe et suivre les certifications Certibiocide.
        </p>
      </div>

      <TechniciensManager initial={techniciens} />
    </div>
  )
}
