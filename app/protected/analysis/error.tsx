'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { RefreshCw, Home, Wifi, ShieldAlert, ServerCrash } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

function getErrorType(error: Error) {
  const msg = error.message?.toLowerCase() ?? ''
  if (msg.includes('network') || msg.includes('fetch')) return 'network' as const
  if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('403')) return 'auth' as const
  if (msg.includes('500') || msg.includes('server')) return 'server' as const
  return 'unknown' as const
}

const ERROR_ICONS = {
  network: Wifi,
  auth: ShieldAlert,
  server: ServerCrash,
  unknown: ServerCrash,
} as const

export default function AnalysisError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const errorType = getErrorType(error)
  const Icon = ERROR_ICONS[errorType]
  const t = useTranslations()

  const titleMap: Record<ReturnType<typeof getErrorType>, string> = {
    network: t('error.network'),
    auth: t('auth.loginRequired'),
    server: t('error.server'),
    unknown: t('error.unknown'),
  }

  const descMap: Record<ReturnType<typeof getErrorType>, string> = {
    network: t('error.networkDesc'),
    auth: t('auth.sessionExpired'),
    server: t('error.serverDesc'),
    unknown: t('error.unknownDesc'),
  }

  useEffect(() => {
    logger.error('[분석 에러]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-error-light border border-error-border flex items-center justify-center">
          <Icon className="w-7 h-7 text-error-text" />
        </div>
        <h2 className="text-lg font-bold text-amber-200">{titleMap[errorType]}</h2>
        <p className="text-sm text-ink-light/70">{descMap[errorType]}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500"
          >
            <RefreshCw className="w-4 h-4" />
            {t('error.retry')}
          </button>
          <Link
            href="/protected/analysis"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-ink-light/70 transition-colors hover:bg-white/5"
          >
            <Home className="w-4 h-4" />
            {t('error.goHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
