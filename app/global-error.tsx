'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body className="bg-gray-950 text-white">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-[480px] text-center">
            <div className="mb-6 text-5xl">🔧</div>
            <h1 className="mb-2 text-xl font-bold text-amber-400">서비스에 문제가 발생했습니다</h1>
            <p className="mb-6 text-sm text-gray-400">페이지를 새로고침하거나 잠시 후 다시 방문해 주세요.</p>
            <button
              onClick={reset}
              className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500"
            >
              새로고침
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
