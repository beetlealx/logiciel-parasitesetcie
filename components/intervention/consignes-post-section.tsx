'use client'

const DELAIS = ['2h', '4h', '6h', '8h', '24h'] as const

const PRESETS = [
  'Ne pas laver les surfaces traitées pendant 72h.',
  'Aérer le logement pendant 2h avant de réintégrer.',
  'Laver la literie à 60°C et traiter les matelas.',
  'Mettre en sac hermétique les vêtements et textiles.',
]

interface Props {
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
  disabled?: boolean
}

export default function ConsignesPostSection({ value, onChange, disabled }: Props) {
  const delai = (value.delai_reintegration as string) ?? ''
  const nbPassages = (value.nb_passages_prevus as number) ?? 0
  const consignes = (value.consignes as string) ?? ''
  const COLOR = '#7c2d12'

  function addPreset(text: string) {
    const sep = consignes.trimEnd() ? '\n' : ''
    onChange({ ...value, consignes: consignes.trimEnd() + sep + text })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-2.5">Délai de réintégration</p>
          <div className="flex flex-wrap gap-2">
            {DELAIS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => !disabled && onChange({ ...value, delai_reintegration: d })}
                disabled={disabled}
                className="px-3 min-h-[44px] rounded-lg border text-sm font-medium transition-colors"
                style={delai === d
                  ? { borderColor: COLOR, background: COLOR, color: '#fff' }
                  : { borderColor: '#d6d3d1', color: '#57534e' }
                }
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-2.5">Passages prévus</p>
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => !disabled && onChange({ ...value, nb_passages_prevus: n })}
                disabled={disabled}
                className="w-11 h-11 rounded-lg border text-sm font-medium transition-colors"
                style={nbPassages === n
                  ? { borderColor: COLOR, background: COLOR, color: '#fff' }
                  : { borderColor: '#d6d3d1', color: '#57534e' }
                }
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => !disabled && onChange({ ...value, nb_passages_prevus: 4 })}
              disabled={disabled}
              className="px-3 h-11 rounded-lg border text-sm font-medium transition-colors"
              style={nbPassages >= 4
                ? { borderColor: COLOR, background: COLOR, color: '#fff' }
                : { borderColor: '#d6d3d1', color: '#57534e' }
              }
            >
              4+
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
          Consignes post-traitement
        </label>
        {!disabled && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESETS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => addPreset(p)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#f5f5f4] text-[#57534e] hover:bg-[#e7e5e4] transition-colors text-left"
              >
                + {p.slice(0, 38)}{p.length > 38 ? '…' : ''}
              </button>
            ))}
          </div>
        )}
        <textarea
          value={consignes}
          onChange={e => onChange({ ...value, consignes: e.target.value })}
          disabled={disabled}
          rows={4}
          placeholder="Consignes données au client…"
          className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
        />
      </div>
    </div>
  )
}
