import { getUpcomingEvents } from '@/lib/dolibarr'

function formatDate(ts: number) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(ts * 1000))
}

export default async function UpcomingVisits() {
  const events = await getUpcomingEvents(10)
  if (events.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#78716c] mb-2.5">
        Prochaines visites planifiées
      </h2>
      <div className="flex flex-col gap-1.5">
        {events.map(ev => (
          <div
            key={ev.id}
            className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3 flex items-center gap-4"
          >
            {/* Date block */}
            <div className="shrink-0 text-center bg-primary/8 rounded-lg px-3 py-1.5 min-w-[52px]">
              <div className="text-[10px] uppercase tracking-wide text-primary font-semibold">
                {new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(ev.datep * 1000))}
              </div>
              <div className="text-[18px] font-bold text-primary leading-tight">
                {new Date(ev.datep * 1000).getDate()}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-[13.5px] text-[#1c1917] truncate">{ev.label}</div>
              <div className="flex gap-2 mt-0.5 text-[12px] text-[#78716c]">
                {ev.socsocialnom && <span className="truncate max-w-[200px]">{ev.socsocialnom}</span>}
                <span className="text-[#a8a29e]">{formatDate(ev.datep)}</span>
              </div>
            </div>

            {/* Planned badge */}
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 shrink-0">
              Planifiée
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
