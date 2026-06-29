'use server'

import { createTiers } from '@/lib/dolibarr'

export async function createClient(payload: {
  name: string
  address: string
  email: string | null
}): Promise<{ id: number | null; error?: string }> {
  return createTiers(payload)
}
