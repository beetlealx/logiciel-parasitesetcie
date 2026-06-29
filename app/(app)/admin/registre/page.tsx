import Link from 'next/link'
import { getRegistreEntries } from '@/app/actions/registre'
import RegistreTable from '@/components/admin/registre-table'

interface Props {
  searchParams: Promise<{ annee?: string }>
}

export default async function RegistrePage({ searchParams }: Props) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const annee = params.annee ? parseInt(params.annee) : currentYear

  const entries = await getRegistreEntries(annee)

  const annees: number[] = []
  for (let y = currentYear; y >= currentYear - 4; y--) annees.push(y)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/admin" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">
          ← Administration
        </Link>
        <h1 className="text-xl font-semibold text-[#1c1917] mt-1">Registre réglementaire</h1>
        <p className="text-sm text-[#78716c] mt-0.5">
          Utilisation des produits biocides — arrêté du 9 oct. 2013.
        </p>
      </div>

      <RegistreTable entries={entries} annee={annee} annees={annees} />
    </div>
  )
}
