export default function SiteHistoryLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="h-3 w-16 bg-[#e7e5e4] rounded animate-pulse mb-2" />
      <div className="h-7 w-52 bg-[#e7e5e4] rounded-lg animate-pulse mb-6" />

      <div className="relative">
        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[#e7e5e4]" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4" style={{ opacity: 1 - i * 0.18 }}>
              <div className="mt-3.5 w-[23px] h-[23px] rounded-full bg-[#e7e5e4] animate-pulse shrink-0 relative z-10" />
              <div className="flex-1 bg-white border border-[#e7e5e4] rounded-xl px-4 py-3 space-y-2">
                <div className="h-4 w-36 bg-[#e7e5e4] rounded animate-pulse" />
                <div className="h-3 w-28 bg-[#f5f5f4] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
