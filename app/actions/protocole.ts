'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { envoyerProtocole, type EnvoiResult } from '@/lib/protocoles'

/** Envoi manuel (ou renvoi) de la fiche de préparation au client. */
export async function envoyerProtocoleAction(interventionId: string): Promise<EnvoiResult & { at?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const r = await envoyerProtocole(createAdminClient(), interventionId, { force: true })
  revalidatePath(`/interventions/${interventionId}`)
  return r.ok ? { ...r, at: new Date().toISOString() } : r
}
