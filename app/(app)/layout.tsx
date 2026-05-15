import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/sign-out-button'
import AppNav from '@/components/app-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="sticky top-0 z-10">
        <header className="bg-white px-5 py-3.5 flex justify-between items-center border-b border-[#e7e5e4]">
          <div className="flex items-center gap-2.5 font-semibold text-[15px]">
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
              P
            </span>
            <span>Parasites Compagnie</span>
          </div>
          <SignOutButton />
        </header>
        <AppNav />
      </div>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
