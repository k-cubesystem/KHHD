export default function ProtectedLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="relative mx-auto mb-4 h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-gold-500" />
        </div>
        <p className="animate-pulse text-sm text-gold-300/80">불러오는 중...</p>
      </div>
    </div>
  )
}
