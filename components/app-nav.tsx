'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/dossiers', label: 'Dossiers', gerantOnly: false },
  { href: '/interventions', label: 'Interventions', gerantOnly: false },
  { href: '/sites', label: 'Sites', gerantOnly: false },
  { href: '/parametres', label: 'Paramètres', gerantOnly: true },
]

export default function AppNav({ isGerant }: { isGerant: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-[#e7e5e4] px-5 flex gap-1">
      {LINKS.filter(l => isGerant || !l.gerantOnly).map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`text-[13.5px] font-medium px-3 py-2.5 border-b-2 transition-colors ${
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
