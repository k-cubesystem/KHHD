export default function TrendLoading() {
  return (
    <div className="min-h-screen bg-background text-ink-light pb-20 animate-pulse">
      <header className="px-3 pt-12 pb-6">
        <div className="h-4 w-16 bg-white/5 rounded mb-4" />
        <div className="h-7 w-40 bg-white/5 rounded mb-3" />
        <div className="h-4 w-56 bg-white/5 rounded" />
      </header>

      <div className="px-3 space-y-4">
        {/* 분석 버튼 영역 */}
        <div className="bg-surface/20 border border-white/5 rounded-xl p-6 h-32" />

        {/* 결과 카드들 */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface/20 border border-white/5 rounded-xl h-24" />
        ))}
      </div>
    </div>
  )
}
