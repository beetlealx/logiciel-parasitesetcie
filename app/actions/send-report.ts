'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendInterventionEmail } from '@/lib/send-report-email'
import { createActionCRM, createTiers } from '@/lib/dolibarr'

export type SendResult =
  | { ok: true; emailSent: boolean; crmCreated: boolean; tiersCreated: boolean; emailError?: string; tiersError?: string }
  | { ok: false; error: string }

export async function sendReport(interventionId: string): Promise<SendResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch intervention metadata
  const { data: iv } = await supabase
    .from('interventions')
    .select('reference, status, dolibarr_tiers_id, client_name, client_address, client_email, intervention_date, technician_name, type_intervention, synthese')
    .eq('id', interventionId)
    .eq('user_id', user.id)
    .single()

  if (!iv) return { ok: false, error: 'Intervention introuvable' }
  if (iv.status === 'draft') return { ok: false, error: 'L\'intervention doit être signée avant envoi' }

  // Création du tiers Dolibarr si le client n'y est pas encore
  let tiersCreated = false
  let tiersError: string | undefined
  let tiersId = iv.dolibarr_tiers_id
  if (!tiersId) {
    const result = await createTiers({
      name: iv.client_name,
      address: iv.client_address ?? '',
      email: iv.client_email,
    })
    if (result.id) {
      tiersId = result.id
      tiersCreated = true
      // Lier toutes les interventions existantes du même client (même user, même nom)
      await supabase
        .from('interventions')
        .update({ dolibarr_tiers_id: result.id })
        .eq('user_id', user.id)
        .eq('client_name', iv.client_name)
        .is('dolibarr_tiers_id', null)
    } else {
      tiersError = result.error
    }
  }

  // Send email (generates PDF internally)
  let emailSent = false
  let emailError: string | undefined
  if (iv.client_email) {
    const emailResult = await sendInterventionEmail(interventionId, supabase, user.id)
    emailSent = emailResult.sent
    emailError = emailResult.error
  }

  // CRM Dolibarr (non-bloquant)
  let crmCreated = false
  if (tiersId) {
    const ts = Math.floor(new Date(iv.intervention_date).getTime() / 1000)
    const actionId = await createActionCRM({
      label: `CR Intervention ${iv.reference}`,
      datep: ts,
      datef: ts,
      socid: tiersId,
      note: iv.synthese ?? '',
    })
    if (actionId) {
      crmCreated = true
      await supabase
        .from('interventions')
        .update({ dolibarr_action_id: actionId })
        .eq('id', interventionId)
    }
  }

  // Mark as sent
  await supabase
    .from('interventions')
    .update({ status: 'sent' })
    .eq('id', interventionId)
    .eq('user_id', user.id)

  return { ok: true, emailSent, crmCreated, tiersCreated, emailError, tiersError }
}
