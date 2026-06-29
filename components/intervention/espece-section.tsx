'use client'

interface EspeceOption {
  label: string
  img: string
}

interface Props {
  options: EspeceOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function EspeceSection({ options, value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map(opt => {
        const selected = value === opt.label
        return (
          <button
            key={opt.label}
            type="button"
            disabled={disabled}
            onClick={() => onChange(selected ? '' : opt.label)}
            className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all text-left
              ${selected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-[#e7e5e4] hover:border-[#c7c3c0] bg-white'
              }
              disabled:opacity-50 disabled:cursor-default`}
          >
            <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#f0efee] flex items-center justify-center">
              {opt.img ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={opt.img}
                  alt={opt.label}
                  className="w-full h-full object-cover"
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                    const parent = e.currentTarget.parentElement
                    if (parent) parent.innerHTML = '<span style="font-size:2rem">🐛</span>'
                  }}
                />
              ) : (
                <span className="text-3xl">?</span>
              )}
            </div>
            <span className="text-[11px] font-medium text-center text-[#1c1917] leading-tight w-full">
              {opt.label}
            </span>
            {selected && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
