'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MOBILE_LINKS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/interventions',
    label: 'Interventions',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    href: '/contrats',
    label: 'Contrats',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    href: '/sites',
    label: 'Sites',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/calendrier',
    label: 'Calendrier',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
]

const DESKTOP_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/interventions', label: 'Interventions' },
  { href: '/calendrier', label: 'Calendrier' },
  { href: '/contrats', label: 'Contrats' },
  { href: '/sites', label: 'Sites' },
  { href: '/admin', label: 'Administration' },
]

export default function AppNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop : barre horizontale en haut */}
      <nav className="hidden sm:flex bg-white border-b border-[#e7e5e4] px-5 gap-1">
        {DESKTOP_LINKS.map(({ href, label }) => {
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

      {/* Mobile : 5 onglets en bas (Admin accessible via desktop uniquement) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e7e5e4] flex">
        {MOBILE_LINKS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-primary' : 'text-[#a8a29e]'
              }`}
            >
              {icon}
              <span className="text-[9.5px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
