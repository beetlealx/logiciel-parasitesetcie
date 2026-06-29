'use client'

interface MonthlyPoint { key: string; label: string; count: number }
interface TypePoint { type: string; label: string; count: number; color: string }

interface Props {
  monthlyData: MonthlyPoint[]
  typeData: TypePoint[]
  maxMonthly: number
}

export default function DashboardCharts({ monthlyData, maxMonthly }: Props) {
  const currentMonthKey = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()

  return (
    <div className="flex items-end gap-1.5 h-36 w-full">
      {monthlyData.map(({ key, label, count }) => {
        const pct = maxMonthly > 0 ? (count / maxMonthly) * 100 : 0
        const isCurrent = key === currentMonthKey
        return (
          <div key={key} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-[10px] text-[#a8a29e] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
              {count}
            </span>
            <div className="w-full flex items-end" style={{ height: '100px' }}>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                  background: isCurrent ? '#c0392b' : '#e7e5e4',
                }}
              />
            </div>
            <span className={`text-[9px] leading-none ${isCurrent ? 'text-primary font-semibold' : 'text-[#a8a29e]'}`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
