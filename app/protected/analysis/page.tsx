import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWalletBalance } from '@/app/actions/wallet-actions'
import {
  getMonthlyFamilyFortune,
  getYearlyFortuneTrend,
  getFamilyFortuneBreakdown,
} from '@/app/actions/fortune-actions'
import { checkDailyAttendance } from '@/app/actions/daily-check-actions'
import { checkRouletteAvailability } from '@/app/actions/roulette-actions'
import { AnalysisHubClient } from './analysis-hub-client'
import { FortuneTimeline } from '@/components/fortune/fortune-timeline'
import { FamilyFortuneStatus } from '@/components/fortune/family-fortune-status'
import { EventBanners } from '@/components/events/event-banners'

// ── 느린 섹션 → 별도 async 서버 컴포넌트 (스트리밍) ──
async function TimelineSection() {
  const yearlyTrend = await getYearlyFortuneTrend()
  return <FortuneTimeline data={yearlyTrend} year={new Date().getFullYear()} />
}

async function FamilySection() {
  const breakdown = await getFamilyFortuneBreakdown()
  if (!breakdown || breakdown.length === 0) return null
  return <FamilyFortuneStatus members={breakdown} />
}

async function EventBannersSection() {
  const supabase = await createClient()
  const { data: eventBanners } = await supabase
    .from('event_banners')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(3)
  if (!eventBanners || eventBanners.length === 0) return null
  return <EventBanners banners={eventBanners} />
}

function SectionSkeleton({ height = 'h-24' }: { height?: string }) {
  return (
    <div
      className={`${height} bg-surface/10 border border-white/5 rounded-xl animate-pulse mx-4`}
    />
  )
}

export default async function AnalysisHubPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/sign-in')

  // 빠른 쿼리만 인라인 병렬 처리
  const [profile, walletBalance, monthlyFortune, attendanceStatus, rouletteStatus] =
    await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      getWalletBalance(),
      getMonthlyFamilyFortune(),
      checkDailyAttendance(),
      checkRouletteAvailability(),
    ])

  const userName = profile.data?.full_name || undefined

  return (
    <AnalysisHubClient
      userName={userName}
      walletBalance={walletBalance}
      monthlyFortune={monthlyFortune}
      attendanceStatus={attendanceStatus}
      rouletteStatus={rouletteStatus}
    >
      {/* 느린 섹션 — Suspense 스트리밍 */}
      <Suspense fallback={<SectionSkeleton height="h-40" />}>
        <TimelineSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton height="h-32" />}>
        <FamilySection />
      </Suspense>
      <Suspense fallback={null}>
        <EventBannersSection />
      </Suspense>
    </AnalysisHubClient>
  )
}
