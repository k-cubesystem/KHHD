export default function HistoryLoading() {
  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-8 space-y-4 animate-pulse">
      {/* Header */}
      <div className="space-y-3">
        <div className="h-6 w-24 bg-surface/20 rounded" />
        <div className="flex items-center justify-between">
          <div className="h-9 w-40 bg-surface/20 rounded" />
          <div className="h-5 w-16 bg-surface/15 rounded" />
        </div>
      </div>
      {/* Filter */}
      <div className="h-12 w-full bg-surface/10 rounded-lg border border-white/5" />
      {/* Category tabs */}
      <div className="flex gap-2 overflow-hidden">
        <div className="h-9 w-16 bg-surface/10 rounded-lg border border-white/5 shrink-0" />
        <div className="h-9 w-16 bg-surface/10 rounded-lg border border-white/5 shrink-0" />
        <div className="h-9 w-16 bg-surface/10 rounded-lg border border-white/5 shrink-0" />
        <div className="h-9 w-16 bg-surface/10 rounded-lg border border-white/5 shrink-0" />
      </div>
      {/* Record cards */}
      <div className="space-y-3">
        <div className="h-32 bg-surface/10 rounded-lg border border-white/5" />
        <div className="h-32 bg-surface/10 rounded-lg border border-white/5" />
        <div className="h-32 bg-surface/10 rounded-lg border border-white/5" />
      </div>
    </div>
  )
}
