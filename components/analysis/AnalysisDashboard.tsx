'use client'

import { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { FORTUNE_MISSIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { FortuneEnergyGauge } from '@/components/fortune/fortune-energy-gauge'

import { LuckyRouletteButton } from '@/components/events/lucky-roulette-button'

// Dynamic imports for heavy dashboard sections to improve initial load
const MasterpieceSection = dynamic(
  () =>
    import('./dashboard/MasterpieceSection').then((mod) => ({ default: mod.MasterpieceSection })),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-white/5 rounded-lg" /> }
)
const RelationshipSection = dynamic(
  () =>
    import('./dashboard/RelationshipSection').then((mod) => ({ default: mod.RelationshipSection })),
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
const TrendSection = dynamic(
  () => import('./dashboard/TrendSection').then((mod) => ({ default: mod.TrendSection })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-lg" /> }
)

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

interface AnalysisDashboardProps {
  userName?: string
  monthlyFortune: MonthlyFortune
  rouletteStatus: RouletteStatus | null
  children?: ReactNode
}

export function AnalysisDashboard({
  userName,
  monthlyFortune,
  rouletteStatus,
  children,
}: AnalysisDashboardProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="max-w-screen-sm mx-auto pb-40 px-2 space-y-6"
    >
      {/* 1. Hero (Moved from #3) */}
      <motion.section variants={fadeInUp} className="text-left space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
          <span className="text-xs font-light text-[#D4AF37] uppercase tracking-wider">
            Analysis Center
          </span>
        </div>
        <h1 className="text-2xl font-serif font-light text-ink-light leading-tight tracking-wide">
          {userName ? `${userName}님의 운명 분석` : '당신의 운명을 분석합니다'}
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          사주·궁합·운세를 한눈에 확인하세요
        </p>
      </motion.section>

      {/* 2. Masterpiece (Moved from #7) */}
      <motion.div variants={fadeInUp}>
        <MasterpieceSection />
      </motion.div>

      {/* 5. Fortune Energy Gauge (Was #4) */}
      <motion.div variants={fadeInUp}>
        <FortuneEnergyGauge
          currentFortune={monthlyFortune.currentFortune}
          totalPossible={monthlyFortune.totalPossible}
          percentage={monthlyFortune.percentage}
          variant="monthly"
        />
      </motion.div>

      {/* 6. 8가지 운세 미션 그리드 (Was #5) */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-primary/20 rounded-full" />
          <h2 className="text-sm font-serif font-light text-ink-light tracking-wide">
            8가지 운세 채우기
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {FORTUNE_MISSIONS.map((mission, idx) => {
            const isCompleted = monthlyFortune.completedCategories.includes(mission.category)
            const Icon = mission.icon
            return (
              <Link
                key={idx}
                href={mission.path}
                className={cn(
                  'flex flex-col items-center justify-center aspect-square rounded-lg border transition-all p-2',
                  isCompleted
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-surface/20 border-white/5 hover:border-primary/10'
                )}
              >
                <Icon
                  className={cn('w-6 h-6 mb-2', isCompleted ? 'text-primary' : 'text-ink-light/40')}
                  strokeWidth={1}
                />
                <span
                  className={cn(
                    'text-[10px] text-center leading-tight font-light',
                    isCompleted ? 'text-primary' : 'text-ink-light/60'
                  )}
                >
                  {mission.label}
                </span>
                {isCompleted && (
                  <span className="text-[8px] text-primary/70 mt-1 font-light">✓</span>
                )}
              </Link>
            )
          })}
        </div>
      </motion.div>

      {/* 7. Bento Grid (Remaining Items) */}
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

      {/* 8. Trend + Roulette */}
      <motion.section variants={fadeInUp} className="-mx-2 px-2 space-y-4">
        <TrendSection />
        <div className="px-0">
          <LuckyRouletteButton
            canSpin={rouletteStatus?.canSpin || false}
            nextAvailableTime={rouletteStatus?.nextAvailableTime}
          />
        </div>
      </motion.section>

      {/* 9~11. 느린 서버 섹션 — page.tsx에서 Suspense로 스트리밍 */}
      {children && (
        <motion.div variants={fadeInUp} className="space-y-4">
          {children}
        </motion.div>
      )}
    </motion.div>
  )
}
