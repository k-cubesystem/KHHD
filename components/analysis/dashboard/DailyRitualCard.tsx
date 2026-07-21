'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck, Sun, Sparkles, Check } from 'lucide-react'
import { getDailyRitualStatus, type DailyRitualStatus } from '@/app/actions/fortune/daily-ritual'

/**
 * 「오늘의 정성」 — 데일리 루프 허브(F-6).
 * 대시보드 최상단(사주 유도 카드 아래)에 출석·오늘의 운세·신탁 3칩을 모아
 * 오늘 안 한 것은 강조(붉은 점), 다 한 것은 회색 체크로 "오늘 다 했다" 만족감을 준다.
 */
export function DailyRitualCard() {
  const router = useRouter()
  const [status, setStatus] = useState<DailyRitualStatus | null>(null)

  useEffect(() => {
    getDailyRitualStatus().then(setStatus)
  }, [])

  const ready = status !== null
  const oracleWaiting = (status?.unseenOracleCount ?? 0) > 0

  const chips = [
    {
      key: 'attendance',
      label: '출석 도장',
      icon: CalendarCheck,
      href: '/protected/profile',
      done: status?.attendanceDone ?? false,
      todo: '오늘 찍기',
    },
    {
      key: 'fortune',
      label: '오늘의 운세',
      icon: Sun,
      href: '/protected/analysis/today',
      done: status?.fortuneViewed ?? false,
      todo: '보러 가기',
    },
    {
      key: 'oracle',
      label: '신탁',
      icon: Sparkles,
      href: '/protected/shrine',
      done: !oracleWaiting,
      todo: '신탁이 와 있어요',
    },
  ]

  return (
    <div className="rounded-2xl border border-gold-500/15 bg-gold-500/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-gold-500/60">오늘의 정성</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {chips.map((c) => {
          const Icon = c.icon
          const active = ready && !c.done
          return (
            <button
              key={c.key}
              onClick={() => router.push(c.href)}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all active:scale-[0.97] ${
                active
                  ? 'border-gold-500/30 bg-gold-500/[0.06] hover:border-gold-500/50'
                  : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              {active && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-seal shadow-[0_0_6px_rgba(158,43,43,0.8)]" />
              )}
              <div
                className={`grid h-8 w-8 place-items-center rounded-full ${active ? 'bg-gold-500/15' : 'bg-white/5'}`}
              >
                {ready && c.done ? (
                  <Check className="h-4 w-4 text-ink-light/40" />
                ) : (
                  <Icon className={`h-4 w-4 ${active ? 'text-gold-500' : 'text-ink-light/40'}`} />
                )}
              </div>
              <span className={`text-[11px] font-medium ${active ? 'text-ink-light' : 'text-ink-light/45'}`}>
                {c.label}
              </span>
              <span className={`text-[9px] ${active ? 'text-gold-500/70' : 'text-ink-light/25'}`}>
                {ready ? (c.done ? '완료' : c.todo) : '·'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
