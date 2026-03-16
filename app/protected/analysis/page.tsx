import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { checkRouletteAvailability } from '@/app/actions/payment/roulette'
import { checkAttendanceAvailability, getWeeklyAttendance } from '@/app/actions/payment/attendance'
import { AnalysisHubClient } from './analysis-hub-client'

export const metadata: Metadata = {
  title: '사주 분석',
  description: '사주팔자 기반 AI 운세 분석 서비스',
}

export default async function AnalysisHubPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [rouletteStatus, attendanceStatus, weeklyAttendance] = await Promise.all([
    checkRouletteAvailability(),
    checkAttendanceAvailability().catch(() => ({ canCheckIn: false, alreadyChecked: false })),
    getWeeklyAttendance().catch(() => ({
      success: false as const,
      weekDays: [],
      weekCount: 0,
      totalBokchae: 0,
    })),
  ])

  return (
    <AnalysisHubClient
      rouletteStatus={rouletteStatus}
      attendanceStatus={attendanceStatus}
      weeklyAttendance={weeklyAttendance}
    />
  )
}
