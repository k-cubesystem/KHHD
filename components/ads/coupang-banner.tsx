'use client'

import { useEffect, useRef, useState } from 'react'
import { ShoppingBag, ChevronRight } from 'lucide-react'
import { getCoupangBannerUrl } from '@/app/actions/ads/coupang-banner'
import { AD_DISCLOSURE_COUPANG } from '@/lib/domain/ads/rewarded'
import { GA } from '@/lib/analytics/ga4'

/**
 * 허브 하단 쿠팡 제휴 배너 — 「보고 가기만」 하는 광고다.
 *
 * 🔴 **보상 금지**: 속풀이의 「광고 보고 향 올리기」와 다른 물건이다. 여기에 보상을 걸면
 *    일일 상한·체류 판정·멱등을 우회하는 두 번째 지급 경로가 생긴다. 보상이 필요하면
 *    `app/actions/ads/coupang.ts` 경로를 쓸 것.
 * 🔴 **대가성 고지 필수**: 쿠팡 파트너스는 수수료 고지를 의무화한다. 문구는
 *    `AD_DISCLOSURE_COUPANG` 단일 출처를 그대로 쓰고, 화면에서 지우지 말 것.
 *
 * 링크가 없으면(설정 미등록) 아무것도 그리지 않는다 — 빈 상자를 화면에 남기지 않는다.
 * 자가 조회 패턴(`JourneyCard`·`WallpaperCard` 계보) — 상위가 서버 액션을 import 하지 않는다.
 */
export function CoupangBanner() {
  const [url, setUrl] = useState<string | null>(null)
  const viewed = useRef(false)

  useEffect(() => {
    let active = true
    getCoupangBannerUrl().then((next) => {
      if (!active || !next) return
      setUrl(next)
      if (!viewed.current) {
        viewed.current = true
        GA.coupangBannerView()
      }
    })
    return () => {
      active = false
    }
  }, [])

  if (!url) return null

  return <CoupangBannerView url={url} onClick={() => GA.coupangBannerClick()} />
}

/**
 * 표현부 — 링크를 «받아서» 그리기만 한다(조회 없음).
 * export 한 이유: `/dev-preview` 가 로그인·DB 없이 목 URL 로 이 배너를 세워 찍는다.
 * 🔴 조회는 `CoupangBanner` 만 진다 — 이걸 화면에서 직접 쓰지 말 것.
 */
export function CoupangBannerView({ url, onClick }: { url: string; onClick?: () => void }) {
  return (
    <div className="space-y-1.5">
      <a
        href={url}
        target="_blank"
        // 🔴 제휴 링크는 rel 에 sponsored 를 반드시 — 검색엔진·정책 양쪽 요구다.
        rel="noopener noreferrer sponsored"
        onClick={onClick}
        className="hanji-card group relative flex items-center gap-3 overflow-hidden rounded-xl border border-gold-500/20 p-4 transition-colors hover:border-gold-500/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent"
        />
        <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/25 bg-gold-500/10">
          <ShoppingBag className="h-5 w-5 text-gold-500" strokeWidth={1.5} />
        </span>
        <span className="relative z-10 min-w-0 flex-1">
          <span className="block font-serif text-body-sm font-bold text-ink-light">오늘의 쿠팡 특가</span>
          <span className="mt-0.5 block text-[11px] font-light leading-tight text-ink-light/50">
            살림에 보탬이 되는 물건들을 모아 두었습니다
          </span>
        </span>
        <ChevronRight className="relative z-10 h-4 w-4 shrink-0 text-gold-500/50 transition-transform group-hover:translate-x-0.5" />
      </a>

      {/* 대가성 고지 — 단일 출처. 지우지 말 것(쿠팡 파트너스 의무). */}
      <p className="px-1 text-[10px] leading-relaxed text-ink-light/30">{AD_DISCLOSURE_COUPANG}</p>
    </div>
  )
}
