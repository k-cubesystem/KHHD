'use client'

import { ReactNode, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AnalysisDashboard } from '@/components/analysis/AnalysisDashboard'

interface RouletteStatus {
  canSpin: boolean
  nextAvailableTime?: string
}

interface MonthlyFortune {
  currentFortune: number
  totalPossible: number
  percentage: number
  completedCategories: string[]
}

interface AttendanceStatus {
  canCheckIn: boolean
  alreadyChecked?: boolean
}

interface WeeklyAttendance {
  weekDays: Array<{ date: string; dayLabel: string; checked: boolean; isToday: boolean; isFuture: boolean }>
  weekCount: number
  totalBokchae: number
}

interface AnalysisHubClientProps {
  userName?: string
  monthlyFortune: MonthlyFortune
  rouletteStatus: RouletteStatus | null
  attendanceStatus?: AttendanceStatus
  weeklyAttendance?: WeeklyAttendance
  children?: ReactNode
}

export function AnalysisHubClient({
  userName,
  monthlyFortune,
  rouletteStatus,
  attendanceStatus,
  weeklyAttendance,
  children,
}: AnalysisHubClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      setTimeout(() => {
        toast.success('🎁 50만냥이 지급되었습니다!', {
          description: '신규 회원 가입 축하 복채 50만냥이 지갑에 입금되었습니다.',
          duration: 6000,
          style: {
            background: 'linear-gradient(135deg, #1A1200 0%, #0D0900 100%)',
            border: '1px solid rgba(212,175,55,0.4)',
            color: '#F4E4BA',
          },
        })
      }, 600)
      // URL에서 welcome 파라미터 제거
      router.replace('/protected/analysis', { scroll: false })
    }
  }, [searchParams, router])

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Hanji Texture Overlay */}
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('/texture/hanji_noise.png')] bg-repeat" />

      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 w-full pt-6">
        <AnalysisDashboard
          userName={userName}
          monthlyFortune={monthlyFortune}
          rouletteStatus={rouletteStatus}
          attendanceStatus={attendanceStatus}
          weeklyAttendance={weeklyAttendance}
        >
          {children}
        </AnalysisDashboard>
      </div>
    </main>
  )
}
