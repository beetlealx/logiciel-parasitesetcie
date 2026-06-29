'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface BiocideProduct {
  id: string
  type_intervention: string
  nom: string
  ordre: number
  numero_amm: string | null
  substance_active: string | null
  dosage_defaut: string | null
  delai_reentree: string | null
  mode_application: string | null
  unite: string
  quantite: number
  seuil_alerte: number
}

export async function getBiocideProducts(): Promise<BiocideProduct[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('biocide_products')
    .select('id, type_intervention, nom, ordre, numero_amm, substance_active, dosage_defaut, delai_reentree, mode_application, unite, quantite, seuil_alerte')
    .order('type_intervention')
    .order('ordre')
  return (data ?? []) as BiocideProduct[]
}

export async function getBiocidesByType(): Promise<Record<string, string[]>> {
  const products = await getBiocideProducts()
  const result: Record<string, string[]> = {}
  for (const p of products) {
    if (!result[p.type_intervention]) result[p.type_intervention] = []
    result[p.type_intervention].push(p.nom)
  }
  return result
}

export async function getBiocidesByTypeRich(): Promise<Record<string, BiocideProduct[]>> {
  const products = await getBiocideProducts()
  const result: Record<string, BiocideProduct[]> = {}
  for (const p of products) {
    if (!result[p.type_intervention]) result[p.type_intervention] = []
    result[p.type_intervention].push(p)
  }
  return result
}

export async function updateBiocideProduct(id: string, patch: Partial<Pick<BiocideProduct, 'numero_amm' | 'substance_active' | 'dosage_defaut' | 'delai_reentree' | 'mode_application' | 'unite' | 'seuil_alerte'>>): Promise<void> {
  const supabase = await createClient()
  await supabase.from('biocide_products').update(patch).eq('id', id)
  revalidatePath('/admin/biocides')
  revalidatePath('/dashboard')
}

export interface StockMouvement {
  id: string
  biocide_product_id: string
  type: 'entree' | 'sortie'
  quantite: number
  note: string | null
  created_at: string
}

export async function addMouvement(payload: {
  biocide_product_id: string
  type: 'entree' | 'sortie'
  quantite: number
  note?: string | null
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: product } = await supabase
    .from('biocide_products')
    .select('id, quantite')
    .eq('id', payload.biocide_product_id)
    .single()
  if (!product) return { error: 'Produit introuvable' }

  const delta = payload.type === 'entree' ? payload.quantite : -payload.quantite
  const newQty = Number(product.quantite) + delta
  if (newQty < 0) return { error: 'Stock insuffisant' }

  const { error } = await supabase.from('stock_mouvements').insert({
    biocide_product_id: payload.biocide_product_id,
    type: payload.type,
    quantite: payload.quantite,
    note: payload.note ?? null,
    user_id: user.id,
  })
  if (error) return { error: error.message }

  await supabase.from('biocide_products').update({ quantite: newQty }).eq('id', payload.biocide_product_id)
  revalidatePath('/admin/biocides')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function getStocksEnAlerte(): Promise<BiocideProduct[]> {
  const products = await getBiocideProducts()
  return products.filter(p => p.seuil_alerte > 0 && p.quantite <= p.seuil_alerte)
}

export async function addBiocideProduct(type_intervention: string, nom: string): Promise<void> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('biocide_products')
    .select('*', { count: 'exact', head: true })
    .eq('type_intervention', type_intervention)

  await supabase.from('biocide_products').insert({
    type_intervention,
    nom: nom.trim(),
    ordre: (count ?? 0) + 1,
  })
  revalidatePath('/admin/biocides')
}

export async function removeBiocideProduct(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('biocide_products').delete().eq('id', id)
  revalidatePath('/admin/biocides')
}
