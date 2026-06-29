'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendInterventionEmail } from '@/lib/send-report-email'

export interface SignResult {
  emailSent: boolean
  emailError?: string
  clientEmail: string | null
}

export async function signIntervention(
  id: string,
  signataireNom: string,
  signatureDataUrl: string
): Promise<SignResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('interventions')
    .update({
      status: 'signed',
      signataire_nom: signataireNom.trim(),
      signature_data_url: signatureDataUrl,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'draft')

  if (error) return { emailSent: false, clientEmail: null }

  // Fetch client email to attempt auto-send
  const { data: iv } = await supabase
    .from('interventions')
    .select('client_email')
    .eq('id', id)
    .single()

  const clientEmail = iv?.client_email ?? null
  if (!clientEmail) return { emailSent: false, clientEmail: null }

  const result = await sendInterventionEmail(id, supabase, user.id)

  if (result.sent) {
    await supabase
      .from('interventions')
      .update({ status: 'sent' })
      .eq('id', id)
      .eq('user_id', user.id)
  }

  return { emailSent: result.sent, emailError: result.error, clientEmail }
}
