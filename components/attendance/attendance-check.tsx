'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarCheck, Gift, Sparkles, Check } from 'lucide-react'
import { toast } from 'sonner'
import { checkInAttendance } from '@/app/actions/payment/attendance'
import { cn } from '@/lib/utils'

interface WeekDay {
  date: string
  dayLabel: string
  checked: boolean
  isToday: boolean
  isFuture: boolean
}

interface AttendanceCheckProps {
  canCheckIn: boolean
  weekDays: WeekDay[]
  weekCount: number
  totalBokchae: number
}

export function AttendanceCheck({
  canCheckIn: initialCanCheckIn,
  weekDays: initialWeekDays,
  weekCount: initialWeekCount,
  totalBokchae: initialTotalBokchae,
}: AttendanceCheckProps) {
  const [canCheckIn, setCanCheckIn] = useState(initialCanCheckIn)
  const [weekDays, setWeekDays] = useState(initialWeekDays)
  const [weekCount, setWeekCount] = useState(initialWeekCount)
  const [totalBokchae, setTotalBokchae] = useState(initialTotalBokchae)
  const [isChecking, setIsChecking] = useState(false)
  const [showReward, setShowReward] = useState(false)
  const [lastReward, setLastReward] = useState<{
    reward: number
    isWeeklyBonus: boolean
  } | null>(null)

  const handleCheckIn = async () => {
    setIsChecking(true)
    const result = await checkInAttendance()
    setIsChecking(false)

    if (result.success) {
      setCanCheckIn(false)
      setWeekCount((prev) => prev + 1)
      setTotalBokchae((prev) => prev + (result.reward || 0))
      setLastReward({
        reward: result.reward || 1,
        isWeeklyBonus: result.isWeeklyBonus || false,
      })
      setShowReward(true)

      // 오늘 날짜 체크 표시 업데이트
      const today = new Date().toISOString().split('T')[0]
      setWeekDays((prev) => prev.map((d) => (d.date === today ? { ...d, checked: true } : d)))

      // Enhanced toast message with current balance
      const balanceInfo = result.currentBalance ? ` | 현재 잔액: ${result.currentBalance}만냥` : ''

      toast.success(
        result.message || `출석 체크 완료! 복채 ${result.reward}만냥 지급!${balanceInfo}`,
        {
          duration: 5000,
        }
      )

      setTimeout(() => setShowReward(false), 3000)
    } else {
      toast.error(result.error || '출석 체크에 실패했습니다.')
    }
  }

  const progressPercent = Math.round((weekCount / 7) * 100)

  return (
    <Card className="bg-surface/30 border-primary/20 overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-ink-light">일일 출석 체크</h3>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-gold-500/20 border border-gold-500/30 rounded-full">
            <Sparkles className="w-3 h-3 text-gold-400" />
            <span className="text-[10px] font-bold text-gold-400">주 10만냥</span>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-ink-light/60">이번 주 출석 ({weekCount}/7일)</span>
            <span className="text-[10px] font-bold text-gold-400">{totalBokchae}만냥</span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Day Indicators */}
        <div className="grid grid-cols-7 gap-1 mb-3">
          {weekDays.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center border text-[9px] font-bold transition-all',
                  day.checked
                    ? 'bg-gold-500 border-gold-400 text-white'
                    : day.isToday && canCheckIn
                      ? 'bg-primary/20 border-primary text-primary animate-pulse'
                      : day.isFuture
                        ? 'bg-surface/50 border-white/10 text-ink-light/30'
                        : 'bg-surface border-white/10 text-ink-light/50'
                )}
              >
                {day.checked ? <Check className="w-3 h-3" /> : day.dayLabel}
              </div>
              <span className="text-[8px] text-ink-light/40">{day.dayLabel}</span>
            </div>
          ))}
        </div>

        {/* Check-in Button */}
        <div className="relative">
          <Button
            onClick={handleCheckIn}
            disabled={!canCheckIn || isChecking}
            className={cn(
              'w-full h-9 text-xs font-bold transition-all',
              canCheckIn && !isChecking
                ? 'bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 text-white shadow-md'
                : 'bg-surface border border-white/10 text-ink-light/40 cursor-not-allowed'
            )}
          >
            {isChecking ? (
              <span className="flex items-center gap-1.5">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ✨
                </motion.span>
                처리 중...
              </span>
            ) : canCheckIn ? (
              <span className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                출석 체크 (1만냥)
              </span>
            ) : (
              '오늘 출석 완료 ✓'
            )}
          </Button>

          {/* Reward Animation */}
          <AnimatePresence>
            {showReward && lastReward && (
              <motion.div
                initial={{ scale: 0, y: 0, opacity: 0 }}
                animate={{ scale: 1, y: -40, opacity: 1 }}
                exit={{ opacity: 0, y: -60 }}
                className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-10"
              >
                <div
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold shadow-lg',
                    lastReward.isWeeklyBonus
                      ? 'bg-gradient-to-r from-purple-500 to-gold-500 text-white'
                      : 'bg-gold-500 text-white'
                  )}
                >
                  +{lastReward.reward}만냥
                  {lastReward.isWeeklyBonus && ' 🎉 주간보너스!'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info */}
        <div className="mt-2 pt-2 border-t border-white/5">
          <p className="text-[9px] text-ink-light/40 text-center">
            매일 1만냥 · 7일 연속 출석 시 마지막날 +3만냥 보너스 (주 총 10만냥)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
