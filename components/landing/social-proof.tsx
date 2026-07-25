'use client'

import { Star } from 'lucide-react'
import { LiveMemberCounter } from './live-member-counter'
import { REVIEW_AVERAGE, ReviewMarquee } from './review-marquee'

/**
 * 랜딩 소셜 프루프 섹션 — 헤더(맥락) → 후기 마퀴 → 실시간 회원 수 한 줄.
 * app/page.tsx 는 이 컴포넌트 하나만 렌더하면 된다(자체 <section> 포함).
 */
export function SocialProof() {
  return (
    <section aria-labelledby="social-proof-heading" className="w-full overflow-hidden py-10">
      <header className="mx-auto max-w-[420px] px-4 text-center">
        <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">먼저 다녀간 분들</p>
        <h2 id="social-proof-heading" className="mt-1.5 font-serif text-lg text-ink-primary">
          이미 운의 흐름을 읽고 계십니다
        </h2>
        <p className="mt-2 flex items-center justify-center gap-1.5 font-sans text-[12px] text-ink-primary/60">
          <Star aria-hidden className="h-3 w-3 fill-current text-gold-500" />
          <span>
            평균 별점 <span className="tabular-nums">{REVIEW_AVERAGE}</span> · 실제 이용자 후기
          </span>
        </p>
      </header>

      <div className="mt-6">
        <ReviewMarquee />
      </div>

      <LiveMemberCounter className="mt-5" />
    </section>
  )
}
