'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveRappelSettings(payload: {
  email_dest: string
  jours_avant: number[]
  actif: boolean
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { error } = await supabase
    .from('rappel_settings')
    .upsert({ ...payload, user_id: user.id }, { onConflict: 'user_id' })

  if (error) return { error: error.message }
  revalidatePath('/admin/rappels')
  return { ok: true }
}
