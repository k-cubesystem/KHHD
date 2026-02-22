'use client'

import { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { FortuneMissionBoard } from '@/components/fortune/fortune-mission-board'
import { LuckyRouletteButton } from '@/components/events/lucky-roulette-button'
import { AttendanceMiniCard } from '@/components/attendance/attendance-mini-card'

// Dynamic imports for heavy dashboard sections to improve initial load
import { MasterpieceSection } from './dashboard/MasterpieceSection'
const RelationshipSection = dynamic(
  () => import('./dashboard/RelationshipSection').then((mod) => ({ default: mod.RelationshipSection })),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-white/5 rounded-lg" /> }
)
const PeriodSection = dynamic(
  () => import('./dashboard/PeriodSection').then((mod) => ({ default: mod.PeriodSection })),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-white/5 rounded-lg" /> }
)
const Year2026Section = dynamic(
  () => import('./dashboard/Year2026Section').then((mod) => ({ default: mod.Year2026Section })),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-white/5 rounded-lg" /> }
)
const TrendSection = dynamic(() => import('./dashboard/TrendSection').then((mod) => ({ default: mod.TrendSection })), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-lg" />,
})

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
  weekDays: Array<{
    date: string
    dayLabel: string
    checked: boolean
    isToday: boolean
    isFuture: boolean
  }>
  weekCount: number
  totalBokchae: number
}

interface AnalysisDashboardProps {
  userName?: string
  monthlyFortune: MonthlyFortune
  rouletteStatus: RouletteStatus | null
  attendanceStatus?: AttendanceStatus
  weeklyAttendance?: WeeklyAttendance
  children?: ReactNode
}

export function AnalysisDashboard({
  userName,
  monthlyFortune,
  rouletteStatus,
  attendanceStatus,
  weeklyAttendance,
  children,
}: AnalysisDashboardProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="max-w-screen-sm mx-auto pb-40 px-2 space-y-6"
    >
      {/* 1. Hero */}
      <motion.section variants={fadeInUp} className="text-left space-y-3 pt-4 px-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 backdrop-blur-sm">
          <span className="text-[10px] font-medium text-[#D4AF37] tracking-widest uppercase">DESTINY INSIGHT</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-serif font-bold text-ink-light leading-snug tracking-tight">
          남들은 잘 되는데
          <br />
          <span className="text-[#D4AF37]">나만 제자리</span>인 것 같다면?
        </h1>

        <div className="space-y-4">
          <p className="text-sm text-ink-light/70 font-light leading-relaxed">
            당신의 노력이 부족해서가 아닙니다.
            <br />
            지금 바로 당신에게 들어온 <strong className="text-ink-light font-medium">거대한 기회의 흐름</strong>을<br />
            놓치고 있기 때문입니다.
          </p>

          <div className="flex items-center gap-2">
            <div className="h-px w-8 bg-[#D4AF37]/50" />
            <p className="text-xs font-serif text-[#D4AF37]/80">
              {userName ? `${userName}님의 운명 해설서` : '당신을 위한 운명 해설서'}
            </p>
          </div>
        </div>
      </motion.section>

      {/* 2. Masterpiece */}
      <motion.div variants={fadeInUp}>
        <MasterpieceSection />
      </motion.div>

      {/* 4. 가족 운세 섹션 — page.tsx에서 Suspense로 스트리밍 (위치 변경됨) */}
      {children && (
        <motion.div variants={fadeInUp} className="space-y-4">
          {children}
        </motion.div>
      )}

      {/* 3. 운세 미션 보드 (게이지 + 8미션 통합) */}
      <motion.div variants={fadeInUp}>
        <FortuneMissionBoard
          currentFortune={monthlyFortune.currentFortune}
          totalPossible={monthlyFortune.totalPossible}
          percentage={monthlyFortune.percentage}
          completedCategories={monthlyFortune.completedCategories}
        />
      </motion.div>

      {/* 5. Bento Grid */}
      <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-3">
        <motion.div variants={fadeInUp} className="col-span-1">
          <RelationshipSection />
        </motion.div>
        <motion.div variants={fadeInUp} className="col-span-1">
          <PeriodSection />
        </motion.div>
        <motion.div variants={fadeInUp} className="col-span-2">
          <Year2026Section />
        </motion.div>
      </motion.div>

      {/* 6. Trend + 룰렛 & 출석 (2열 정사각 카드) */}
      <motion.section variants={fadeInUp} className="-mx-2 px-2 space-y-3">
        <TrendSection />

        {/* 룰렛 + 출석체크 2열 */}
        <div className="grid grid-cols-2 gap-3">
          <LuckyRouletteButton
            canSpin={rouletteStatus?.canSpin || false}
            nextAvailableTime={rouletteStatus?.nextAvailableTime}
          />
          <AttendanceMiniCard
            canCheckIn={attendanceStatus?.canCheckIn ?? false}
            weekCount={weeklyAttendance?.weekCount ?? 0}
            weekDays={weeklyAttendance?.weekDays}
          />
        </div>
      </motion.section>
    </motion.div>
  )
}
