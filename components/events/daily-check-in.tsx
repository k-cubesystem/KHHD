'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CalendarCheck, Sparkles, Check, Flame, Crown, ChevronLeft, ChevronRight } from 'lucide-react'
import { recordDailyAttendance } from '@/app/actions/payment/attendance'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useKstToday, parseKstDateString } from '@/hooks/use-kst-today'
import { logger } from '@/lib/utils/logger'

interface DailyCheckInProps {
  canCheckIn: boolean
  checkedDates?: string[]
  consecutiveStreak?: number
}

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
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-gold-500"
          />
        )
      })}
    </div>
  )
}

function GoldStamp() {
  return (
    <motion.div
      initial={{ scale: 4, opacity: 0, rotate: -25 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-500 to-[#8B6914] flex items-center justify-center shadow-xl shadow-gold-500/40 border-2 border-gold-500/60">
        <Check className="w-6 h-6 text-black" strokeWidth={3.5} />
      </div>
    </motion.div>
  )
}

function MonthlyCalendar({
  year,
  month,
  checkedSet,
  showStamp,
  todayStr,
}: {
  year: number
  month: number
  checkedSet: Set<string>
  showStamp: boolean
  /** KST 기준 오늘 "YYYY-MM-DD" — 서버 출석 판정과 같은 기준이어야 한다 */
  todayStr: string
}) {
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
    <div className="w-full" role="grid" aria-label="출석 달력">
      <div className="grid grid-cols-7 mb-1" role="row">
        {dayLabels.map((d) => (
          <div key={d} role="columnheader" className="text-center text-[9px] font-medium text-ink-light/40 py-0.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 relative">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} role="gridcell" />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isChecked = checkedSet.has(dateStr)
          const isToday = dateStr === todayStr
          const isFuture = dateStr > todayStr

          return (
            <div
              key={dateStr}
              role="gridcell"
              aria-label={`${month + 1}월 ${day}일${isChecked ? ' 출석 완료' : ''}${isToday ? ' 오늘' : ''}`}
              className="flex flex-col items-center gap-0.5 relative"
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-medium relative',
                  isChecked
                    ? 'bg-gradient-to-br from-gold-500 to-[#8B6914] text-black shadow-md shadow-gold-500/30'
                    : isToday
                      ? 'bg-gold-500/15 border border-gold-500/60 text-gold-500'
                      : isFuture
                        ? 'text-ink-light/20'
                        : 'text-ink-light/50'
                )}
                style={isToday && !isChecked ? { animation: 'scale-pulse 2s ease-in-out 1s infinite' } : undefined}
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
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 정성 적립이 실패하면(누적 0) 출석만 알린다 — 쌓이지 않은 정성을 쌓였다고 말하지 않는다. */
function checkInMessage(devotionGained: boolean, devotionTotalDays: number): string {
  if (devotionGained) return `출석했어요. 신당 정성이 하루 쌓였어요 (누적 ${devotionTotalDays}일)`
  if (devotionTotalDays > 0) return '출석했어요. 오늘 정성은 이미 쌓여 있어요'
  return '출석했어요.'
}

/**
 * 일일 출석 — 출석하면 신당 정성(기원)이 하루 쌓인다. 재화 지급은 없다(2026-09-18 복채 폐지).
 * 정성은 기도와 같은 날이면 하루로 센다(서버 KST 멱등) — 그래서 «+1일»은 실제로 쌓였을 때만 띄운다.
 */
export function DailyCheckIn({
  canCheckIn: initialCanCheckIn,
  checkedDates: initialCheckedDates = [],
  consecutiveStreak: initialStreak = 0,
}: DailyCheckInProps) {
  // 자정에 스스로 갱신되는 KST 날짜. 밤새 열어둔 세션도 날짜가 따라 넘어간다.
  const todayStr = useKstToday()
  const { year: todayYear, monthIndex: todayMonth } = useMemo(() => parseKstDateString(todayStr), [todayStr])

  const [open, setOpen] = useState(false)
  const [canCheckIn, setCanCheckIn] = useState(initialCanCheckIn)
  const [checkedDates, setCheckedDates] = useState<string[]>(initialCheckedDates)
  const [streak, setStreak] = useState(initialStreak)
  const [isLoading, setIsLoading] = useState(false)
  const [showStamp, setShowStamp] = useState(false)
  const [showDevotion, setShowDevotion] = useState(false)
  // 보고 있는 달은 절대 연·월이 아니라 '이번 달로부터의 오프셋'이다(자정에 시야가 따라 넘어간다).
  const [monthOffset, setMonthOffset] = useState(0)

  const checkedSet = useMemo(() => new Set(checkedDates), [checkedDates])
  const monthCount = useMemo(
    () => checkedDates.filter((d) => d.startsWith(todayStr.slice(0, 7))).length,
    [checkedDates, todayStr]
  )

  const viewDate = useMemo(() => new Date(todayYear, todayMonth + monthOffset, 1), [todayYear, todayMonth, monthOffset])
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()

  const monthLabel = useMemo(() => viewDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }), [viewDate])

  const canGoPrev = monthOffset > -3
  const canGoNext = monthOffset < 0

  const markCheckedToday = useCallback(() => {
    setCanCheckIn(false)
    setCheckedDates((prev) => (prev.includes(todayStr) ? prev : [...prev, todayStr]))
  }, [todayStr])

  const handleCheckIn = useCallback(async () => {
    if (!canCheckIn || isLoading) return
    setIsLoading(true)
    const result = await recordDailyAttendance().catch((error: unknown) => {
      logger.error('[DailyCheckIn] 출석 요청 실패:', error)
      return null
    })
    setIsLoading(false)

    if (!result) {
      toast.error('출석을 기록하지 못했어요. 잠시 후 다시 시도해 주세요.')
      return
    }
    if (!result.success) {
      if (result.alreadyChecked) markCheckedToday()
      toast.error(result.error)
      return
    }

    markCheckedToday()
    setStreak((prev) => prev + 1)
    setMonthOffset(0)
    setShowStamp(true)
    setTimeout(() => {
      setShowStamp(false)
      setShowDevotion(result.devotionGained)
    }, 700)

    toast.success(checkInMessage(result.devotionGained, result.devotionTotalDays), { duration: 5000 })
    setTimeout(() => setShowDevotion(false), 3500)
  }, [canCheckIn, isLoading, markCheckedToday])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="일일 출석 체크 열기"
          className={cn(
            'w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all active:scale-[0.98]',
            canCheckIn
              ? 'bg-gradient-to-r from-gold-500/10 via-gold-500/5 to-transparent border-gold-500/40 hover:border-gold-500/60'
              : 'bg-surface/40 border-primary/20 hover:border-primary/40'
          )}
        >
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
              canCheckIn ? 'bg-gold-500/15 text-gold-500' : 'bg-surface/60 text-ink-light/50'
            )}
            style={canCheckIn ? { animation: 'bounce-y 1.5s ease-in-out 0.5s infinite' } : undefined}
          >
            <CalendarCheck className="w-[18px] h-[18px]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-ink-light tracking-wide">일일 출석 체크</span>
              {streak >= 2 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-gold-500">
                  <Flame className="w-3 h-3" />
                  {streak}일{streak % 7 === 0 && <Crown className="w-3 h-3" />}
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink-light/50 mt-0.5 truncate">
              {canCheckIn ? '출석하면 신당에 정성이 하루 쌓여요' : `오늘 출석 완료 · 이달 ${monthCount}일`}
            </p>
          </div>

          {canCheckIn ? (
            <span className="shrink-0 text-[11px] font-bold text-black bg-gradient-to-r from-[#8B6914] via-gold-500 to-[#8B6914] px-2.5 py-1.5 rounded-full">
              출석하기
            </span>
          ) : (
            <ChevronRight className="w-4 h-4 text-ink-light/40 shrink-0" />
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <div className="hanji-card border-0 p-4 space-y-4 relative">
          <AnimatePresence>{showDevotion && <RewardParticles />}</AnimatePresence>

          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <div
                className="anim-bounce-y"
                style={canCheckIn ? { animation: 'bounce-y 1.5s ease-in-out 0.5s infinite' } : undefined}
              >
                <CalendarCheck className="w-5 h-5 text-gold-500" />
              </div>
              <DialogTitle className="text-sm font-bold text-ink-light tracking-wide">일일 출석 체크</DialogTitle>
            </div>

            {streak >= 2 && (
              <div
                key={streak}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full border anim-fade-in-up',
                  streak % 7 === 0
                    ? 'bg-gradient-to-r from-gold-500/20 to-[#8B6914]/20 border-gold-500/50'
                    : 'bg-gold-500/10 border-gold-500/25'
                )}
                style={{ '--fade-y': '5px', animation: 'fade-in-up 0.3s ease-out both' } as React.CSSProperties}
              >
                <Flame className="w-3 h-3 text-gold-500/80" />
                <span className="text-[10px] font-bold text-gold-500">{streak}일 연속</span>
                {streak % 7 === 0 && <Crown className="w-3 h-3 text-gold-500" />}
              </div>
            )}
          </div>

          {streak >= 1 && (
            <motion.div
              key={streak}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-3 py-2.5 rounded-xl bg-gradient-to-r from-gold-500/5 via-gold-500/10 to-gold-500/5 border border-gold-500/20"
            >
              <Flame className="w-5 h-5 text-gold-500" />
              <div className="text-center">
                <motion.p
                  key={streak}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-2xl font-black text-gold-500 leading-none"
                >
                  {streak}
                </motion.p>
                <p className="text-[10px] text-ink-light/50 mt-0.5">연속 출석일</p>
              </div>
              {streak >= 7 && <Crown className="w-5 h-5 text-gold-500" />}
            </motion.div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMonthOffset((o) => o - 1)}
                aria-label="이전 달"
                disabled={!canGoPrev}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                  canGoPrev
                    ? 'text-ink-light/60 hover:text-gold-500 hover:bg-gold-500/10'
                    : 'text-ink-light/20 cursor-not-allowed'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-medium text-ink-light/70">{monthLabel}</span>
              <button
                onClick={() => setMonthOffset((o) => o + 1)}
                aria-label="다음 달"
                disabled={!canGoNext}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                  canGoNext
                    ? 'text-ink-light/60 hover:text-gold-500 hover:bg-gold-500/10'
                    : 'text-ink-light/20 cursor-not-allowed'
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <MonthlyCalendar
              year={viewYear}
              month={viewMonth}
              checkedSet={checkedSet}
              showStamp={showStamp}
              todayStr={todayStr}
            />
          </div>

          <div className="relative">
            <motion.div whileTap={canCheckIn && !isLoading ? { scale: 0.96 } : {}}>
              <Button
                onClick={handleCheckIn}
                disabled={!canCheckIn || isLoading}
                className={cn(
                  'w-full h-12 text-sm font-bold transition-all relative overflow-hidden',
                  canCheckIn && !isLoading
                    ? 'bg-gradient-to-r from-[#8B6914] via-gold-500 to-[#8B6914] hover:from-[#9A7A20] hover:via-[#E5C04D] hover:to-[#9A7A20] text-black shadow-lg shadow-gold-500/20'
                    : 'bg-surface border border-gold-500/15 text-ink-light/35 cursor-not-allowed'
                )}
              >
                {canCheckIn && !isLoading && (
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent anim-shimmer"
                    style={{ animation: 'shimmer-slide 2s ease-in-out 1.5s infinite' }}
                  />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <span
                        className="inline-flex anim-spin-loading"
                        style={{ animation: 'spin-loading 0.8s linear infinite' }}
                      >
                        <Sparkles className="w-4 h-4" />
                      </span>
                      출석 처리 중...
                    </>
                  ) : canCheckIn ? (
                    <>
                      <CalendarCheck className="w-4 h-4" />
                      오늘 출석 체크하기
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

            <AnimatePresence>
              {showDevotion && (
                <motion.div
                  initial={{ scale: 0, y: 0, opacity: 0 }}
                  animate={{ scale: 1, y: -60, opacity: 1 }}
                  exit={{ opacity: 0, y: -80, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-10"
                >
                  <div className="px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl border bg-gradient-to-r from-[#1A1200] to-[#2A1F00] text-gold-500 border-gold-500/40">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5" />
                      <p className="text-base font-black">정성 +1일</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <DialogDescription className="text-[9px] text-ink-light/35">
              출석하면 신당 정성이 하루 쌓여요 · 기도와 같은 날은 하루로 셉니다
            </DialogDescription>
            <p className="text-[9px] font-bold text-gold-500/60 shrink-0">이달 {monthCount}일</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
