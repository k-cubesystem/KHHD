import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSubscriptions, getSubscriptionStats } from './actions'
import { SubscriptionsTable } from './subscriptions-table'
import { AdminPageHeader } from '@/components/admin/ui/page-header'
import { StatStrip, StatTile } from '@/components/admin/ui/stat-tile'
import { Crown } from 'lucide-react'

/**
 * 구독 관리.
 *
 * 🔴 이 화면은 팔레트 통일(2026-08-19)에서 빠져 있었다. 밝은 테마 클래스가 그대로 남아
 *    어두운 어드민 위에서 **글씨가 안 보였다** — `text-gray-900`(#111827) on `surface`(#16140F).
 *    「월 예상 수익」 카드는 `bg-amber-50`(거의 흰색)이라 반대로 눈이 부셨다.
 * 🔴 제목도 둘이었다 — 여기서 한 번, `subscriptions-table` 에서 또 한 번.
 *    머리말은 화면당 하나이며 그 자리는 `AdminPageHeader` 다.
 */
export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/auth/login')
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    return redirect('/protected')
  }

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const statusFilter = params.status || 'ALL'

  const [stats, { subscriptions, total, totalPages }] = await Promise.all([
    getSubscriptionStats(),
    getSubscriptions(page, 20, statusFilter),
  ])

  return (
    <div className="space-y-4 md:space-y-6">
      <AdminPageHeader
        title="구독 관리"
        description="멤버십 구독자 현황과 결제 상태. 복채 수동 지급도 여기서 한다."
        icon={<Crown className="h-5 w-5 text-gold-500" aria-hidden />}
      />

      <StatStrip>
        <StatTile label="활성 구독자" value={stats.totalActive} unit="명" tone="accent" />
        <StatTile label="해지 예정" value={stats.totalCancelled} unit="명" hint="기간 끝까지는 이용" />
        <StatTile label="만료됨" value={stats.totalExpired} unit="명" />
        <StatTile
          label="결제 실패"
          value={stats.totalFailed}
          unit="명"
          tone={stats.totalFailed > 0 ? 'warn' : 'default'}
          hint={stats.totalFailed > 0 ? '재청구 확인 필요' : undefined}
        />
        <StatTile
          label="월 예상 수익"
          value={`${stats.monthlyRevenue.toLocaleString('ko-KR')}원`}
          tone="accent"
          hint="활성 구독 기준"
        />
      </StatStrip>

      <SubscriptionsTable
        subscriptions={subscriptions}
        currentPage={page}
        totalPages={totalPages}
        total={total}
        statusFilter={statusFilter}
      />
    </div>
  )
}
