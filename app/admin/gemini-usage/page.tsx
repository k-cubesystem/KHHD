import { GeminiUsageDashboard } from '@/components/admin/gemini-usage-dashboard'
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
    <GeminiUsageDashboard
      initialSummary={summary}
      initialDailyStats={dailyStats}
      initialActionStats={actionStats}
      initialLogs={logs}
      initialRpmConfig={rpmConfig}
      initialCostVsPrice={costVsPrice}
      usdKrwRate={usdKrwRate}
    />
  )
}
