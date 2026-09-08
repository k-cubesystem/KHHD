'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { ADSENSE_CLIENT, isAdEligiblePath } from '@/lib/domain/ads/adsense'
import type { AdsByGoogleQueue } from '@/components/ads/adsense-slot'

/**
 * 애드센스 로더 — 🔴 반드시 lazyOnload(하이드레이션 끝난 뒤).
 *
 * 2026-08-30 사고: <head> 의 async 스크립트가 하이드레이션 «도중» <body> 에 <ins> 를 꽂아
 * React #418 → 스트리밍 본문 미커밋 → 상점 «불러오는 중...» 갇힘 + 결제 버튼 전멸.
 * window.load 이후에 로더를 실행하면 광고가 하이드레이션과 경주하지 않는다.
 * 사이트 확인은 이미 통과했으므로 초기 HTML 요건은 없다 — head 서버 렌더 <script> 로 되돌리면 재발.
 *
 * 경로 게이팅(2026-09-02): 로그인·결제·신당처럼 «읽을 것이 없는 화면»에서는 스크립트를 싣지 않고,
 * 클라이언트 전환으로 그런 화면에 들어오면 `pauseAdRequests` 로 새 광고 요청을 멈춘다
 * (애드센스가 문서화한 스위치 — 로더보다 먼저 세워 두면 첫 요청부터 막힌다).
 */
export function AdsenseLoader() {
  const pathname = usePathname()
  const eligible = isAdEligiblePath(pathname)

  useEffect(() => {
    const queue: AdsByGoogleQueue = window.adsbygoogle ?? []
    window.adsbygoogle = queue
    queue.pauseAdRequests = eligible ? 0 : 1
  }, [eligible])

  if (!eligible) return null

  return (
    <Script
      id="adsbygoogle-loader"
      strategy="lazyOnload"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  )
}
