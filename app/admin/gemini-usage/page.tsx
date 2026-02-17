import { GeminiUsageDashboard } from '@/components/admin/gemini-usage-dashboard'
import {
  getGeminiTodaySummary,
  getGeminiDailyStats,
  getGeminiActionStats,
  getGeminiRecentLogs,
  getGeminiRpmConfig,
  getUsdKrwRate,
} from '@/app/actions/admin/gemini-usage'

export const dynamic = 'force-dynamic'

export default async function GeminiUsagePage() {
  const [summary, dailyStats, actionStats, logs, rpmConfig, usdKrwRate] = await Promise.all([
    getGeminiTodaySummary(),
    getGeminiDailyStats(30),
    getGeminiActionStats(30),
    getGeminiRecentLogs(50),
    getGeminiRpmConfig(),
    getUsdKrwRate(),
  ])

  return (
    <GeminiUsageDashboard
      initialSummary={summary}
      initialDailyStats={dailyStats}
      initialActionStats={actionStats}
      initialLogs={logs}
      initialRpmConfig={rpmConfig}
      usdKrwRate={usdKrwRate}
    />
  )
}
