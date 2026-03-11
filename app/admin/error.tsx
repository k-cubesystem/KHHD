'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error('[해화당 관리자 에러]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-5xl">🛠️</div>
        <h2 className="mb-2 text-xl font-bold text-amber-400">관리자 페이지 오류</h2>
        <p className="mb-6 text-sm text-gray-400">관리자 기능에서 오류가 발생했습니다.</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500"
          >
            다시 시도
          </button>
          <Link
            href="/admin"
            className="rounded-lg border border-gray-700 px-6 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
          >
            관리자 홈
          </Link>
        </div>
      </div>
    </div>
  )
}
