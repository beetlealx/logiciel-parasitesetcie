'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIntervention(
  id: string,
  signataireNom: string,
  signatureDataUrl: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('interventions')
    .update({
      status: 'signed',
      signataire_nom: signataireNom.trim(),
      signature_data_url: signatureDataUrl,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'draft')
}
