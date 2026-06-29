import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ContratForm from '@/components/contrats/contrat-form'

export default async function ModifierContratPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: contrat } = await supabase
    .from('contrats')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!contrat) notFound()

  return (
    <div className="max-w-xl mx-auto">
      <Link href={`/contrats/${id}`} className="text-xs text-[#a8a29e] hover:text-primary transition-colors">
        ← Retour au contrat
      </Link>
      <h1 className="text-xl font-semibold mt-2 mb-6">Modifier le contrat</h1>
      <ContratForm contrat={contrat} />
    </div>
  )
}
