export default function MembershipLoading() {
  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="h-6 w-28 bg-surface/20 rounded-full mx-auto" />
        <div className="h-8 w-48 bg-surface/20 rounded mx-auto" />
      </div>
      {/* Current plan */}
      <div className="h-24 bg-surface/10 rounded-xl border border-white/5" />
      {/* Plan cards */}
      <div className="space-y-3">
        <div className="h-48 bg-surface/10 rounded-xl border border-white/5" />
        <div className="h-48 bg-surface/10 rounded-xl border border-white/5" />
        <div className="h-48 bg-surface/10 rounded-xl border border-white/5" />
      </div>
    </div>
  )
}
