import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/sign-out-button'
import AppNav from '@/components/app-nav'
import Image from 'next/image'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="sticky top-0 z-10">
        <header className="bg-white px-5 py-3.5 flex justify-between items-center border-b border-[#e7e5e4]">
          <a href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="Parasites et Compagnie" width={36} height={36} className="rounded-lg shrink-0" />
            <span className="font-semibold text-[15px]">Parasites et Compagnie</span>
          </a>
          <SignOutButton />
        </header>
        <AppNav />
      </div>
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>
    </div>
  )
}
