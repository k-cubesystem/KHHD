import {
  getAnalyticsAcquisition,
  getAnalyticsBehavior,
  getAnalyticsConversion,
  getAnalyticsOverview,
  getAnalyticsRealtime,
  type RangeKey,
} from './actions'
import { AnalyticsClient } from './analytics-client'
import { AdminPageHeader } from '@/components/admin/ui/page-header'
import { BarChart3 } from 'lucide-react'

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
    <div className="space-y-5">
      {/* 머리말은 어드민 공용 부품 — 화면마다 제목 크기·색이 달라 딴 앱처럼 보이던 것을 맞춘다 */}
      <AdminPageHeader
        title="분석"
        description="자사 수집(페이지뷰·이벤트·유입 귀속·퍼널) — GA4 와 같은 이벤트를 우리 DB 에도 쌓아 가입·결제와 조인합니다. 페이지뷰 원본은 90일 보관."
        icon={<BarChart3 className="h-4 w-4 text-gold-500" aria-hidden />}
      />
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
