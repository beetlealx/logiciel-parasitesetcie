export default function InterventionsLoading() {
  return (
    <div>
      <div className="flex justify-between items-center mb-5 gap-3">
        <div className="h-7 w-36 bg-[#e7e5e4] rounded-lg animate-pulse" />
        <div className="h-10 w-44 bg-[#e7e5e4] rounded-lg animate-pulse" />
      </div>

      <div className="mb-4">
        <div className="h-11 bg-[#e7e5e4] rounded-lg animate-pulse" />
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3.5 flex items-center gap-4"
            style={{ opacity: 1 - i * 0.12 }}
          >
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-[#e7e5e4] rounded animate-pulse" />
              <div className="h-3 w-64 bg-[#f5f5f4] rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-[#f5f5f4] rounded-full animate-pulse" />
            <div className="h-4 w-4 bg-[#f5f5f4] rounded animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
