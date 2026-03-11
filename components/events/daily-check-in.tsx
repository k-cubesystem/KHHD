'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarCheck, Gift, Sparkles, Check, Flame, Crown, ChevronLeft, ChevronRight, Coins } from 'lucide-react'
import { recordDailyAttendance } from '@/app/actions/payment/daily-check'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface DailyCheckInProps {
  canCheckIn: boolean
  checkedDates?: string[]
  weekCount?: number
  totalBokchae?: number
  consecutiveStreak?: number
  /** @deprecated — kept for backwards compat, ignored */
  initialChecked?: boolean
  /** @deprecated — kept for backwards compat, ignored */
  initialConsecutiveDays?: number
}

/* ─────────────────────────────────────────
   Confetti Particles
───────────────────────────────────────── */
function RewardParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i / 5) * 360
        const rad = (angle * Math.PI) / 180
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: Math.cos(rad) * 50,
              y: Math.sin(rad) * 50,
              opacity: [0, 0.8, 0],
              scale: [0, 1, 0],
            }}
            transition={{ duration: 1, delay: i * 0.05, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-[#D4AF37]"
          />
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────
   Gold Stamp
───────────────────────────────────────── */
function GoldStamp() {
  return (
    <motion.div
      initial={{ scale: 4, opacity: 0, rotate: -25 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8B6914] flex items-center justify-center shadow-xl shadow-[#D4AF37]/40 border-2 border-[#D4AF37]/60">
        <Check className="w-6 h-6 text-black" strokeWidth={3.5} />
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────
   Monthly Calendar
───────────────────────────────────────── */
function MonthlyCalendar({
  year,
  month,
  checkedSet,
  showStamp,
}: {
  year: number
  month: number
  checkedSet: Set<string>
  showStamp: boolean
}) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일']

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-[9px] font-medium text-ink-light/40 py-0.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 relative">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isChecked = checkedSet.has(dateStr)
          const isToday = dateStr === todayStr
          const isFuture = dateStr > todayStr

          return (
            <div key={dateStr} className="flex flex-col items-center gap-0.5 relative">
              <motion.div
                animate={isChecked ? { scale: [1.2, 1] } : isToday ? { scale: [1, 1.08, 1] } : {}}
                transition={
                  isChecked ? { duration: 0.3 } : isToday ? { duration: 2, repeat: Infinity, repeatDelay: 1 } : {}
                }
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-medium relative',
                  isChecked
                    ? 'bg-gradient-to-br from-[#D4AF37] to-[#8B6914] text-black shadow-md shadow-[#D4AF37]/30'
                    : isToday
                      ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/60 text-[#D4AF37]'
                      : isFuture
                        ? 'text-ink-light/20'
                        : 'text-ink-light/50'
                )}
              >
                {isChecked ? (
                  isToday && showStamp ? (
                    <GoldStamp />
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </motion.div>
                  )
                ) : (
                  <span>{day}</span>
                )}
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Weekly Bonus Progress Bar
───────────────────────────────────────── */
function WeeklyStreakBar({ weekCount }: { weekCount: number }) {
  const isComplete = weekCount >= 7
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-ink-light/50">이번 주 ({weekCount}/7일)</span>
        <span className={cn('text-[10px] font-bold', isComplete ? 'text-[#D4AF37]' : 'text-[#D4AF37]/70')}>
          {isComplete ? '주간 보너스 달성!' : `${7 - weekCount}일 남음 → +3만냥`}
        </span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 7 }).map((_, i) => {
          const filled = i < weekCount
          return (
            <motion.div
              key={i}
              className={cn('h-2 flex-1 rounded-sm overflow-hidden relative', filled ? 'bg-[#D4AF37]' : 'bg-white/10')}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: 'easeOut' }}
              style={{ transformOrigin: 'left' }}
            >
              {filled && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 + i * 0.3 }}
                />
              )}
              {i === 6 && !filled && (
                <div className="absolute inset-0 flex items-center justify-end pr-0.5">
                  <Gift className="w-2 h-2 text-[#D4AF37]/40" />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export function DailyCheckIn({
  canCheckIn: initialCanCheckIn,
  checkedDates: initialCheckedDates = [],
  weekCount: initialWeekCount = 0,
  totalBokchae: initialTotalBokchae = 0,
  consecutiveStreak: initialStreak = 0,
}: DailyCheckInProps) {
  const today = new Date()
  const [canCheckIn, setCanCheckIn] = useState(initialCanCheckIn)
  const [checkedDates, setCheckedDates] = useState<string[]>(initialCheckedDates)
  const [weekCount, setWeekCount] = useState(initialWeekCount)
  const [totalBokchae, setTotalBokchae] = useState(initialTotalBokchae)
  const [streak, setStreak] = useState(initialStreak)
  const [isLoading, setIsLoading] = useState(false)
  const [showStamp, setShowStamp] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [lastReward, setLastReward] = useState<{ reward: number; isWeeklyBonus: boolean } | null>(null)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const checkedSet = useMemo(() => new Set(checkedDates), [checkedDates])

  const monthLabel = useMemo(
    () => new Date(viewYear, viewMonth, 1).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }),
    [viewYear, viewMonth]
  )

  const canGoPrev = useMemo(() => {
    const d = new Date(viewYear, viewMonth - 1, 1)
    const limit = new Date(today.getFullYear(), today.getMonth() - 3, 1)
    return d >= limit
  }, [viewYear, viewMonth, today])

  const canGoNext = useMemo(
    () => viewYear < today.getFullYear() || (viewYear === today.getFullYear() && viewMonth < today.getMonth()),
    [viewYear, viewMonth, today]
  )

  const handleCheckIn = useCallback(async () => {
    if (!canCheckIn || isLoading) return
    setIsLoading(true)
    const result = await recordDailyAttendance()
    setIsLoading(false)

    if (result.success) {
      const todayStr = today.toISOString().split('T')[0]
      setCanCheckIn(false)
      setCheckedDates((prev) => [...prev, todayStr])
      setWeekCount((prev) => prev + 1)
      setTotalBokchae((prev) => prev + (result.reward || 0))
      setStreak((prev) => prev + 1)
      setLastReward({ reward: result.reward || 1, isWeeklyBonus: result.isWeeklyBonus || false })

      setViewYear(today.getFullYear())
      setViewMonth(today.getMonth())

      setShowStamp(true)
      setTimeout(() => {
        setShowStamp(false)
        setShowParticles(true)
      }, 700)

      toast.success(result.message || `출석 체크 완료! 복채 ${result.reward}만냥 지급!`, { duration: 5000 })
      setTimeout(() => setShowParticles(false), 3500)
    } else {
      toast.error(result.error || '출석 체크에 실패했습니다.')
    }
  }, [canCheckIn, isLoading, today])

  const isWeekComplete = weekCount >= 7

  return (
    <Card className="bg-surface/30 border-primary/20 overflow-hidden relative">
      <CardContent className="p-4 space-y-4">
        {/* Particles */}
        <AnimatePresence>{showParticles && lastReward && <RewardParticles />}</AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={canCheckIn ? { y: [0, -3, 0] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
            >
              <CalendarCheck className="w-5 h-5 text-[#D4AF37]" />
            </motion.div>
            <h3 className="text-sm font-bold text-ink-light tracking-wide">일일 출석 체크</h3>
          </div>

          {/* Streak badge */}
          {streak >= 2 && (
            <motion.div
              key={streak}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full border',
                streak % 7 === 0
                  ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#8B6914]/20 border-[#D4AF37]/50'
                  : 'bg-[#D4AF37]/10 border-[#D4AF37]/25'
              )}
            >
              <Flame className="w-3 h-3 text-[#D4AF37]/80" />
              <span className="text-[10px] font-bold text-[#D4AF37]">{streak}일 연속</span>
              {streak % 7 === 0 && <Crown className="w-3 h-3 text-[#D4AF37]" />}
            </motion.div>
          )}
        </div>

        {/* Streak Hero Number */}
        {streak >= 1 && (
          <motion.div
            key={streak}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-3 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37]/5 via-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/20"
          >
            <Flame className="w-5 h-5 text-[#D4AF37]" />
            <div className="text-center">
              <motion.p
                key={streak}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl font-black text-[#D4AF37] leading-none"
              >
                {streak}
              </motion.p>
              <p className="text-[10px] text-ink-light/50 mt-0.5">연속 출석일</p>
            </div>
            {streak >= 7 && <Crown className="w-5 h-5 text-[#D4AF37]" />}
          </motion.div>
        )}

        {/* Monthly Calendar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                const d = new Date(viewYear, viewMonth - 1, 1)
                setViewYear(d.getFullYear())
                setViewMonth(d.getMonth())
              }}
              disabled={!canGoPrev}
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                canGoPrev
                  ? 'text-ink-light/60 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10'
                  : 'text-ink-light/20 cursor-not-allowed'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-medium text-ink-light/70">{monthLabel}</span>
            <button
              onClick={() => {
                const d = new Date(viewYear, viewMonth + 1, 1)
                setViewYear(d.getFullYear())
                setViewMonth(d.getMonth())
              }}
              disabled={!canGoNext}
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                canGoNext
                  ? 'text-ink-light/60 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10'
                  : 'text-ink-light/20 cursor-not-allowed'
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <MonthlyCalendar year={viewYear} month={viewMonth} checkedSet={checkedSet} showStamp={showStamp} />
        </div>

        {/* Weekly Bonus Bar */}
        <WeeklyStreakBar weekCount={weekCount} />

        {/* Check-in Button */}
        <div className="relative">
          <motion.div whileTap={canCheckIn && !isLoading ? { scale: 0.96 } : {}}>
            <Button
              onClick={handleCheckIn}
              disabled={!canCheckIn || isLoading}
              className={cn(
                'w-full h-12 text-sm font-bold transition-all relative overflow-hidden',
                canCheckIn && !isLoading
                  ? 'bg-gradient-to-r from-[#8B6914] via-[#D4AF37] to-[#8B6914] hover:from-[#9A7A20] hover:via-[#E5C04D] hover:to-[#9A7A20] text-black shadow-lg shadow-[#D4AF37]/20'
                  : 'bg-surface border border-[#D4AF37]/15 text-ink-light/35 cursor-not-allowed'
              )}
            >
              {canCheckIn && !isLoading && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.span>
                    출석 처리 중...
                  </>
                ) : canCheckIn ? (
                  <>
                    <Gift className="w-4 h-4" />
                    오늘 출석 체크하기 (+1만냥)
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    오늘 출석 완료
                  </>
                )}
              </span>
            </Button>
          </motion.div>

          {/* Reward float */}
          <AnimatePresence>
            {showParticles && lastReward && (
              <motion.div
                initial={{ scale: 0, y: 0, opacity: 0 }}
                animate={{ scale: 1, y: -60, opacity: 1 }}
                exit={{ opacity: 0, y: -80, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-10"
              >
                <div
                  className={cn(
                    'px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl border',
                    lastReward.isWeeklyBonus
                      ? 'bg-gradient-to-r from-[#8B6914] to-[#D4AF37] text-black border-[#D4AF37]/50'
                      : 'bg-gradient-to-r from-[#1A1200] to-[#2A1F00] text-[#D4AF37] border-[#D4AF37]/40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    <div>
                      <p className="text-base font-black">+{lastReward.reward}만냥</p>
                      {lastReward.isWeeklyBonus && <p className="text-[9px] opacity-80">주간 보너스 포함!</p>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <p className="text-[9px] text-ink-light/35">매일 1만냥 · 7일 개근 시 +3만냥 보너스</p>
          <motion.p
            key={totalBokchae}
            initial={{ color: '#D4AF37', scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-[9px] font-bold text-[#D4AF37]/60"
          >
            이달 {totalBokchae}만냥
          </motion.p>
        </div>
      </CardContent>
    </Card>
  )
}
