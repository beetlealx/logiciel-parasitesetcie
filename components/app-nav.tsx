'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/interventions', label: 'Interventions' },
  { href: '/sites', label: 'Sites' },
]

export default function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-[#e7e5e4] px-5 flex gap-1">
      {LINKS.map(({ href, label }) => {
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
