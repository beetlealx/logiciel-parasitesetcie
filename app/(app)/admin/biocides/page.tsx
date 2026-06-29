import Link from 'next/link'
import { getBiocideProducts } from '@/app/actions/biocides'
import BiocidesManager from '@/components/admin/biocides-manager'

export default async function BiocidesAdminPage() {
  const products = await getBiocideProducts()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">
          ← Administration
        </Link>
        <h1 className="text-xl font-semibold text-[#1c1917] mt-1">Produits biocides</h1>
        <p className="text-sm text-[#78716c] mt-1">
          Ces listes apparaissent dans le menu déroulant lors de la saisie des biocides utilisés.
        </p>
      </div>
      <BiocidesManager initialProducts={products} />
    </div>
  )
}
