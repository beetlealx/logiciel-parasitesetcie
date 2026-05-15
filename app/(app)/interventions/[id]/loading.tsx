function SkeletonSection({ lines = 2 }: { lines?: number }) {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f5f5f4] bg-[#fafaf9]">
        <div className="w-6 h-6 rounded-full bg-[#e7e5e4] animate-pulse shrink-0" />
        <div className="h-4 w-32 bg-[#e7e5e4] rounded animate-pulse" />
      </div>
      <div className="px-4 py-4 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-10 bg-[#f5f5f4] rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
        ))}
      </div>
    </div>
  )
}

export default function InterventionLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-[#e7e5e4] rounded animate-pulse" />
          <div className="h-7 w-40 bg-[#e7e5e4] rounded-lg animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 bg-[#e7e5e4] rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-primary/20 rounded-lg animate-pulse" />
        </div>
      </div>

      <SkeletonSection lines={3} />
      <SkeletonSection lines={2} />
      <SkeletonSection lines={1} />
      <SkeletonSection lines={4} />
      <SkeletonSection lines={2} />
      <SkeletonSection lines={3} />
      <SkeletonSection lines={2} />
    </div>
  )
}
