'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface PhotoRow {
  id: string
  storage_path: string
  caption: string | null
  url: string
}

export async function uploadPhoto(
  interventionId: string,
  formData: FormData
): Promise<PhotoRow | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('file') as File | null
  if (!file) return { error: 'Fichier manquant' }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path = `${user.id}/${interventionId}/${filename}`
  const contentType = file.type || 'image/jpeg'

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('photos')
    .upload(path, file, { contentType })

  if (uploadError) {
    console.error('[uploadPhoto] storage error:', uploadError.message)
    return { error: uploadError.message }
  }

  const { data: photo, error: insertError } = await supabase
    .from('photos')
    .insert({ intervention_id: interventionId, storage_path: path })
    .select('id, storage_path, caption')
    .single()

  if (insertError || !photo) {
    await admin.storage.from('photos').remove([path])
    return { error: 'Erreur base de données' }
  }

  const { data: signed } = await admin.storage
    .from('photos')
    .createSignedUrl(path, 7200)

  return { id: photo.id, storage_path: photo.storage_path, caption: photo.caption, url: signed?.signedUrl ?? '' }
}

export async function updatePhotoCaption(id: string, caption: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('photos').update({ caption: caption || null }).eq('id', id)
}

export async function deletePhoto(id: string, storagePath: string): Promise<void> {
  const supabase = await createClient()
  const admin = createAdminClient()
  await Promise.all([
    supabase.from('photos').delete().eq('id', id),
    admin.storage.from('photos').remove([storagePath]),
  ])
}
