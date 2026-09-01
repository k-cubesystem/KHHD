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
        <h2 className="mb-2 text-xl font-bold text-warning-text">관리자 페이지 오류</h2>
        <p className="mb-6 text-sm text-ink-light/55">관리자 기능에서 오류가 발생했습니다.</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-gold-600 px-6 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-gold-500"
          >
            다시 시도
          </button>
          <Link
            href="/admin"
            className="rounded-lg border border-white/10 px-6 py-2.5 text-sm font-medium text-ink-light/70 transition-colors hover:bg-white/[0.06]"
          >
            관리자 홈
          </Link>
        </div>
      </div>
    </div>
  )
}
