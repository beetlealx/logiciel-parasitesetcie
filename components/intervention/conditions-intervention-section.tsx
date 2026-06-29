'use client'

const EPI_ITEMS = [
  { key: 'combinaison', label: 'Combinaison étanche' },
  { key: 'casque', label: 'Casque avec visière' },
  { key: 'gants', label: 'Gants anti-piqûres' },
  { key: 'bottes', label: 'Bottes' },
  { key: 'masque', label: 'Masque FFP2' },
]

const EQUIPEMENT_ITEMS = [
  { key: 'perche', label: 'Perche télescopique' },
  { key: 'echelle', label: 'Échelle' },
  { key: 'nacelle', label: 'Nacelle / PEMP' },
]

interface Props {
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
  disabled?: boolean
}

function ToggleChip({ checked, label, color, onClick, disabled }: { checked: boolean; label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors min-h-[40px]"
      style={checked ? { borderColor: color, background: `${color}15`, color } : {}}
    >
      {checked && (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
      {label}
    </button>
  )
}

export default function ConditionsInterventionSection({ value, onChange, disabled }: Props) {
  const epi = (value.epi as Record<string, boolean>) ?? {}
  const equipements = (value.equipements as Record<string, boolean>) ?? {}
  const accesNotes = (value.acces_notes as string) ?? ''
  const COLOR = '#b45309'

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-2.5">EPI portés</p>
        <div className="flex flex-wrap gap-2">
          {EPI_ITEMS.map(item => (
            <ToggleChip
              key={item.key}
              checked={!!epi[item.key]}
              label={item.label}
              color={COLOR}
              disabled={disabled}
              onClick={() => onChange({ ...value, epi: { ...epi, [item.key]: !epi[item.key] } })}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-2.5">Équipements utilisés</p>
        <div className="flex flex-wrap gap-2">
          {EQUIPEMENT_ITEMS.map(item => (
            <ToggleChip
              key={item.key}
              checked={!!equipements[item.key]}
              label={item.label}
              color={COLOR}
              disabled={disabled}
              onClick={() => onChange({ ...value, equipements: { ...equipements, [item.key]: !equipements[item.key] } })}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
          Notes d'accès et conditions
        </label>
        <textarea
          value={accesNotes}
          onChange={e => onChange({ ...value, acces_notes: e.target.value })}
          disabled={disabled}
          rows={2}
          placeholder="Ex : accès via échelle, toiture fragile, voisinage à prévenir…"
          className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-[#f5f5f4] disabled:text-[#a8a29e]"
        />
      </div>
    </div>
  )
}
