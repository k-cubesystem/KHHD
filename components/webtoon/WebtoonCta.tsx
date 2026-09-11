'use client'

import Link from 'next/link'
import { collectEvent, collectFunnel } from '@/lib/analytics/collector'
import { WEBTOON_FUNNEL } from '@/lib/analytics/funnel'

/**
 * 회차 말미 서비스 다리 — 조판 이미지 속 CTA는 눌리지 않으므로, 실제로 눌리는 건 이 버튼이다.
 * utm 은 href 에 이미 실려 온다(회차별 캠페인) — 여기서는 클릭 사실만 센다.
 */
export function WebtoonCta({ no, href, label, sub }: { no: number; href: string; label: string; sub?: string }) {
  return (
    <Link
      href={href}
      onClick={() => {
        collectFunnel('webtoon_cta_click', WEBTOON_FUNNEL.webtoon_cta_click, { no })
        collectEvent('webtoon_cta_click', 'webtoon', `ep${no}`)
      }}
      className="block rounded-2xl border border-gold-500/40 bg-gold-500/[0.1] px-5 py-4 text-center"
    >
      <span className="font-serif text-[15px] font-bold text-gold-200">{label}</span>
      {sub && <span className="mt-1 block font-sans text-[11.5px] text-ink-primary/50">{sub}</span>}
    </Link>
  )
}
