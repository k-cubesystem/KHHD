export default function StudioLoading() {
  return (
    <div className="min-h-screen pb-24 animate-pulse">
      {/* Header */}
      <div className="px-5 pt-14 pb-8 text-center space-y-5">
        <div className="h-6 w-40 bg-surface/20 rounded-full mx-auto" />
        <div className="space-y-3">
          <div className="h-8 w-52 bg-surface/20 rounded mx-auto" />
          <div className="h-4 w-64 bg-surface/15 rounded mx-auto" />
        </div>
        <div className="h-9 w-36 bg-surface/10 rounded-xl mx-auto border border-white/5" />
      </div>
      {/* Service cards */}
      <div className="px-5 space-y-3">
        <div className="h-40 bg-surface/10 rounded-2xl border border-white/5" />
        <div className="h-40 bg-surface/10 rounded-2xl border border-white/5" />
        <div className="h-40 bg-surface/10 rounded-2xl border border-white/5" />
      </div>
    </div>
  )
}
