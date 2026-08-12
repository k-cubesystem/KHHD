'use client'

import { useRouter } from 'next/navigation'
import { Flame, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface DailyFortuneCardProps {
  userName: string
}

/**
 * 「오늘의 운세」 진입 버튼 — 사주·궁합 허브(/protected/analysis) 하단.
 *
 * 종전에는 허브에 들어오기만 하면 useEffect 가 generateDailyFortune() 을 불러
 * 보지도 않은 운세를 AI(Gemini)로 미리 생성했다. 하루 첫 방문마다 실호출 1회 +
 * 복채 10점 적립 + 기록 저장이 사용자 의사와 무관하게 일어났고, 「오늘의 정성」
 * 칩은 읽지도 않은 운세를 늘 '완료'로 표시했다.
 * CEO 지시(2026-08-12)에 따라 자동 생성을 걷어내고, 눌러야 열리는 버튼만 남긴다.
 * 생성은 전용 화면(/protected/analysis/today)에서만 일어난다 — 무료 기능이므로 과금 경로는 없다.
 */
export function DailyFortuneCard({ userName }: DailyFortuneCardProps) {
  const t = useTranslations('fortune')
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push('/protected/analysis/today')}
      aria-label={`${t('daily')} ${t('viewDetail')}`}
      className="group relative w-full min-h-[56px] overflow-hidden rounded-xl border border-gold-500/20 bg-gradient-to-br from-gold-500/10 via-surface/50 to-surface/80 p-4 text-left backdrop-blur-sm transition-colors duration-medium hover:border-gold-500/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
    >
      <span className="relative z-10 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-500/20">
          <Flame className="h-5 w-5 text-gold-500" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-sans text-[11px] text-gold-500/70">{userName}님의 오늘</span>
          <span className="block font-serif text-[15px] text-ink-light">{t('daily')}</span>
        </span>

        <ChevronRight className="h-4 w-4 shrink-0 text-gold-500/60 transition-transform duration-short group-hover:translate-x-0.5" />
      </span>

      {/* 장식 글로우 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full bg-gold-500/5 blur-2xl"
      />
    </button>
  )
}
