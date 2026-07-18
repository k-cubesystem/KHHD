import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Users, CreditCard, TrendingUp, Activity, Crown, UserPlus } from 'lucide-react'
import { TrafficChart } from '@/components/admin/traffic-chart'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

interface DashboardStats {
  totalUsers: number
  todaySignups: number
  totalRevenue: number
  todayRevenue: number
  monthRevenue: number
  activeSubscriptions: number
  mrr: number
  totalAnalyses: number
}

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0,
  todaySignups: 0,
  totalRevenue: 0,
  todayRevenue: 0,
  monthRevenue: 0,
  activeSubscriptions: 0,
  mrr: 0,
  totalAnalyses: 0,
}

async function getStats(): Promise<DashboardStats & { recentPayments: Payment[] }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ...EMPTY_STATS, recentPayments: [] }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { ...EMPTY_STATS, recentPayments: [] }

  const adminClient = createAdminClient()

  // DB 집계 1콜 — 총회원 1000캡 제거, 매출 SUM, 활성구독·MRR·오늘가입
  let stats: DashboardStats = EMPTY_STATS
  const { data: rpcData, error: rpcError } = await adminClient.rpc('get_admin_dashboard_stats')
  if (rpcError) {
    logger.error('[admin/dashboard] stats rpc failed:', rpcError)
  } else if (rpcData && typeof rpcData === 'object') {
    const r = rpcData as Record<string, unknown>
    stats = {
      totalUsers: Number(r.totalUsers) || 0,
      todaySignups: Number(r.todaySignups) || 0,
      totalRevenue: Number(r.totalRevenue) || 0,
      todayRevenue: Number(r.todayRevenue) || 0,
      monthRevenue: Number(r.monthRevenue) || 0,
      activeSubscriptions: Number(r.activeSubscriptions) || 0,
      mrr: Number(r.mrr) || 0,
      totalAnalyses: Number(r.totalAnalyses) || 0,
    }
  }

  const { data: recentPayments } = await adminClient
    .from('payments')
    .select(
      `
      id,
      amount,
      status,
      created_at,
      profiles:user_id (full_name)
    `
    )
    .order('created_at', { ascending: false })
    .limit(5)

  return { ...stats, recentPayments: (recentPayments as Payment[]) || [] }
}

interface Payment {
  id: string
  amount: number
  status: string
  created_at: string
  profiles: { full_name: string }[] | null
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  const statCards = [
    {
      label: '총 회원수',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-blue-400',
      bgGradient: 'from-blue-500/20 to-blue-600/5',
      iconBg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: '오늘 가입',
      value: `+${stats.todaySignups.toLocaleString()}`,
      icon: UserPlus,
      color: 'text-sky-400',
      bgGradient: 'from-sky-500/20 to-sky-600/5',
      iconBg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
    },
    {
      label: '총 매출',
      value: `${stats.totalRevenue.toLocaleString()}원`,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgGradient: 'from-emerald-500/20 to-emerald-600/5',
      iconBg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: '오늘 매출',
      value: `${stats.todayRevenue.toLocaleString()}원`,
      icon: CreditCard,
      color: 'text-gold-400',
      bgGradient: 'from-gold-500/20 to-gold-600/5',
      iconBg: 'bg-gold-500/10',
      border: 'border-gold-500/20',
    },
    {
      label: '이번 달 매출',
      value: `${stats.monthRevenue.toLocaleString()}원`,
      icon: TrendingUp,
      color: 'text-teal-400',
      bgGradient: 'from-teal-500/20 to-teal-600/5',
      iconBg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
    },
    {
      label: '활성 구독',
      value: stats.activeSubscriptions.toLocaleString(),
      icon: Crown,
      color: 'text-pink-400',
      bgGradient: 'from-pink-500/20 to-pink-600/5',
      iconBg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
    },
    {
      label: 'MRR (월 반복매출)',
      value: `${stats.mrr.toLocaleString()}원`,
      icon: TrendingUp,
      color: 'text-amber-400',
      bgGradient: 'from-amber-500/20 to-amber-600/5',
      iconBg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: '총 분석 횟수',
      value: stats.totalAnalyses.toLocaleString(),
      icon: Activity,
      color: 'text-purple-400',
      bgGradient: 'from-purple-500/20 to-purple-600/5',
      iconBg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-black text-stone-100 font-serif">대시보드</h1>
        <p className="text-xs md:text-sm text-stone-500">해화당 서비스 현황을 한눈에 확인하세요.</p>
      </div>

      {/* Stats Grid - 모바일 2칸 / 데스크톱 4칸 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={`relative p-3.5 md:p-5 bg-gradient-to-br ${stat.bgGradient} border ${stat.border} hover:shadow-lg hover:shadow-${stat.color}/10 transition-all duration-300 overflow-hidden group`}
          >
            {/* Noise Overlay */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

            <div className="relative flex flex-col gap-2.5 md:gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] md:text-xs text-stone-400 font-medium tracking-wide">{stat.label}</p>
                <div
                  className={`p-1.5 md:p-2 rounded-lg ${stat.iconBg} group-hover:scale-110 transition-transform duration-300`}
                >
                  <stat.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${stat.color} drop-shadow-sm`} strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-base md:text-2xl font-black text-stone-100 truncate font-serif tracking-tight">
                {stat.value}
              </p>
            </div>

            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Card>
        ))}
      </div>

      {/* Hourly Traffic Chart */}
      <Card className="relative p-4 md:p-6 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
        <h2 className="relative text-base md:text-lg font-bold mb-3 md:mb-4 text-stone-100 font-serif flex items-center gap-2">
          <Activity className="w-4 h-4 md:w-5 md:h-5 text-gold-500" />
          시간대별 트래픽 (최근 24시간)
        </h2>
        <div className="relative">
          <TrafficChart />
        </div>
      </Card>

      {/* Recent Payments */}
      <Card className="relative p-4 md:p-6 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
        {/* Noise Overlay */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

        <h2 className="relative text-base md:text-lg font-bold mb-3 md:mb-4 text-stone-100 font-serif flex items-center gap-2">
          <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-gold-500" />
          최근 결제 내역
        </h2>
        <div className="relative space-y-0">
          {stats.recentPayments.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 rounded-full bg-stone-800/50 flex items-center justify-center">
                <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-stone-600" />
              </div>
              <p className="text-xs md:text-sm text-stone-500">결제 내역이 없습니다.</p>
            </div>
          ) : (
            stats.recentPayments.map((payment: Payment) => (
              <div
                key={payment.id}
                className="flex items-start md:items-center justify-between py-3 md:py-3.5 border-b border-stone-700/30 last:border-0 gap-2 group hover:bg-stone-800/20 -mx-4 md:-mx-6 px-4 md:px-6 transition-colors"
              >
                <div className="flex items-center gap-2.5 md:gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-gold-500/20 to-gold-600/5 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs md:text-sm font-bold text-gold-400">
                      {payment.profiles?.[0]?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-stone-200 truncate">
                      {payment.profiles?.[0]?.full_name || '익명'}
                    </p>
                    <p className="text-[10px] md:text-xs text-stone-500">
                      {new Date(payment.created_at).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 space-y-0.5">
                  <p className="text-xs md:text-sm font-bold text-stone-100 whitespace-nowrap font-mono">
                    {payment.amount?.toLocaleString()}원
                  </p>
                  <span
                    className={`inline-block text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      payment.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : payment.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {payment.status === 'completed' ? '완료' : payment.status === 'pending' ? '대기' : '실패'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
