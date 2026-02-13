export default function WeeklyFortuneLoading() {
  return (
    <div className="min-h-screen bg-background text-ink-light pb-20 animate-pulse">
      <header className="px-3 pt-12 pb-6">
        <div className="h-4 w-16 bg-white/5 rounded mb-4" />
        <div className="h-7 w-32 bg-white/5 rounded mb-3" />
        <div className="h-4 w-48 bg-white/5 rounded" />
      </header>

      {/* 주간 요약 스켈레톤 */}
      <section className="px-3 mb-4">
        <div className="bg-surface/20 border border-white/5 rounded-xl p-4 h-16" />
      </section>

      {/* Overall Score 스켈레톤 */}
      <section className="px-3 mb-4">
        <div className="bg-surface/20 border border-white/5 rounded-xl p-6 h-24" />
      </section>

      {/* Daily Cards 스켈레톤 */}
      <section className="px-3 space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-surface/20 border border-white/5 rounded-xl h-20" />
        ))}
      </section>
    </div>
  )
}
