'use client'

import { useEffect, useRef } from 'react'
import { ADSENSE_CLIENT, ADSENSE_SLOTS, shouldRenderAds, type AdSlotName } from '@/lib/domain/ads/adsense'

/**
 * 애드센스 디스플레이 광고 한 자리.
 *
 * 🔴 **보상과 엮지 말 것** — 이 컴포넌트는 «보고만 가는» 광고다. 「광고 보고 배경화면 열기」·
 *    「광고 보고 향 올리기」 같은 보상 흐름에 붙이면 애드센스 정책 위반(계정 폐쇄 사유)이다.
 *    자세한 경계는 `lib/domain/ads/adsense.ts` 주석 참고.
 *
 * 슬롯 ID 가 비었거나 프로덕션이 아니면 **아무것도 그리지 않는다**(빈 회색 상자·무효 트래픽 방지).
 */

/**
 * `window.adsbygoogle` — 애드센스가 밀어 넣는 전역 큐. any 없이 좁혀 쓴다.
 * 🔴 전역 선언은 여기 한 곳뿐 — 다른 파일에서 다시 선언하면 TS2717(타입 불일치)로 빌드가 깨진다.
 *    `pauseAdRequests` 는 애드센스가 문서화한 스위치(1=새 광고 요청 중지) — 로더가 경로 게이팅에 쓴다.
 */
export interface AdsByGoogleQueue extends Array<Record<string, unknown>> {
  pauseAdRequests?: 0 | 1
}
declare global {
  interface Window {
    adsbygoogle?: AdsByGoogleQueue
  }
}

interface AdSenseSlotProps {
  slot: AdSlotName
  /** 광고 위아래 여백 등 바깥 여백만 — 광고 자체 크기는 애드센스가 정한다. */
  className?: string
}

export function AdSenseSlot({ slot, className }: AdSenseSlotProps) {
  const pushed = useRef(false)

  // 🔴 프리뷰 배포도 NODE_ENV=production 이라 VERCEL_ENV 로 갈라야 한다(무효 트래픽 방지).
  const enabled = shouldRenderAds(process.env.NEXT_PUBLIC_VERCEL_ENV, process.env.NODE_ENV, slot)

  useEffect(() => {
    if (!enabled || pushed.current) return
    // 스크립트가 아직 안 왔어도 큐에 넣어 두면 로드 후 소비된다(애드센스 표준 패턴).
    pushed.current = true
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    } catch {
      // 광고 실패가 화면을 깨서는 안 된다 — 조용히 넘어간다(빈 자리로 남음).
      pushed.current = false
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className={className}>
      {/* 로더 스크립트는 루트 레이아웃(app/layout.tsx)이 <head> 에서 이미 싣는다 —
          사이트 소유권 확인이 그 태그를 보고 통과하기 때문. 여기서 또 부르지 않는다. */}
      {/* 광고 표기 — 콘텐츠와 광고를 구분해 준다(정책·사용자 신뢰 양쪽) */}
      <p className="mb-1 text-center text-[10px] tracking-wider text-ink-light/30">광고</p>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOTS[slot]}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
