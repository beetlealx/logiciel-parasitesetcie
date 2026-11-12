import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Retour de la connexion Google (Supabase OAuth, flux PKCE).
// Seuls les comptes ayant un profil actif (domaine @parasites-compagnie.fr ou comptes V1) entrent.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dossiers'

  if (!code) return NextResponse.redirect(`${origin}/login?error=google`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/login?error=google`)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('active').eq('id', user.id).maybeSingle()
    : { data: null }

  if (!profile?.active) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=acces`)
  }

  return NextResponse.redirect(`${origin}${target}`)
}
