export default function AnalysisLoading() {
  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="text-center space-y-3">
        <div className="h-6 w-32 bg-surface/20 rounded-full mx-auto" />
        <div className="h-8 w-64 bg-surface/20 rounded mx-auto" />
        <div className="h-4 w-48 bg-surface/15 rounded mx-auto" />
      </div>
      {/* Attendance / Roulette area */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 bg-surface/10 rounded-xl border border-white/5" />
        <div className="h-28 bg-surface/10 rounded-xl border border-white/5" />
      </div>
      {/* Feature cards */}
      <div className="space-y-3">
        <div className="h-24 bg-surface/10 rounded-xl border border-white/5" />
        <div className="h-24 bg-surface/10 rounded-xl border border-white/5" />
        <div className="h-24 bg-surface/10 rounded-xl border border-white/5" />
      </div>
    </div>
  )
}
