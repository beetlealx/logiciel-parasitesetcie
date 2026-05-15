'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteIntervention(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: iv }, { data: photos }] = await Promise.all([
    supabase.from('interventions').select('plan_image_path').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('photos').select('storage_path').eq('intervention_id', id),
  ])

  if (!iv) return { ok: false, error: 'Intervention introuvable' }

  const admin = createAdminClient()

  // Clean up storage files in parallel (non-blocking on error)
  await Promise.all([
    iv.plan_image_path
      ? admin.storage.from('plans').remove([iv.plan_image_path]).catch(() => null)
      : Promise.resolve(),
    (photos ?? []).length > 0
      ? admin.storage.from('photos').remove((photos ?? []).map(p => p.storage_path)).catch(() => null)
      : Promise.resolve(),
  ])

  const { error } = await supabase
    .from('interventions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
