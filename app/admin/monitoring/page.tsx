import { getMonitoringStats } from '@/app/actions/admin/monitoring'
import { Card } from '@/components/ui/card'
import { Activity, Zap, TrendingUp, Users, AlertTriangle, Clock, CreditCard, BarChart2 } from 'lucide-react'
import { RevenueChart, ActiveUsersChart, CategoryPieChart, LatencyChart } from '@/components/admin/monitoring-charts'

export const dynamic = 'force-dynamic'

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bgGradient,
  iconBg,
  border,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
  bgGradient: string
  iconBg: string
  border: string
}) {
  return (
    <Card
      className={`relative p-3.5 md:p-5 bg-gradient-to-br ${bgGradient} border ${border} overflow-hidden group hover:shadow-lg transition-all duration-300`}
    >
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
      <div className="relative flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] md:text-xs text-stone-400 font-medium tracking-wide">{label}</p>
          <div className={`p-1.5 rounded-lg ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-3.5 h-3.5 ${color}`} strokeWidth={2.5} />
          </div>
        </div>
        <p className="text-base md:text-xl font-black text-stone-100 font-serif tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-stone-500">{sub}</p>}
      </div>
    </Card>
  )
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 text-stone-100 font-serif flex items-center gap-2">
      <Icon className="w-4 h-4 md:w-5 md:h-5 text-amber-500/80" />
      {children}
    </h2>
  )
}

