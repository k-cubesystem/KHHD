'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, Home, Wifi, ShieldAlert, ServerCrash } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

function getErrorType(error: Error) {
  const msg = error.message?.toLowerCase() ?? ''
  if (msg.includes('network') || msg.includes('fetch')) return 'network' as const
  if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('403')) return 'auth' as const
  if (msg.includes('500') || msg.includes('server')) return 'server' as const
  return 'unknown' as const
}

const ERROR_UI = {
  network: {
    icon: Wifi,
    title: '네트워크 연결을 확인해주세요',
    desc: '인터넷 연결이 불안정합니다. 잠시 후 다시 시도해주세요.',
  },
  auth: { icon: ShieldAlert, title: '로그인이 필요합니다', desc: '세션이 만료되었습니다. 다시 로그인해주세요.' },
  server: {
    icon: ServerCrash,
    title: '서버에 문제가 생겼어요',
    desc: '잠시 후 다시 시도해주세요. 문제가 계속되면 고객센터로 문의하세요.',
  },
  unknown: { icon: ServerCrash, title: '분석 중 문제가 발생했어요', desc: '잠시 후 다시 시도해주세요.' },
} as const

export default function AnalysisError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const errorType = getErrorType(error)
  const ui = ERROR_UI[errorType]
  const Icon = ui.icon

  useEffect(() => {
    logger.error('[분석 에러]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-error-light border border-error-border flex items-center justify-center">
          <Icon className="w-7 h-7 text-error-text" />
        </div>
        <h2 className="text-lg font-bold text-amber-200">{ui.title}</h2>
        <p className="text-sm text-ink-light/70">{ui.desc}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
          <Link
            href="/protected/analysis"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-ink-light/70 transition-colors hover:bg-white/5"
          >
            <Home className="w-4 h-4" />
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
