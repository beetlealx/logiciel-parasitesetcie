'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-[#57534e] hover:text-[#1c1917] px-3 py-2 rounded-lg hover:bg-[#f5f5f4] transition-colors min-h-[44px]"
    >
      Déconnexion
    </button>
  )
}
