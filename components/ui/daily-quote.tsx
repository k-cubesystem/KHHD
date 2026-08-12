'use client'

import { useState } from 'react'
import { Quote } from 'lucide-react'
import { COMFORT_MESSAGES, WELCOME_GREETINGS } from '@/lib/constants/messages'
import { useHydrated } from '@/hooks/use-hydrated'
import { kstHour } from '@/lib/utils'

/** 마운트 시각(KST) 기준 인사말. 시각을 읽으므로 렌더 중 호출 금지 — lazy 초기화로만 쓴다. */
function pickGreeting(): string {
  const hour = kstHour()
  if (hour < 11) return WELCOME_GREETINGS.morning
  if (hour < 17) return WELCOME_GREETINGS.afternoon
  if (hour < 21) return WELCOME_GREETINGS.evening
  return WELCOME_GREETINGS.night
}

/** 인스턴스마다 다른 위로 문구. 모듈 캐시로 올리면 여러 개가 같은 문구를 띄운다. */
function pickQuote(): string {
  return COMFORT_MESSAGES[Math.floor(Math.random() * COMFORT_MESSAGES.length)]
}

export function DailyQuote() {
  // 시각·난수는 서버와 클라이언트가 다를 수밖에 없다 → 하이드레이션이 끝나고서 그린다.
  const hydrated = useHydrated()
  const [greeting] = useState(pickGreeting)
  const [quote] = useState(pickQuote)

  if (!hydrated) return null

  return (
    <div
      className="space-y-6 anim-fade-in-up"
      style={
        {
          '--fade-y': '10px',
          animation: 'fade-in-up 0.8s ease-out both',
        } as React.CSSProperties
      }
    >
      <div className="bg-white/60 p-6 rounded-sm border border-zen-border backdrop-blur-sm shadow-sm relative overflow-hidden group hover:border-zen-gold/30 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Quote className="w-12 h-12 text-zen-gold" />
        </div>

        <h3 className="text-xl font-serif font-bold text-zen-text mb-3">{greeting}</h3>

        <p className="text-sm font-sans text-zen-text/70 leading-relaxed italic border-l-2 border-zen-wood/30 pl-4 py-1">
          &quot;{quote}&quot;
        </p>
      </div>
    </div>
  )
}
