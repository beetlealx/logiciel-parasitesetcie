export default function SitesLoading() {
  return (
    <div>
      <div className="h-6 w-20 bg-[#e7e5e4] rounded animate-pulse mb-6" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3.5 flex items-center gap-4"
            style={{ opacity: 1 - i * 0.15 }}
          >
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-[#e7e5e4] rounded animate-pulse" />
              <div className="h-3 w-72 bg-[#f5f5f4] rounded animate-pulse" />
            </div>
            <div className="h-4 w-4 bg-[#f5f5f4] rounded animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
