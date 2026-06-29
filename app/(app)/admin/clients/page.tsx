import Link from 'next/link'
import CreateClientForm from '@/components/admin/create-client-form'

export default function AdminClientsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">
          ← Administration
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1c1917]">Clients</h1>
        <p className="text-sm text-[#78716c] mt-1">Créer un nouveau client dans Dolibarr.</p>
      </div>
      <CreateClientForm />
    </div>
  )
}
