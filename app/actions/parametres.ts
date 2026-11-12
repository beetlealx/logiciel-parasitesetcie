'use server'

import { revalidatePath } from 'next/cache'
import { requireGerant } from '@/lib/auth'
import { normalize } from '@/lib/typage'

export async function updatePrestationType(
  code: string,
  patch: { keywords: string; offsets: string; duree: number; facturation: 'par_passage' | 'par_contrat' },
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireGerant()

  const keywords = [...new Set(patch.keywords.split(',').map(k => normalize(k)).filter(Boolean))]
  const offsets = patch.offsets
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isFinite(n) && n >= 0 && n <= 730)
  if (offsets.length === 0) return { ok: false, error: 'Au moins un passage (ex. « 0, 15 »)' }

  const { error } = await supabase
    .from('prestation_types')
    .update({
      keywords,
      schedule_offsets: [...new Set(offsets)].sort((a, b) => a - b),
      default_duration_min: Math.max(15, Math.min(patch.duree || 60, 1440)),
      default_billing: patch.facturation,
    })
    .eq('code', code)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/parametres')
  return { ok: true }
}

export async function addProductMapping(ref: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireGerant()
  const clean = ref.trim()
  if (!clean) return { ok: false, error: 'Référence produit vide' }
  const { error } = await supabase.from('product_mappings').upsert({ dolibarr_product_ref: clean, prestation_code: code })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/parametres')
  return { ok: true }
}

export async function deleteProductMapping(ref: string) {
  const { supabase } = await requireGerant()
  await supabase.from('product_mappings').delete().eq('dolibarr_product_ref', ref)
  revalidatePath('/parametres')
}

export async function updateMembre(
  id: string,
  patch: { full_name: string; role: 'gerant' | 'technicien'; certibiocide: string; active: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireGerant()
  if (id === user.id && (patch.role !== 'gerant' || !patch.active)) {
    return { ok: false, error: 'Vous ne pouvez pas retirer vos propres droits de gérant' }
  }
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: patch.full_name.trim() || null,
      role: patch.role,
      certibiocide: patch.certibiocide.trim() || null,
      active: patch.active,
    })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/parametres')
  return { ok: true }
}
