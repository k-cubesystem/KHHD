'use client'

import { useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Sparkles, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Solar, Lunar } from 'lunar-javascript'

interface FortuneCalendarProps {
  onDateSelect: (date: Date) => void
  selectedDate: Date
}

export function FortuneCalendar({ onDateSelect, selectedDate }: FortuneCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const startDay = getDay(startOfMonth(currentMonth)) // 0: Sun, 1: Mon...
  const emptyDays = Array(startDay).fill(null)

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  // Determine "Gil-il" (Lucky Day) mock logic or simple lunar logic
  const getDayStatus = (date: Date) => {
    // @ts-expect-error -- Solar library lacks TypeScript types
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
    const lunar = solar.getLunar()

    // Example: Lunar 1st and 15th are special
    const isMajor = lunar.getDay() === 1 || lunar.getDay() === 15
    // Example: Random lucky for demo, ideally from DB or real Manse logic
    const score = (date.getDate() * 7 + date.getMonth() * 3) % 100
    const isLucky = score > 80

    return { isMajor, isLucky, score }
  }

  return (
    <div className="bg-surface/20 border border-white/5 rounded-xl p-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5 text-ink-light/60" />
        </button>
        <h2 className="text-lg font-serif font-medium text-ink-light">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h2>
        <button onClick={nextMonth} className="p-1 hover:bg-white/5 rounded-full transition-colors">
          <ChevronRight className="w-5 h-5 text-ink-light/60" />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
          <div
            key={day}
            className={cn(
              'text-center text-xs font-light py-2',
              i === 0 ? 'text-red-400/70' : 'text-ink-light/40'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-2 gap-x-1">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {daysInMonth.map((date) => {
          const { isMajor, isLucky } = getDayStatus(date)
          const isSelected = isSameDay(date, selectedDate)
          const isToday = isSameDay(date, new Date())

          return (
            <motion.button
              key={date.toISOString()}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDateSelect(date)}
              className={cn(
                'relative text-sm h-10 w-full flex flex-col items-center justify-center rounded-lg transition-all',
                isSelected
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'hover:bg-white/5 text-ink-light/80',
                isToday && !isSelected && 'bg-white/5 border border-white/10'
              )}
            >
              <span className={cn('text-xs z-10', isLucky ? 'font-bold text-gold-500' : '')}>
                {format(date, 'd')}
              </span>

              {/* Lucky Day Indicator */}
              {isLucky && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute bottom-1"
                >
                  <Sparkles className="w-1.5 h-1.5 text-gold-500" />
                </motion.div>
              )}

              {/* Lunar 1/15 Indicator */}
              {isMajor && !isLucky && (
                <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-primary/40" />
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
