'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronRight, Sparkles, CalendarDays, Zap, ArrowLeft, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SEASONAL_EVENTS_2026,
  getCurrentSeasonalEvent,
  getUpcomingSeasonalEvent,
  getEventEndDate,
  getEventStartDate,
  ELEMENT_LABELS,
  SEASON_LABELS,
  getDiscountedCost,
  type SeasonalEvent,
  type Season,
} from '@/lib/data/seasonal-events'
import { cn } from '@/lib/utils'

const SEASON_BG: Record<Season, string> = {
  spring: 'from-pink-950/80 via-[#0D0900] to-charcoal-deep',
  summer: 'from-orange-950/80 via-[#0D0900] to-charcoal-deep',
  autumn: 'from-amber-950/80 via-[#0D0900] to-charcoal-deep',
  winter: 'from-blue-950/80 via-[#0D0900] to-charcoal-deep',
}

const SEASON_GLOW: Record<Season, string> = {
  spring: 'bg-pink-400/8',
  summer: 'bg-orange-400/8',
  autumn: 'bg-amber-600/8',
  winter: 'bg-blue-400/8',
}

const SERVICE_COSTS = [
  { key: 'fortune_analysis', label: '오늘의 운세', base: 1 },
  { key: 'saju', label: '천지인 사주', base: 5 },
  { key: 'compatibility', label: '궁합 분석', base: 2 },
  { key: 'trend', label: '대운 흐름', base: 2 },
]

function formatDate(month: number, day: number) {
  return `${month}월 ${day}일`
}

function useCountdown(targetDate: Date | null) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null)

  useEffect(() => {
    if (!targetDate) return
    const update = () => {
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()
      if (diff <= 0) {
        setTimeLeft(null)
        return
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      })
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [targetDate])

  return timeLeft
}

