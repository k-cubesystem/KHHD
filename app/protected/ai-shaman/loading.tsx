export default function AiShamanLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative mx-auto h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-amber-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">&#128122;</span>
          </div>
        </div>
        <p className="animate-pulse text-sm text-amber-400/80">해화지기를 소환하는 중...</p>
      </div>
    </div>
  )
}
