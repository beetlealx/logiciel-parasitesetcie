'use client'

import { useRouter } from 'next/navigation'
import type { RegistreEntry } from '@/app/actions/registre'

const NUISIBLE_LABELS: Record<string, string> = {
  rats: 'Rongeurs',
  cafards: 'Blattes / Cafards',
  punaises: 'Punaises de lit',
  fourmis: 'Fourmis',
  mouches: 'Mouches / Diptères',
  guepes: 'Guêpes / Frelons',
  mites: 'Mites alimentaires',
  termites: 'Termites',
}

const COLS = [
  { key: 'date', label: 'Date' },
  { key: 'reference', label: 'Référence' },
  { key: 'client', label: 'Client' },
  { key: 'technicien', label: 'Technicien' },
  { key: 'nuisible', label: 'Nuisible' },
  { key: 'produit', label: 'Produit' },
  { key: 'numero_amm', label: 'N° AMM' },
  { key: 'substance_active', label: 'Substance active' },
  { key: 'quantite', label: 'Quantité' },
  { key: 'zone_traitee', label: 'Zone traitée' },
  { key: 'mode_application', label: 'Mode application' },
  { key: 'delai_reentree', label: 'Délai réentrée' },
]

function toCSV(entries: RegistreEntry[]): string {
  const header = COLS.map(c => `"${c.label}"`).join(';')
  const rows = entries.map(e =>
    [
      e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '',
      e.reference,
      e.client,
      e.technicien,
      NUISIBLE_LABELS[e.nuisible] ?? e.nuisible,
      e.produit,
      e.numero_amm,
      e.substance_active,
      e.quantite,
      e.zone_traitee,
      e.mode_application,
      e.delai_reentree,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')
  )
  return [header, ...rows].join('\n')
}

interface Props {
  entries: RegistreEntry[]
  annee: number
  annees: number[]
}

export default function RegistreTable({ entries, annee, annees }: Props) {
  const router = useRouter()

  function downloadCSV() {
    const csv = toCSV(entries)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registre-biocides-${annee}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#78716c]">Année :</span>
          <select
            value={annee}
            onChange={e => router.push(`/admin/registre?annee=${e.target.value}`)}
            className="border border-[#d6d3d1] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
          >
            {annees.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-sm text-[#a8a29e]">— {entries.length} entrée{entries.length !== 1 ? 's' : ''}</span>
        </div>

        <button
          onClick={downloadCSV}
          disabled={entries.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e7e5e4] text-sm text-[#1c1917] hover:border-[#c7c3c0] hover:bg-[#fafaf9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exporter CSV
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-10 text-center text-sm text-[#a8a29e]">
          Aucune utilisation de produit biocide enregistrée pour {annee}.
        </div>
      ) : (
        <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-x-auto">
          <table className="w-full text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-[#e7e5e4] bg-[#fafaf9]">
                {COLS.map(c => (
                  <th key={c.key} className="text-left px-3 py-2.5 font-semibold text-[#78716c] whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f4]">
              {entries.map((e, i) => (
                <tr key={`${e.intervention_id}-${i}`} className="hover:bg-[#fafaf9] transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap text-[#1c1917]">
                    {e.date ? new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <a href={`/interventions/${e.intervention_id}`} className="text-primary hover:underline font-medium">
                      {e.reference || '—'}
                    </a>
                  </td>
                  <td className="px-3 py-2 max-w-[140px] truncate" title={e.client}>{e.client || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{e.technicien || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{(NUISIBLE_LABELS[e.nuisible] ?? e.nuisible) || '—'}</td>
                  <td className="px-3 py-2 font-medium text-[#1c1917]">{e.produit || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#78716c]">{e.numero_amm || <span className="text-[#d6d3d1]">—</span>}</td>
                  <td className="px-3 py-2 max-w-[120px] truncate text-[#78716c]" title={e.substance_active}>{e.substance_active || <span className="text-[#d6d3d1]">—</span>}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{e.quantite || '—'}</td>
                  <td className="px-3 py-2 max-w-[120px] truncate text-[#78716c]" title={e.zone_traitee}>{e.zone_traitee || <span className="text-[#d6d3d1]">—</span>}</td>
                  <td className="px-3 py-2 max-w-[120px] truncate text-[#78716c]" title={e.mode_application}>{e.mode_application || <span className="text-[#d6d3d1]">—</span>}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#78716c]">{e.delai_reentree || <span className="text-[#d6d3d1]">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px] text-[#a8a29e]">
        Conformément à l'arrêté du 9 octobre 2013 relatif aux conditions d'exercice de l'activité de services relatifs aux techniques de prévention et de lutte contre les organismes nuisibles.
      </p>
    </div>
  )
}
