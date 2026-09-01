'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, Home } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'

export default function HistoryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('error')
  useEffect(() => {
    logger.error('[히스토리 에러]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="text-5xl mb-2">📜</div>
        <h2 className="text-lg font-bold text-error-text">{t('historyError')}</h2>
        <p className="text-sm text-ink-light/70">{t('unknownDesc')}</p>

        {/* 🔴 오류를 숨기지 않는다. 프로덕션은 메시지를 가리고 digest 만 주는데, 그 값이 있어야
            서버 로그에서 같은 사건을 찾을 수 있다. 「잠시 후 다시」만 보여 주면 진단이 불가능하다. */}
        <details className="mx-auto max-w-sm text-left">
          <summary className="cursor-pointer text-[11px] text-ink-light/40">문제 정보 보기</summary>
          <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-black/30 p-3">
            {error.digest && <p className="break-all font-mono text-[10px] text-gold-300/80">digest: {error.digest}</p>}
            <p className="break-all font-mono text-[10px] text-ink-light/60">{error.message || '메시지 없음'}</p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(`digest=${error.digest ?? '-'} / ${error.message ?? '-'}`)
              }}
              className="mt-1 rounded border border-white/10 px-2 py-1 text-[10px] text-ink-light/50"
            >
              복사
            </button>
          </div>
        </details>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-gold-600"
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