export default async function MonitoringPage() {
  const result = await getMonitoringStats()

  if (!result.success || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-black text-stone-100 font-serif">모니터링</h1>
        <Card className="p-6 bg-stone-800/30 border border-stone-700/30">
          <p className="text-stone-400 text-sm">데이터를 불러올 수 없습니다: {result.error}</p>
        </Card>
      </div>
    )
  }

  const { revenue, activeUsers, topCategories, gemini, dailyRevenue, dailyUsers } = result.data

  const revenueCards = [
    {
      label: '오늘 매출',
      value: `${revenue.today.toLocaleString()}원`,
      sub: `결제 ${revenue.todayCount}건`,
      icon: CreditCard,
      color: 'text-amber-400',
      bgGradient: 'from-amber-500/20 to-amber-600/5',
      iconBg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: '주간 매출',
      value: `${revenue.week.toLocaleString()}원`,
      sub: `결제 ${revenue.weekCount}건`,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgGradient: 'from-emerald-500/20 to-emerald-600/5',
      iconBg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: '월간 매출',
      value: `${revenue.month.toLocaleString()}원`,
      sub: `결제 ${revenue.monthCount}건`,
      icon: BarChart2,
      color: 'text-blue-400',
      bgGradient: 'from-blue-500/20 to-blue-600/5',
      iconBg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
  ]

  const userCards = [
    {
      label: 'DAU (오늘)',
      value: activeUsers.dau.toLocaleString(),
      sub: '오늘 분석한 유저',
      icon: Users,
      color: 'text-violet-400',
      bgGradient: 'from-violet-500/20 to-violet-600/5',
      iconBg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
    },
    {
      label: 'WAU (주간)',
      value: activeUsers.wau.toLocaleString(),
      sub: '7일 내 활성 유저',
      icon: Users,
      color: 'text-cyan-400',
      bgGradient: 'from-cyan-500/20 to-cyan-600/5',
      iconBg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      label: 'MAU (월간)',
      value: activeUsers.mau.toLocaleString(),
      sub: '30일 내 활성 유저',
      icon: Users,
      color: 'text-pink-400',
      bgGradient: 'from-pink-500/20 to-pink-600/5',
      iconBg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
    },
  ]

  const geminiCards = [
    {
      label: 'AI 호출 (오늘)',
      value: gemini.todayCalls.toLocaleString(),
      sub: `오류 ${gemini.todayErrors}건`,
      icon: Zap,
      color: 'text-amber-400',
      bgGradient: 'from-amber-500/20 to-amber-600/5',
      iconBg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: 'AI 호출 (주간)',
      value: gemini.weekCalls.toLocaleString(),
      sub: `오류 ${gemini.weekErrors}건`,
      icon: Activity,
      color: 'text-emerald-400',
      bgGradient: 'from-emerald-500/20 to-emerald-600/5',
      iconBg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: '에러율 (주간)',
      value: `${gemini.errorRate}%`,
      sub: `${gemini.weekErrors}/${gemini.weekCalls}건`,
      icon: AlertTriangle,
      color: gemini.errorRate > 5 ? 'text-red-400' : 'text-stone-400',
      bgGradient: gemini.errorRate > 5 ? 'from-red-500/20 to-red-600/5' : 'from-stone-700/30 to-stone-800/10',
      iconBg: gemini.errorRate > 5 ? 'bg-red-500/10' : 'bg-stone-700/20',
      border: gemini.errorRate > 5 ? 'border-red-500/20' : 'border-stone-700/30',
    },
    {
      label: '평균 응답시간',
      value: `${gemini.avgLatencyMs}ms`,
      sub: '주간 평균 (Gemini)',
      icon: Clock,
      color: 'text-blue-400',
      bgGradient: 'from-blue-500/20 to-blue-600/5',
      iconBg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-black text-stone-100 font-serif">모니터링</h1>
        <p className="text-xs md:text-sm text-stone-500">실시간 서비스 현황 · AI 사용량 · 매출 추이를 확인합니다.</p>
      </div>

      {/* Revenue Stats */}
      <section>
        <SectionTitle icon={CreditCard}>매출 현황</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {revenueCards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      </section>

      {/* Revenue Chart */}
      <Card className="relative p-4 md:p-6 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
        <SectionTitle icon={TrendingUp}>일별 매출 추이 (최근 30일)</SectionTitle>
        <RevenueChart data={dailyRevenue} />
      </Card>

      {/* Active Users */}
      <section>
        <SectionTitle icon={Users}>활성 사용자 (DAU / WAU / MAU)</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {userCards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      </section>

      {/* Users Chart */}
      <Card className="relative p-4 md:p-6 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
        <SectionTitle icon={Activity}>일별 활성 유저 & 분석 수 (최근 30일)</SectionTitle>
        <ActiveUsersChart data={dailyUsers} />
      </Card>

      {/* Gemini API Stats */}
      <section>
        <SectionTitle icon={Zap}>Gemini API 사용량</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {geminiCards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      </section>

      {/* Bottom grid: latency chart + category pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Latency by type */}
        <Card className="relative p-4 md:p-6 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
          <SectionTitle icon={Clock}>분석 유형별 평균 응답시간</SectionTitle>
          {gemini.avgLatencyByType.length > 0 ? (
            <LatencyChart data={gemini.avgLatencyByType} />
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-stone-500 text-sm">데이터 없음</p>
            </div>
          )}
        </Card>

        {/* Category breakdown */}
        <Card className="relative p-4 md:p-6 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
          <SectionTitle icon={BarChart2}>월간 분석 카테고리 분포</SectionTitle>
          {topCategories.length > 0 ? (
            <CategoryPieChart data={topCategories} />
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-stone-500 text-sm">데이터 없음</p>
            </div>
          )}
        </Card>
      </div>

      {/* Category table */}
      {topCategories.length > 0 && (
        <Card className="relative p-4 md:p-6 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
          <SectionTitle icon={BarChart2}>카테고리별 상세 사용량 (최근 30일)</SectionTitle>
          <div className="space-y-2">
            {topCategories.map((cat, idx) => {
              const total = topCategories.reduce((s, c) => s + c.count, 0)
              const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0
              const labels: Record<string, string> = {
                SAJU: '사주',
                FACE: '관상',
                HAND: '손금',
                FENGSHUI: '풍수',
                COMPATIBILITY: '궁합',
                TODAY: '오늘운세',
                WEALTH: '재물운',
                NEW_YEAR: '신년운세',
              }
              return (
                <div key={cat.category} className="flex items-center gap-3 group">
                  <span className="text-xs text-stone-500 w-4 text-right">{idx + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-stone-300 font-medium">{labels[cat.category] || cat.category}</span>
                      <span className="text-xs text-stone-400 font-mono">
                        {cat.count.toLocaleString()}건 ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-stone-700/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400/80 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
