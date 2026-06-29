'use client'

const NIVEAUX: { label: string; color: string; bg: string; text: string }[] = [
  { label: 'Faible',     color: '#22c55e', bg: '#f0fdf4', text: '#166534' },
  { label: 'Modéré',     color: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  { label: 'Élevé',      color: '#f97316', bg: '#fff7ed', text: '#9a3412' },
  { label: 'Très élevé', color: '#ef4444', bg: '#fef2f2', text: '#991b1b' },
]

const SIGNES = ['Piqûres', 'Mues', 'Excréments', 'Œufs', 'Insectes vivants', 'Odeur'] as const

interface Props {
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
  disabled?: boolean
}

export default function EtatInitialSection({ value, onChange, disabled }: Props) {
  const niveau = (value.niveau_infestation as string) ?? ''
  const signes = (value.signes as string[]) ?? []
  const nbPieces = (value.nb_pieces as number | undefined)
  const COLOR = '#7c2d12'

  function toggleSigne(s: string) {
    const next = signes.includes(s) ? signes.filter(x => x !== s) : [...signes, s]
    onChange({ ...value, signes: next })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-2.5">
          Niveau d'infestation
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {NIVEAUX.map(n => {
            const selected = niveau === n.label
            return (
              <button
                key={n.label}
                type="button"
                onClick={() => !disabled && onChange({ ...value, niveau_infestation: n.label })}
                disabled={disabled}
                className="py-2.5 px-2 rounded-lg border text-sm font-medium text-center transition-colors min-h-[44px]"
                style={selected
                  ? { borderColor: n.color, background: n.bg, color: n.text }
                  : { borderColor: '#d6d3d1', color: '#57534e' }
                }
              >
                {n.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-2.5">Signes observés</p>
        <div className="flex flex-wrap gap-2">
          {SIGNES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => !disabled && toggleSigne(s)}
              disabled={disabled}
              className="px-3 py-1.5 rounded-full border text-sm transition-colors"
              style={signes.includes(s)
                ? { borderColor: COLOR, background: COLOR, color: '#fff' }
                : { borderColor: '#d6d3d1', color: '#57534e' }
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
          Nombre de pièces concernées
        </label>
        <input
          type="number"
          min={1}
          value={nbPieces ?? ''}
          onChange={e => onChange({ ...value, nb_pieces: e.target.value ? Number(e.target.value) : undefined })}
          disabled={disabled}
          placeholder="Ex : 2"
          className="w-full sm:w-32 px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px] disabled:bg-[#f5f5f4]"
        />
      </div>
    </div>
  )
}
