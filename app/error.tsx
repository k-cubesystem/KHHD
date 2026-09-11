'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/utils/logger'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error('[해화당 에러]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-5xl">⚠️</div>
        <h2 className="mb-2 text-xl font-bold text-error-text">문제가 발생했습니다</h2>
        <p className="mb-6 text-sm text-ink-light/70">일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
        {error.digest && <p className="mb-4 text-xs text-ink-light/40">오류 코드: {error.digest}</p>}
        <button
          onClick={reset}
          className="rounded-lg bg-gold-500 px-6 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-gold-600"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
