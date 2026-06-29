import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPortailData } from '@/app/actions/portail'
import Image from 'next/image'

const TYPE_LABELS: Record<string, string> = {
  rats: 'Dératisation', frelons_guepes: 'Frelons & Guêpes',
  punaises_lit: 'Punaises de lit', fourmis: 'Fourmis',
  cafards: 'Cafards / Blattes', moustiques: 'Moustiques', mixte: 'Multi-nuisibles',
}
const TYPE_COLORS: Record<string, string> = {
  rats: '#ef4444', frelons_guepes: '#f59e0b', punaises_lit: '#8b5cf6',
  fourmis: '#f97316', cafards: '#78716c', moustiques: '#0ea5e9', mixte: '#6b7280',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default async function PortailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPortailData(token)
  if (!data) notFound()

  const byYear = data.interventions.reduce<Record<string, typeof data.interventions>>((acc, iv) => {
    const y = new Date(iv.intervention_date).getFullYear().toString()
    if (!acc[y]) acc[y] = []
    acc[y].push(iv)
    return acc
  }, {})
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* Header */}
      <header className="bg-white border-b border-[#e7e5e4] px-5 py-4 flex items-center gap-3">
        <Image src="/logo.png" alt="Parasites et Compagnie" width={36} height={36} className="rounded-lg shrink-0" />
        <div>
          <div className="font-semibold text-[15px] text-[#1c1917]">Parasites et Compagnie</div>
          <div className="text-[12px] text-[#78716c]">Portail client</div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Client */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-[#1c1917]">{data.client_name}</h1>
          <p className="text-sm text-[#78716c] mt-1">
            {data.interventions.length} intervention{data.interventions.length !== 1 ? 's' : ''} réalisée{data.interventions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {data.interventions.length === 0 ? (
          <div className="bg-white border border-[#e7e5e4] rounded-xl p-10 text-center text-[#a8a29e] text-sm">
            Aucun rapport disponible pour le moment.
          </div>
        ) : (
          <div className="space-y-6">
            {years.map(year => (
              <div key={year}>
                <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-2">{year}</div>
                <div className="flex flex-col gap-2">
                  {byYear[year].map(iv => (
                    <div key={iv.id} className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                            style={{ background: TYPE_COLORS[iv.intervention_type ?? ''] ?? '#6b7280' }}
                          />
                          <div>
                            <div className="font-medium text-[13.5px] text-[#1c1917]">
                              {TYPE_LABELS[iv.intervention_type ?? ''] ?? iv.type_intervention ?? 'Intervention'}
                            </div>
                            <div className="text-[12px] text-[#78716c] mt-0.5">{fmt(iv.intervention_date)}</div>
                            {iv.technician_name && (
                              <div className="text-[11.5px] text-[#a8a29e] mt-0.5">Technicien : {iv.technician_name}</div>
                            )}
                            {iv.synthese && (
                              <p className="text-[12.5px] text-[#57534e] mt-2 leading-relaxed line-clamp-3">{iv.synthese}</p>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/api/pdf/${iv.id}`}
                          target="_blank"
                          className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors shrink-0 border border-primary/20 rounded-lg px-3 py-1.5"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          </svg>
                          PDF
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-[#c7c3c0] mt-10">
          Ce portail est réservé à l&apos;usage exclusif de {data.client_name}.<br />
          Pour toute question : Parasites et Compagnie
        </p>
      </main>
    </div>
  )
}
