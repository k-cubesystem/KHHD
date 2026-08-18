import { GeminiUsageDashboard } from '@/components/admin/gemini-usage-dashboard'
import { GeminiUserUsage } from '@/components/admin/gemini-user-usage'
import {
  getGeminiTodaySummary,
  getGeminiDailyStats,
  getGeminiActionStats,
  getGeminiRecentLogs,
  getGeminiRpmConfig,
  getGeminiCostVsPrice,
  getUsdKrwRate,
} from '@/app/actions/admin/gemini-usage'

export const dynamic = 'force-dynamic'

export default async function GeminiUsagePage() {
  const [summary, dailyStats, actionStats, logs, rpmConfig, costVsPrice, usdKrwRate] = await Promise.all([
    getGeminiTodaySummary(),
    getGeminiDailyStats(30),
    getGeminiActionStats(30),
    getGeminiRecentLogs(50),
    getGeminiRpmConfig(),
    getGeminiCostVsPrice(30),
    getUsdKrwRate(),
  ])

  return (
    <div className="space-y-5">
      <GeminiUsageDashboard
        initialSummary={summary}
        initialDailyStats={dailyStats}
        initialActionStats={actionStats}
        initialLogs={logs}
        initialRpmConfig={rpmConfig}
        initialCostVsPrice={costVsPrice}
        usdKrwRate={usdKrwRate}
      />

      {/* 누가 · 무엇에 · 얼마나 — 액션별 합계로는 「한 사람이 몰아 쓰는 것」이 안 보인다 */}
      <GeminiUserUsage daysBack={30} />
    </div>
  )
}
