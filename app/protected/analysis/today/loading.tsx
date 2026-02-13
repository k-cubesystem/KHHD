export default function TodayLoading() {
  return (
    <div className="min-h-screen bg-background pb-20 animate-pulse">
      <div className="px-3 pt-12 pb-6">
        <div className="h-4 w-16 bg-white/5 rounded mb-4" />
        <div className="h-7 w-36 bg-white/5 rounded mb-3" />
        <div className="h-4 w-48 bg-white/5 rounded" />
      </div>
      <div className="px-3 space-y-4">
        <div className="bg-surface/20 border border-white/5 rounded-xl h-40" />
        <div className="bg-surface/20 border border-white/5 rounded-xl h-24" />
        <div className="bg-surface/20 border border-white/5 rounded-xl h-24" />
      </div>
    </div>
  )
}
