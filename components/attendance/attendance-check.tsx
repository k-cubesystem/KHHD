'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarCheck, Gift, Sparkles, Check, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { checkInAttendance } from '@/app/actions/payment/attendance'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { WALLET_BALANCE_KEY } from '@/hooks/use-wallet'

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

// 보상 파티클
function RewardParticles({ isBonus }: { isBonus: boolean }) {
  const count = isBonus ? 16 : 8
  const emojis = isBonus ? ['💰', '🎉', '✨', '🌟', '💎'] : ['💰', '✨', '🪙']

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360
        const rad = (angle * Math.PI) / 180
        const dist = 60 + Math.random() * 40
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: Math.cos(rad) * dist,
              y: Math.sin(rad) * dist,
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 0],
            }}
            transition={{ duration: 1.2, delay: i * 0.04, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 text-sm"
            style={{ fontSize: 14 + Math.random() * 8 }}
          >
            {emojis[i % emojis.length]}
          </motion.div>
        )
      })}
    </div>
  )
}

// 스탬프 애니메이션
function StampAnimation() {
  return (
    <motion.div
      initial={{ scale: 3, opacity: 0, rotate: -30 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15, duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
    >
      <div className="w-16 h-16 rounded-full bg-gold-500/90 flex items-center justify-center shadow-lg shadow-gold-500/30">
        <Check className="w-8 h-8 text-white" strokeWidth={3} />
      </div>
    </motion.div>
  )
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
  const [showStamp, setShowStamp] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [lastReward, setLastReward] = useState<{
    reward: number
    isWeeklyBonus: boolean
    currentBalance?: number
  } | null>(null)
  const queryClient = useQueryClient()

  const handleCheckIn = useCallback(async () => {
    if (!canCheckIn || isChecking) return
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
        currentBalance: result.currentBalance,
      })

      // 스탬프 애니메이션 먼저
      setShowStamp(true)
      setTimeout(() => {
        setShowStamp(false)
        setShowReward(true)
        setShowParticles(true)
      }, 600)

      // 오늘 날짜 체크 표시 업데이트
      const today = new Date().toISOString().split('T')[0]
      setWeekDays((prev) => prev.map((d) => (d.date === today ? { ...d, checked: true } : d)))

      // 지갑 캐시 즉시 갱신
      if (result.currentBalance !== undefined) {
        queryClient.setQueryData(WALLET_BALANCE_KEY, result.currentBalance)
      }
      queryClient.invalidateQueries({ queryKey: WALLET_BALANCE_KEY })

      toast.success(
        result.isWeeklyBonus
          ? `주간 출석 완료! 복채 ${result.reward}만냥 (보너스 포함) 지급!`
          : `출석 체크 완료! 복채 ${result.reward}만냥 지급!`,
        { duration: 5000 }
      )

      setTimeout(() => {
        setShowReward(false)
        setShowParticles(false)
      }, 3500)
    } else {
      toast.error(result.error || '출석 체크에 실패했습니다.')
    }
  }, [canCheckIn, isChecking, queryClient])

  const progressPercent = Math.round((weekCount / 7) * 100)
  const isComplete = weekCount >= 7

  return (
    <Card className="bg-surface/30 border-primary/20 overflow-hidden relative">
      <CardContent className="p-4">
        {/* 파티클 이펙트 */}
        <AnimatePresence>
          {showParticles && lastReward && <RewardParticles isBonus={lastReward.isWeeklyBonus} />}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={canCheckIn ? { y: [0, -3, 0] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
            >
              <CalendarCheck className="w-5 h-5 text-primary" />
            </motion.div>
            <h3 className="text-sm font-bold text-ink-light">일일 출석 체크</h3>
          </div>
          <motion.div
            animate={isComplete ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full',
              isComplete
                ? 'bg-gradient-to-r from-purple-500/20 to-gold-500/20 border border-gold-500/30'
                : 'bg-gold-500/20 border border-gold-500/30'
            )}
          >
            {isComplete ? <Crown className="w-3 h-3 text-gold-400" /> : <Sparkles className="w-3 h-3 text-gold-400" />}
            <span className="text-[10px] font-bold text-gold-400">{isComplete ? '주간 완료!' : '주 10만냥'}</span>
          </motion.div>
        </div>

        {/* Weekly Progress */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-ink-light/60">이번 주 출석 ({weekCount}/7일)</span>
            <motion.span
              key={totalBokchae}
              initial={{ scale: 1.3, color: '#D4AF37' }}
              animate={{ scale: 1, color: 'rgba(212,175,55,1)' }}
              className="text-[10px] font-bold text-gold-400"
            >
              {totalBokchae}만냥 적립
            </motion.span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden relative">
            <motion.div
              className={cn(
                'h-full rounded-full',
                isComplete
                  ? 'bg-gradient-to-r from-purple-500 via-gold-400 to-gold-500'
                  : 'bg-gradient-to-r from-gold-400 to-gold-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {/* 발광 효과 */}
            {progressPercent > 0 && (
              <motion.div
                className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"
                animate={{ left: ['-10%', `${progressPercent + 5}%`] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            )}
          </div>
        </div>

        {/* Day Indicators */}
        <div className="grid grid-cols-7 gap-1.5 mb-3 relative">
          {/* 스탬프 오버레이 */}
          <AnimatePresence>{showStamp && <StampAnimation />}</AnimatePresence>

          {weekDays.map((day, i) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col items-center gap-0.5"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                animate={
                  day.isToday && canCheckIn
                    ? {
                        scale: [1, 1.1, 1],
                        borderColor: ['rgba(212,175,55,0.5)', 'rgba(212,175,55,1)', 'rgba(212,175,55,0.5)'],
                      }
                    : {}
                }
                transition={day.isToday && canCheckIn ? { duration: 1.5, repeat: Infinity } : {}}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border text-[9px] font-bold transition-all relative',
                  day.checked
                    ? 'bg-gradient-to-br from-gold-400 to-gold-600 border-gold-400 text-white shadow-md shadow-gold-500/20'
                    : day.isToday && canCheckIn
                      ? 'bg-primary/20 border-primary text-primary'
                      : day.isFuture
                        ? 'bg-surface/50 border-white/10 text-ink-light/30'
                        : 'bg-surface border-white/10 text-ink-light/50'
                )}
              >
                {day.checked ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </motion.div>
                ) : day.isToday && canCheckIn ? (
                  <Gift className="w-3.5 h-3.5" />
                ) : (
                  day.dayLabel
                )}

                {/* 7일차 보너스 마커 */}
                {i === 6 && !day.checked && (
                  <div className="absolute -top-1 -right-1">
                    <span className="text-[8px]">🎁</span>
                  </div>
                )}
              </motion.div>
              <span className={cn('text-[8px]', day.checked ? 'text-gold-400 font-bold' : 'text-ink-light/40')}>
                {day.dayLabel}
              </span>
              {/* 날짜별 복채 표시 */}
              <span className={cn('text-[7px]', day.checked ? 'text-gold-400/70' : 'text-ink-light/25')}>
                {i === 6 ? '+4' : '+1'}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Check-in Button */}
        <div className="relative">
          <motion.div whileTap={canCheckIn && !isChecking ? { scale: 0.95 } : {}}>
            <Button
              onClick={handleCheckIn}
              disabled={!canCheckIn || isChecking}
              className={cn(
                'w-full h-10 text-xs font-bold transition-all',
                canCheckIn && !isChecking
                  ? 'bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 text-white shadow-lg shadow-gold-500/20'
                  : 'bg-surface border border-white/10 text-ink-light/40 cursor-not-allowed'
              )}
            >
              {isChecking ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </motion.span>
                  출석 처리 중...
                </span>
              ) : canCheckIn ? (
                <span className="flex items-center gap-2">
                  <Gift className="w-3.5 h-3.5" />
                  출석 체크하기 (+1만냥)
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  오늘 출석 완료
                </span>
              )}
            </Button>
          </motion.div>

          {/* Reward Float Animation */}
          <AnimatePresence>
            {showReward && lastReward && (
              <motion.div
                initial={{ scale: 0, y: 0, opacity: 0 }}
                animate={{ scale: 1, y: -50, opacity: 1 }}
                exit={{ opacity: 0, y: -70, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-10"
              >
                <div
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold shadow-xl',
                    lastReward.isWeeklyBonus
                      ? 'bg-gradient-to-r from-purple-500 to-gold-500 text-white'
                      : 'bg-gradient-to-r from-gold-400 to-gold-500 text-white'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{lastReward.isWeeklyBonus ? '🎉' : '💰'}</span>
                    <div>
                      <p className="text-sm font-black">+{lastReward.reward}만냥</p>
                      {lastReward.isWeeklyBonus && <p className="text-[9px] opacity-80">주간 보너스 포함!</p>}
                    </div>
                  </div>
                  {lastReward.currentBalance !== undefined && (
                    <p className="text-[9px] opacity-70 text-center mt-0.5">잔액: {lastReward.currentBalance}만냥</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info */}
        <div className="mt-2.5 pt-2.5 border-t border-white/5">
          <div className="flex justify-between items-center">
            <p className="text-[9px] text-ink-light/40">매일 1만냥 · 7일 완료 시 +3만냥 보너스</p>
            {lastReward?.currentBalance !== undefined && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] text-gold-400/60">
                잔액 {lastReward.currentBalance}만냥
              </motion.p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
