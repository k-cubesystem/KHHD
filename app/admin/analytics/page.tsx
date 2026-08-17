import {
  getAnalyticsAcquisition,
  getAnalyticsBehavior,
  getAnalyticsConversion,
  getAnalyticsOverview,
  getAnalyticsRealtime,
  type RangeKey,
} from './actions'
import { AnalyticsClient } from './analytics-client'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ range?: string }>
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const range: RangeKey = sp.range === '7d' || sp.range === '90d' ? sp.range : '30d'
  const [overview, acquisition, behavior, conversion, realtime] = await Promise.all([
    getAnalyticsOverview(range),
    getAnalyticsAcquisition(range),
    getAnalyticsBehavior(range),
    getAnalyticsConversion(range),
    getAnalyticsRealtime(),
  ])
  return (
    <div className="px-3 py-4 sm:p-6 max-w-6xl">
      <h1 className="text-xl font-serif font-bold text-ink-light mb-1">분석</h1>
      <p className="text-xs text-ink-light/50 mb-6">
        자사 수집(페이지뷰·이벤트·유입 귀속·퍼널) — GA4 와 같은 이벤트를 우리 DB 에도 쌓아 가입·결제와 조인한다.
        페이지뷰 원본은 90일 보관.
      </p>
      <AnalyticsClient
        range={range}
        overview={overview.success ? overview : null}
        acquisition={acquisition.success ? acquisition : null}
        behavior={behavior.success ? behavior : null}
        conversion={conversion.success ? conversion : null}
        realtime={realtime.success ? realtime : null}
      />
    </div>
  )
}
