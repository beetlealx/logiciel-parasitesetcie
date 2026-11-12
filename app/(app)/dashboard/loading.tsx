export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-6 w-44 bg-[#e7e5e4] rounded-lg" />
        <div className="h-4 w-64 bg-[#f5f5f4] rounded mt-1.5" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-4 space-y-2">
            <div className="h-3 w-20 bg-[#f5f5f4] rounded" />
            <div className="h-7 w-12 bg-[#e7e5e4] rounded" />
            <div className="h-3 w-24 bg-[#f5f5f4] rounded" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#e7e5e4] rounded-xl px-4 py-4 h-48" />
        <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-4 h-48" />
      </div>

      {/* Lists row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f5f5f4]">
              <div className="h-3 w-32 bg-[#f5f5f4] rounded" />
            </div>
            <div className="divide-y divide-[#f5f5f4]">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-[#e7e5e4] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-36 bg-[#e7e5e4] rounded" />
                    <div className="h-2.5 w-24 bg-[#f5f5f4] rounded" />
                  </div>
                  <div className="h-3 w-12 bg-[#f5f5f4] rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
