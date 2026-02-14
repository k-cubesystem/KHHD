import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

import { getMonthlyFamilyFortune, getFamilyFortuneBreakdown } from '@/app/actions/fortune-actions'

import { checkRouletteAvailability } from '@/app/actions/roulette-actions'
import { checkAttendanceAvailability, getWeeklyAttendance } from '@/app/actions/attendance-actions'
import { AnalysisHubClient } from './analysis-hub-client'
import { FamilyFortuneStatus } from '@/components/fortune/family-fortune-status'
import { EventBanners } from '@/components/events/event-banners'

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
      className={`${height} bg - surface / 10 border border - white / 5 rounded - xl animate - pulse mx - 4`}
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
  const [profile, monthlyFortune, rouletteStatus, attendanceStatus, weeklyAttendance] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    getMonthlyFamilyFortune(),
    checkRouletteAvailability(),
    checkAttendanceAvailability().catch(() => ({ canCheckIn: false, alreadyChecked: false })),
    getWeeklyAttendance().catch(() => ({ success: false as const, weekDays: [], weekCount: 0, totalBokchae: 0 })),
  ])

  const userName = profile.data?.full_name || undefined

  return (
    <AnalysisHubClient
      userName={userName}
      monthlyFortune={monthlyFortune}
      rouletteStatus={rouletteStatus}
      attendanceStatus={attendanceStatus}
      weeklyAttendance={weeklyAttendance}
    >
      <Suspense fallback={<SectionSkeleton height="h-32" />}>
        <FamilySection />
      </Suspense>
    </AnalysisHubClient>
  )
}
