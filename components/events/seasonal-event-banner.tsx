'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { X, ChevronRight, Sparkles } from 'lucide-react'
import {
  getCurrentSeasonalEvent,
  getEventEndDate,
  ELEMENT_LABELS,
  type SeasonalEvent,
} from '@/lib/data/seasonal-events'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'seasonal_banner_dismissed'

function getStoredDismiss(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate))
    }, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

function getTimeLeft(targetDate: Date) {
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()
  if (diff <= 0) return null

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds }
}

const SEASON_THEMES = {
  spring: {
    gradient: 'from-pink-500/10 via-transparent to-transparent',
    border: 'border-pink-400/20',
    badge: 'bg-pink-500/15 border-pink-400/30 text-pink-300',
  },
  summer: {
    gradient: 'from-orange-500/10 via-transparent to-transparent',
    border: 'border-orange-400/20',
    badge: 'bg-orange-500/15 border-orange-400/30 text-orange-300',
  },
  autumn: {
    gradient: 'from-amber-600/10 via-transparent to-transparent',
    border: 'border-amber-500/20',
    badge: 'bg-amber-600/15 border-amber-500/30 text-amber-300',
  },
  winter: {
    gradient: 'from-blue-500/10 via-transparent to-transparent',
    border: 'border-blue-400/20',
    badge: 'bg-blue-500/15 border-blue-400/30 text-blue-300',
  },
}

// Particles removed for minimal design

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-bold text-gold-500 tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] text-white/40 mt-0.5">{label}</span>
    </div>
  )
}

function Separator() {
  return <span className="text-gold-500/50 text-sm font-bold self-start mt-0.5">:</span>
}

interface SeasonalEventBannerProps {
  /** Override event for SSR-friendly usage. If not provided, auto-detects. */
  event?: SeasonalEvent | null
}

export function SeasonalEventBanner({ event: propEvent }: SeasonalEventBannerProps) {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash
  const [event, setEvent] = useState<SeasonalEvent | null>(propEvent ?? null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  useEffect(() => {
    // Detect event client-side if not provided
    const detected = propEvent !== undefined ? propEvent : getCurrentSeasonalEvent()
    setEvent(detected)

    if (!detected) return

    const end = getEventEndDate(detected)
    setEndDate(end)

    // Check if this event was already dismissed
    const stored = getStoredDismiss()
    if (stored === detected.id) {
      setDismissed(true)
    } else {
      setDismissed(false)
    }
  }, [propEvent])

  const handleDismiss = useCallback(() => {
    if (!event) return
    try {
      localStorage.setItem(DISMISS_KEY, event.id)
    } catch {}
    setDismissed(true)
  }, [event])

  const timeLeft = useCountdown(endDate ?? new Date(0))

  if (!event || dismissed) return null

  const theme = SEASON_THEMES[event.season]
  const elementInfo = ELEMENT_LABELS[event.element]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cn(
          'relative overflow-hidden rounded-xl border backdrop-blur-sm',
          'bg-gradient-to-br',
          theme.gradient,
          theme.border,
          'bg-[#0D0900]/80'
        )}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />

        <div className="relative z-10 p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Event badge */}
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-widest uppercase',
                  theme.badge
                )}
              >
                <Sparkles className="w-2.5 h-2.5" />
                절기 특별 이벤트
              </span>
              {/* Element badge */}
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold',
                  elementInfo.bgColor,
                  elementInfo.color
                )}
              >
                {elementInfo.label}
              </span>
            </div>

            <button
              onClick={handleDismiss}
              className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0 mt-0.5"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main content */}
          <div className="flex items-center gap-3">
            <span className="text-3xl flex-shrink-0">{event.emoji}</span>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <h3 className="text-base font-serif font-bold text-white">
                  {event.name}({event.hanja})
                </h3>
                <span className="text-xs text-white/50">{event.fortuneType}</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed line-clamp-2">{event.description}</p>
            </div>
          </div>

          {/* Discount + Countdown + CTA row */}
          <div className="mt-3 flex items-center justify-between gap-2">
            {/* Discount pill */}
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-lg bg-gold-500/20 border border-gold-500/40">
                <span className="text-sm font-bold text-gold-500">{event.discountPercent}% 할인</span>
              </div>

              {/* Countdown */}
              {timeLeft && (
                <div className="flex items-center gap-0.5 bg-white/5 rounded-lg px-2 py-1 border border-white/10">
                  {timeLeft.days > 0 && (
                    <>
                      <TimeUnit value={timeLeft.days} label="일" />
                      <Separator />
                    </>
                  )}
                  <TimeUnit value={timeLeft.hours} label="시" />
                  <Separator />
                  <TimeUnit value={timeLeft.minutes} label="분" />
                  <Separator />
                  <TimeUnit value={timeLeft.seconds} label="초" />
                </div>
              )}
            </div>

            {/* CTA */}
            <Link
              href="/protected/events/seasonal"
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-charcoal-deep transition-all active:scale-95',
                'bg-gradient-to-r from-gold-500 to-[#F0C040] hover:from-[#E5C14A] hover:to-[#FFD452]',
                'shadow-sm'
              )}
            >
              절기 특별 운세 보기
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
