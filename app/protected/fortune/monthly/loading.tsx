export default function MonthlyFortuneLoading() {
  return (
    <div className="min-h-screen bg-background text-ink-light pb-20 animate-pulse">
      <header className="px-6 pt-12 pb-6">
        <div className="h-4 w-16 bg-white/5 rounded mb-4" />
        <div className="h-7 w-32 bg-white/5 rounded mb-3" />
        <div className="h-4 w-48 bg-white/5 rounded" />
      </header>

      <div className="px-6 space-y-4">
        {/* 점수 원형 스켈레톤 */}
        <div className="bg-surface/20 border border-white/5 rounded-xl p-6 flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-white/5" />
          <div className="h-4 w-48 bg-white/5 rounded" />
        </div>

        {/* 이달의 흐름 */}
        <div className="bg-surface/20 border border-white/5 rounded-xl p-5 h-20" />

        {/* 영역별 */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface/20 border border-white/5 rounded-xl h-24" />
        ))}
      </div>
    </div>
  )
}
