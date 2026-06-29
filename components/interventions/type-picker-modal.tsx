'use client'

import {
  INTERVENTION_TEMPLATES,
  MIXTE_META,
  INTERVENTION_TYPE_ORDER,
  INTERVENTION_TYPE_SUBTITLE,
  type InterventionType,
} from '@/lib/intervention-templates'

interface Props {
  onSelect: (type: InterventionType) => void
  loading: boolean
  selectedType: InterventionType | null
  onClose: () => void
}

function PestIcon({ icon, className }: { icon: string; className?: string }) {
  const shared = { viewBox: '0 0 24 24', className: className ?? 'w-8 h-8' }
  switch (icon) {
    case 'rat':
      return (
        <svg {...shared} fill="currentColor">
          <circle cx="15" cy="10.5" r="4" />
          <ellipse cx="9" cy="15.5" rx="5.5" ry="4.5" />
          <circle cx="12.5" cy="6.5" r="2.5" />
          <path d="M3.5 17.5 C2 14 2.5 9 4.5 6.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <circle cx="16.5" cy="9.5" r="1" fill="white" />
        </svg>
      )
    case 'wasp':
      return (
        <svg {...shared} fill="currentColor">
          <circle cx="12" cy="4.5" r="2.5" />
          <ellipse cx="12" cy="11" rx="2.5" ry="3.5" />
          <ellipse cx="12" cy="18.5" rx="3.5" ry="4" />
          <ellipse cx="5.5" cy="9" rx="5" ry="2" fillOpacity="0.5" transform="rotate(-10 5.5 9)" />
          <ellipse cx="18.5" cy="9" rx="5" ry="2" fillOpacity="0.5" transform="rotate(10 18.5 9)" />
        </svg>
      )
    case 'bed-bug':
      return (
        <svg {...shared} fill="currentColor">
          <circle cx="12" cy="7" r="3" />
          <ellipse cx="12" cy="14.5" rx="7.5" ry="5.5" />
          <path d="M4.5 10.5 L1 8M19.5 10.5 L23 8M4.5 13.5 L1 13.5M19.5 13.5 L23 13.5M4.5 16.5 L1 19M19.5 16.5 L23 19" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      )
    case 'ant':
      return (
        <svg {...shared} fill="currentColor">
          <circle cx="12" cy="6" r="2.5" />
          <circle cx="12" cy="12.5" r="2" />
          <circle cx="12" cy="19" r="3.5" />
          <path d="M11 4 L8.5 1.5M13 4 L15.5 1.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M10 12 L6 10M14 12 L18 10M10 13 L6 15M14 13 L18 15M10.5 16.5 L7 20M13.5 16.5 L17 20" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </svg>
      )
    case 'cockroach':
      return (
        <svg {...shared} fill="currentColor">
          <circle cx="12" cy="5.5" r="2.5" />
          <ellipse cx="12" cy="14" rx="6" ry="8" />
          <path d="M10.5 3.5 C9 1 6 0.5 5.5 2M13.5 3.5 C15 1 18 0.5 18.5 2" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M6 9 L2 7M18 9 L22 7M6 12 L2 12M18 12 L22 12M6 16 L2 18.5M18 16 L22 18.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </svg>
      )
    case 'mosquito':
      return (
        <svg {...shared} fill="currentColor">
          <circle cx="12" cy="6.5" r="2" />
          <path d="M12 8.5 L9.5 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <ellipse cx="12" cy="15" rx="2" ry="7.5" />
          <ellipse cx="5" cy="12" rx="5.5" ry="2" fillOpacity="0.5" transform="rotate(-20 5 12)" />
          <ellipse cx="19" cy="12" rx="5.5" ry="2" fillOpacity="0.5" transform="rotate(20 19 12)" />
          <path d="M10 19 L6 22M14 19 L18 22" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      )
    case 'mixed':
      return (
        <svg {...shared} fill="currentColor">
          <rect x="2" y="2" width="9" height="9" rx="2" />
          <rect x="13" y="2" width="9" height="9" rx="2" fillOpacity="0.7" />
          <rect x="2" y="13" width="9" height="9" rx="2" fillOpacity="0.5" />
          <rect x="13" y="13" width="9" height="9" rx="2" fillOpacity="0.3" />
        </svg>
      )
    default:
      return null
  }
}

export default function TypePickerModal({ onSelect, loading, selectedType, onClose }: Props) {
  const types = INTERVENTION_TYPE_ORDER

  const getInfo = (type: InterventionType) => {
    if (type === 'mixte') return { label: MIXTE_META.label, color: MIXTE_META.color, icon: MIXTE_META.icon }
    const t = INTERVENTION_TEMPLATES[type]
    return { label: t.label, color: t.color, icon: t.icon }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5f5f4]">
          <h2 className="font-semibold text-[#1c1917] text-base">Type d'intervention</h2>
          {!loading && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#a8a29e] hover:text-[#57534e] hover:bg-[#f5f5f4] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Type grid */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto">
          {types.map(type => {
            const { label, color, icon } = getInfo(type)
            const subtitle = INTERVENTION_TYPE_SUBTITLE[type]
            const isSelected = selectedType === type
            const isLoading = loading && isSelected

            return (
              <button
                key={type}
                type="button"
                onClick={() => !loading && onSelect(type)}
                disabled={loading}
                className={`
                  relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-center
                  transition-all duration-150 disabled:cursor-wait
                  ${isSelected
                    ? 'border-current shadow-md scale-[0.98]'
                    : 'border-[#e7e5e4] hover:border-current hover:shadow-sm hover:scale-[1.01]'
                  }
                  ${type === 'mixte' ? 'sm:col-start-2' : ''}
                `}
                style={{ color: isSelected || !loading ? color : '#a8a29e' }}
              >
                {/* Icon circle */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: isSelected ? color : `${color}18`,
                    color: isSelected ? 'white' : color,
                  }}
                >
                  {isLoading ? (
                    <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                    </svg>
                  ) : (
                    <PestIcon icon={icon} className="w-7 h-7" />
                  )}
                </div>

                {/* Label */}
                <div>
                  <div className="font-semibold text-[13px] text-[#1c1917] leading-tight">{label}</div>
                  <div className="text-[11px] text-[#a8a29e] mt-0.5 leading-tight">{subtitle}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Safe area spacer (iOS) */}
        <div className="h-safe-bottom sm:h-0 pb-4 sm:pb-0" />
      </div>
    </div>
  )
}
