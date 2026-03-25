'use client'

import dynamic from 'next/dynamic'
import type { DestinyTarget } from '@/app/actions/user/destiny'
import type { CheonjiinAnalysisResult } from '@/types/cheonjiin'

const CheonjiinResultClient = dynamic(
  () => import('./cheonjiin-result-client').then((mod) => ({ default: mod.CheonjiinResultClient })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-ink-light/50 font-light">분석을 준비하고 있습니다...</p>
        </div>
      </div>
    ),
  },
)

interface CheonjiinResultLazyProps {
  target: DestinyTarget
  initialData?: CheonjiinAnalysisResult | null
  isCached?: boolean
  needsData?: boolean
  needsAnalysis?: boolean
}

export function CheonjiinResultLazy(props: CheonjiinResultLazyProps) {
  return <CheonjiinResultClient {...props} />
}
