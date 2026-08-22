'use client'

import { Download } from 'lucide-react'
import { GA } from '@/lib/analytics/ga4'

/**
 * 일간 카드 9:16 이미지 저장 — 인스타 스토리·릴스 유통 단위(P5 공유 출구).
 * 서버(og/saju-card)가 그린 이미지를 그대로 내려받는다 — 클라 캔버스 없음.
 */
export function SaveCardButton({ slug }: { slug: string }) {
  return (
    <a
      href={`/api/og/saju-card/${slug}`}
      download={`haehwadang-ilgan-${slug}.png`}
      onClick={() => GA.cardSave(slug)}
      className="tap-glow-gold mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-gold-500/35 bg-gold-500/10 font-serif text-[13.5px] text-gold-300 transition-colors hover:border-gold-500/55"
    >
      <Download className="h-4 w-4" strokeWidth={1.6} />
      카드 이미지로 저장 (스토리용 9:16)
    </a>
  )
}
