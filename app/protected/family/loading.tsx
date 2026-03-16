export default function FamilyLoading() {
  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="text-center space-y-3">
        <div className="h-6 w-36 bg-surface/20 rounded-full mx-auto" />
        <div className="h-8 w-56 bg-surface/20 rounded mx-auto" />
        <div className="h-4 w-44 bg-surface/15 rounded mx-auto" />
      </div>
      {/* Stats badge */}
      <div className="flex justify-center">
        <div className="h-10 w-64 bg-surface/10 rounded-full border border-white/5" />
      </div>
      {/* Member cards */}
      <div className="space-y-4 px-3">
        <div className="h-56 bg-surface/10 rounded-2xl border border-white/5" />
        <div className="h-56 bg-surface/10 rounded-2xl border border-white/5" />
      </div>
      {/* Add button */}
      <div className="px-3">
        <div className="h-12 bg-surface/10 rounded-xl border border-white/5" />
      </div>
    </div>
  )
}
