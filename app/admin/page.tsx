import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardStats, AnimatedHeader } from '@/components/admin/dashboard-stats'
import { RecentActivityLive } from '@/components/admin/recent-activity-live'
import { TrafficChart } from '@/components/admin/traffic-chart'
import { Users, CreditCard, Package, Sparkles } from 'lucide-react'
import Link from 'next/link'

async function getStats() {
  const supabase = createAdminClient()

  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'completed')
  const totalRevenue = payments?.reduce((acc, curr) => acc + curr.amount, 0) || 0
  const { count: recordCount } = await supabase
    .from('saju_records')
    .select('*', { count: 'exact', head: true })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count: newUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  return {
    userCount: userCount || 0,
    totalRevenue: totalRevenue || 0,
    recordCount: recordCount || 0,
    newUsers: newUsers || 0,
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  const cards = [
    {
      label: '총 회원수',
      value: `${stats.userCount.toLocaleString()}명`,
      sub: `오늘 신규 ${stats.newUsers}명`,
      iconKey: 'users',
      color: 'text-blue-400',
    },
    {
      label: '누적 매출',
      value: `₩${stats.totalRevenue.toLocaleString()}`,
      sub: '결제 완료 기준',
      iconKey: 'revenue',
      color: 'text-gold-400',
    },
    {
      label: '생성된 비록',
      value: `${stats.recordCount.toLocaleString()}건`,
      sub: 'AI 분석 완료',
      iconKey: 'records',
      color: 'text-purple-400',
    },
    {
      label: '시스템 상태',
      value: '정상',
      sub: 'All Systems Operational',
      iconKey: 'system',
      color: 'text-emerald-400',
    },
  ]

  const quickActions = [
    { href: '/admin/users', label: '회원 관리', icon: Users, color: 'text-blue-400' },
    { href: '/admin/payments', label: '결제 내역', icon: CreditCard, color: 'text-gold-400' },
    { href: '/admin/products', label: '스토어 관리', icon: Package, color: 'text-purple-400' },
    { href: '/admin/prompts', label: 'AI 프롬프트', icon: Sparkles, color: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-4">
      <AnimatedHeader title="대시보드" subtitle="해화당 서비스 현황 개요" />

      <DashboardStats cards={cards} />

      {/* Traffic Chart */}
      <div className="relative p-4 bg-gradient-to-br from-stone-800/30 to-stone-900/20 rounded-xl border border-stone-700/30 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
        <div className="relative">
          <h2 className="text-sm font-serif font-bold text-stone-100 mb-3">시간대별 트래픽</h2>
          <TrafficChart />
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="relative p-4 bg-gradient-to-br from-stone-800/30 to-stone-900/20 rounded-xl border border-stone-700/30 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
          <div className="relative">
            <h2 className="text-sm font-serif font-bold text-stone-100 mb-3">빠른 이동</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(({ href, label, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 p-3 bg-stone-900/40 rounded-lg border border-stone-700/30 hover:border-gold-500/30 hover:bg-stone-800/40 transition-all group"
                >
                  <div className={`${color} flex-shrink-0`}>
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-stone-300 group-hover:text-stone-100 transition-colors font-medium">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="relative p-4 bg-gradient-to-br from-stone-800/30 to-stone-900/20 rounded-xl border border-stone-700/30 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
          <div className="relative">
            <h2 className="text-sm font-serif font-bold text-stone-100 mb-3">최근 활동</h2>
            <RecentActivityLive />
          </div>
        </div>
      </div>
    </div>
  )
}
