'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, Home } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'

export default function FamilyCompatibilityMatrixError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('error')
  useEffect(() => {
    logger.error('[가족 궁합 매트릭스 에러]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="text-5xl mb-2">👨‍👩‍👧‍👦</div>
        <h2 className="text-lg font-bold text-amber-200">{t('unknown')}</h2>
        <p className="text-sm text-ink-light/70">{t('unknownDesc')}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500"
          >
            <RefreshCw className="w-4 h-4" />
            {t('retry')}
          </button>
          <Link
            href="/protected/analysis"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-ink-light/70 transition-colors hover:bg-white/5"
          >
            <Home className="w-4 h-4" />
            {t('goHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
