'use client'

import { Archive, BookOpen, Layers, type LucideIcon } from 'lucide-react'
import { ReviewMarquee } from './review-marquee'

interface TrustFact {
  icon: LucideIcon
  label: string
}

/**
 * 검증 가능한 사실만 싣는다. 근거:
 * - 만세력 명식: lib/domain/saju/manse.ts (골든 테스트 보유, 해석 아닌 계산)
 * - 5개 분석 영역: app/protected/analysis/*
 * - 리포트 보관·재열람: app/protected/history
 * 실데이터로 뒷받침되지 않는 인원수·집계 별점 등 수치 표현은 넣지 않는다(표시·광고법).
 */
const TRUST_FACTS: readonly TrustFact[] = [
  { icon: BookOpen, label: '만세력으로 세운 명식' },
  { icon: Layers, label: '사주·궁합·관상·손금·풍수' },
  { icon: Archive, label: '리포트는 계정에 저장·재열람' },
]

/**
 * 랜딩 소셜 프루프 섹션 — 헤더(예시 고지) → 예시 후기 마퀴 → 확인 가능한 사실.
 * app/page.tsx 는 이 컴포넌트 하나만 렌더하면 된다(자체 <section> 포함).
 */
export function SocialProof() {
  return (
    <section aria-labelledby="social-proof-heading" className="w-full overflow-hidden py-10">
      <header className="mx-auto max-w-[420px] px-4 text-center">
        <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">이럴 때 찾습니다</p>
        <h2 id="social-proof-heading" className="mt-1.5 font-serif text-lg text-ink-primary">
          해화당이 다루는 순간들
        </h2>
        <p className="mt-2.5 break-keep font-sans text-[12px] leading-[1.65] text-ink-light/70">
          ※ 아래 후기는 서비스 이해를 돕기 위해 구성한 예시이며, 실제 이용자가 작성한 후기가 아닙니다.
        </p>
      </header>

      <div className="mt-6">
        <ReviewMarquee />
      </div>

      <div className="mx-auto mt-7 max-w-[420px] px-4">
        <p className="text-center font-sans text-[11px] tracking-[0.18em] text-gold-500/80">확인할 수 있는 사실</p>
        <ul className="m-0 mt-2.5 flex list-none flex-wrap justify-center gap-1.5 p-0">
          {TRUST_FACTS.map((fact) => (
            <li
              key={fact.label}
              className="flex items-center gap-1.5 rounded-full border border-gold-500/25 bg-gold-500/[0.07] px-3 py-1.5"
            >
              <fact.icon aria-hidden className="h-3 w-3 shrink-0 text-gold-300" strokeWidth={1.5} />
              <span className="font-sans text-[11.5px] leading-none text-ink-light/80">{fact.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
