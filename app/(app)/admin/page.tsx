import Link from 'next/link'

const CARDS = [
  {
    href: '/admin/devis-signes',
    title: 'Devis signés',
    description: 'Interventions créées automatiquement à la signature d’un devis Dolibarr.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/>
      </svg>
    ),
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    href: '/admin/clients',
    title: 'Clients',
    description: 'Créer un nouveau client dans Dolibarr.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    color: 'bg-sky-50 text-sky-600',
  },
  {
    href: '/admin/users',
    title: 'Utilisateurs',
    description: 'Gérer les accès, inviter et réinitialiser les mots de passe.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    color: 'bg-orange-50 text-orange-600',
  },
  {
    href: '/phrases',
    title: 'Phrases types',
    description: 'Gérer la bibliothèque de phrases insérables dans les synthèses.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    color: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/admin/biocides',
    title: 'Produits biocides',
    description: 'Catalogue de produits, AMM, stocks et alertes par type de nuisible.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
      </svg>
    ),
    color: 'bg-green-50 text-green-600',
  },
  {
    href: '/admin/techniciens',
    title: 'Techniciens',
    description: 'Gérer l\'équipe, numéros Certibiocide et dates d\'expiration.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    color: 'bg-cyan-50 text-cyan-600',
  },
  {
    href: '/admin/rappels',
    title: 'Rappels automatiques',
    description: 'Recevoir un email X jours avant qu\'une visite de contrat est due.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
    color: 'bg-violet-50 text-violet-600',
  },
  {
    href: '/admin/factures',
    title: 'Factures',
    description: 'Consulter les factures par client depuis Dolibarr.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
    color: 'bg-amber-50 text-amber-600',
  },
  {
    href: '/admin/devis',
    title: 'Devis',
    description: 'Consulter les devis par client depuis Dolibarr.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 17H7A5 5 0 017 7h2"/><path d="M15 7h2a5 5 0 010 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    color: 'bg-purple-50 text-purple-600',
  },
  {
    href: '/admin/registre',
    title: 'Registre réglementaire',
    description: 'Historique des utilisations de produits biocides, exportable en CSV.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
      </svg>
    ),
    color: 'bg-teal-50 text-teal-600',
  },
]

export default function AdminPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[#1c1917]">Administration</h1>
        <p className="text-sm text-[#78716c] mt-1">Gérer les paramètres et consulter les données Dolibarr.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white border border-[#e7e5e4] rounded-xl p-5 flex items-start gap-4 hover:border-[#c7c3c0] hover:shadow-sm transition-all group"
          >
            <span className={`p-2.5 rounded-lg shrink-0 ${card.color}`}>{card.icon}</span>
            <div>
              <p className="font-medium text-[#1c1917] group-hover:text-primary transition-colors">{card.title}</p>
              <p className="text-[13px] text-[#78716c] mt-0.5 leading-snug">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
