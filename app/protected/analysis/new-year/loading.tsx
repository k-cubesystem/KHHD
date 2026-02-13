export default function NewYearLoading() {
  return (
    <div className="min-h-screen bg-background text-ink-light pb-20 animate-pulse">
      <header className="px-3 pt-12 pb-6">
        <div className="h-4 w-16 bg-white/5 rounded mb-4" />
        <div className="h-8 w-48 bg-white/5 rounded mb-3" />
        <div className="h-4 w-64 bg-white/5 rounded" />
      </header>

      <div className="px-3 space-y-4">
        {/* 점수 원형 */}
        <div className="bg-surface/20 border border-white/5 rounded-xl p-8 flex flex-col items-center gap-4">
          <div className="w-28 h-28 rounded-full bg-white/5" />
          <div className="h-5 w-40 bg-white/5 rounded" />
          <div className="h-4 w-56 bg-white/5 rounded" />
        </div>

        {/* 분기별 */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface/20 border border-white/5 rounded-xl h-24" />
          ))}
        </div>

        {/* 영역별 */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface/20 border border-white/5 rounded-xl h-16" />
        ))}
      </div>
    </div>
  )
}