function EventCard({ event, isCurrent }: { event: SeasonalEvent; isCurrent: boolean }) {
  const elementInfo = ELEMENT_LABELS[event.element]
  return (
    <div
      className={cn(
        'rounded-xl border p-3 transition-all',
        isCurrent
          ? 'border-gold-500/50 bg-gold-500/5 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
          : 'border-white/5 bg-white/[0.02]'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{event.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn('text-sm font-bold', isCurrent ? 'text-gold-500' : 'text-white/80')}>
              {event.name}
            </span>
            <span className="text-xs text-white/40">{event.hanja}</span>
            {isCurrent && (
              <span className="px-1.5 py-0.5 rounded-full bg-gold-500/20 border border-gold-500/40 text-[9px] font-bold text-gold-500 tracking-wide">
                진행중
              </span>
            )}
          </div>
          <div className="text-xs text-white/40">
            {formatDate(event.startMonth, event.startDay)} ~ {formatDate(event.endMonth, event.endDay)}
          </div>
        </div>
        <div
          className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', elementInfo.bgColor, elementInfo.color)}
        >
          {event.discountPercent}%↓
        </div>
      </div>
      <p className="text-xs text-white/50 line-clamp-1 pl-8">{event.fortuneType}</p>
    </div>
  )
}

export default function SeasonalEventPage() {
  const [current, setCurrent] = useState<SeasonalEvent | null>(null)
  const [upcoming, setUpcoming] = useState<SeasonalEvent | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'current' | 'calendar'>('current')

  useEffect(() => {
    const c = getCurrentSeasonalEvent()
    const u = getUpcomingSeasonalEvent()
    setCurrent(c)
    setUpcoming(u)
    if (c) setEndDate(getEventEndDate(c))
  }, [])

  const timeLeft = useCountdown(endDate)
  const displayEvent = current

  const season = displayEvent?.season ?? 'spring'
  const elementInfo = displayEvent ? ELEMENT_LABELS[displayEvent.element] : null

  return (
    <div className={cn('min-h-screen bg-gradient-to-b text-white relative overflow-x-hidden pb-28', SEASON_BG[season])}>
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className={cn(
            'absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[180px]',
            SEASON_GLOW[season]
          )}
        />
      </div>

      {/* Back nav */}
      <div className="px-4 pt-4">
        <Link
          href="/protected/analysis"
          className="inline-flex items-center gap-1 text-white/50 hover:text-white/80 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </Link>
      </div>

      <div className="px-4 pt-6 max-w-md mx-auto space-y-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20">
            <Sparkles className="w-3 h-3 text-gold-500" />
            <span className="text-[10px] font-bold text-gold-500 tracking-widest uppercase">24절기 특별 이벤트</span>
          </div>

          {displayEvent ? (
            <>
              <div className="text-6xl">{displayEvent.emoji}</div>
              <h1 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-500 to-[#FFF8E1]">
                {displayEvent.name}({displayEvent.hanja})
              </h1>
              <p className="text-white/60 text-sm font-light leading-relaxed">{displayEvent.description}</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {elementInfo && (
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full border text-xs font-bold',
                      elementInfo.bgColor,
                      elementInfo.color
                    )}
                  >
                    {elementInfo.label}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-xs text-white/60">
                  {SEASON_LABELS[displayEvent.season]}
                </span>
                <span className="px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-xs text-white/60">
                  {formatDate(displayEvent.startMonth, displayEvent.startDay)} ~{' '}
                  {formatDate(displayEvent.endMonth, displayEvent.endDay)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl">🌏</div>
              <h1 className="text-2xl font-serif font-bold text-white/80">24절기 이벤트 캘린더</h1>
              <p className="text-white/50 text-sm">현재 진행 중인 절기 이벤트가 없습니다.</p>
            </>
          )}
        </motion.header>

        {/* Countdown + Discount */}
        {displayEvent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gold-500/5 border border-gold-500/30 rounded-2xl p-5 space-y-4 shadow-[0_0_20px_rgba(212,175,55,0.08)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/50 mb-0.5">이번 절기 특별 할인</p>
                <p className="text-3xl font-bold text-gold-500">{displayEvent.discountPercent}% OFF</p>
              </div>
              {timeLeft && (
                <div className="text-right">
                  <p className="text-xs text-white/40 mb-1 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" /> 이벤트 종료까지
                  </p>
                  <div className="flex items-baseline gap-1 justify-end">
                    {timeLeft.days > 0 && <span className="text-base font-bold text-white/80">{timeLeft.days}일</span>}
                    <span className="text-base font-bold text-white/80">{timeLeft.hours}시간</span>
                    <span className="text-base font-bold text-white/80">{timeLeft.minutes}분</span>
                  </div>
                </div>
              )}
            </div>

            {/* Special fortune type */}
            <div className="border-t border-white/5 pt-4">
              <p className="text-xs text-white/40 mb-2">이번 절기 특화 운세</p>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gold-500" />
                <span className="text-sm font-bold text-white">{displayEvent.fortuneType}</span>
              </div>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                {displayEvent.element}(
                {displayEvent.element === '목'
                  ? '木'
                  : displayEvent.element === '화'
                    ? '火'
                    : displayEvent.element === '토'
                      ? '土'
                      : displayEvent.element === '금'
                        ? '金'
                        : '水'}
                ) 기운이 강한 시기. {displayEvent.fortuneType}와 관련된 분석이 더욱 정확합니다.
              </p>
            </div>
          </motion.div>
        )}

        {/* Tab navigation */}
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 gap-1">
          {(['current', 'calendar'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-bold transition-all',
                activeTab === tab
                  ? 'bg-gold-500/20 text-gold-500 border border-gold-500/30'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              {tab === 'current' ? '서비스 할인가' : '연간 절기 캘린더'}
            </button>
          ))}
        </div>

        {/* Tab: Discounted service costs */}
        {activeTab === 'current' && displayEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-xs text-white/40 px-1">* 이벤트 기간 중 아래 서비스에 자동 할인 적용됩니다.</p>
            {SERVICE_COSTS.map((svc) => {
              const discounted = getDiscountedCost(svc.base, displayEvent.discountPercent)
              return (
                <div
                  key={svc.key}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/8 bg-white/[0.03]"
                >
                  <span className="text-sm text-white/80">{svc.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/30 line-through">{svc.base}만냥</span>
                    <span className="text-sm font-bold text-gold-500">{discounted}만냥</span>
                  </div>
                </div>
              )
            })}

            <div className="mt-4 space-y-2">
              <Button
                asChild
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-gold-500 to-[#F0C040] text-charcoal-deep hover:from-[#E5C14A] hover:to-[#FFD452] border-0 shadow-lg shadow-gold-500/20"
              >
                <Link href="/protected/analysis">
                  지금 운세 보러 가기 <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <p className="text-center text-xs text-white/30">
                할인은 {formatDate(displayEvent.endMonth, displayEvent.endDay)} 자정까지 자동 적용됩니다.
              </p>
            </div>
          </motion.div>
        )}

        {/* Tab: No current event service view */}
        {activeTab === 'current' && !displayEvent && upcoming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center space-y-2"
          >
            <div className="text-3xl">{upcoming.emoji}</div>
            <p className="text-sm text-white/60">다음 절기 이벤트</p>
            <p className="text-lg font-serif font-bold text-gold-500">
              {upcoming.name}({upcoming.hanja})
            </p>
            <p className="text-xs text-white/40">
              {formatDate(upcoming.startMonth, upcoming.startDay)}부터 {upcoming.discountPercent}% 할인 시작
            </p>
          </motion.div>
        )}

        {/* Tab: Annual calendar */}
        {activeTab === 'calendar' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-gold-500" />
              <span className="text-sm font-bold text-white/80">2026년 24절기 이벤트 일정</span>
            </div>
            {SEASONAL_EVENTS_2026.map((event) => (
              <EventCard key={event.id} event={event} isCurrent={current?.id === event.id} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
