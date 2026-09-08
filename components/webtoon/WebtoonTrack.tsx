'use client'

import { useEffect, useRef } from 'react'
import { collectEvent, collectFunnel } from '@/lib/analytics/collector'
import { WEBTOON_FUNNEL } from '@/lib/analytics/funnel'

/**
 * 웹툰 계측 비콘 — 본문 «맨 끝»에 눕혀 두는 보이지 않는 한 줄.
 *
 * · view: 마운트 즉시 1회 (회차 진입 — 본문이 그려졌다는 뜻)
 * · complete: 이 비콘이 화면에 «보이면» 1회 (말미 도달 = 완독)
 * · lock: 잠금 카드가 그려졌을 때 1회 (kind="lock" 로 대신 쓴다)
 *
 * ⚠️ 수집은 전부 fire-and-forget — 실패해도 화면과 무관(collector 규약).
 */
export function WebtoonTrack({ no, kind = 'view-complete' }: { no: number; kind?: 'view-complete' | 'lock' }) {
  const ref = useRef<HTMLDivElement>(null)
  const done = useRef(false)

  useEffect(() => {
    if (kind === 'lock') {
      collectEvent('webtoon_lock_view', 'webtoon', `ep${no}`)
      return
    }
    collectFunnel('webtoon_view', WEBTOON_FUNNEL.webtoon_view, { no })
    collectEvent('webtoon_episode_view', 'webtoon', `ep${no}`)

    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (done.current) return
        if (entries.some((e) => e.isIntersecting)) {
          done.current = true
          collectFunnel('webtoon_complete', WEBTOON_FUNNEL.webtoon_complete, { no })
          collectEvent('webtoon_episode_complete', 'webtoon', `ep${no}`)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px 200px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [no, kind])

  return <div ref={ref} aria-hidden className="h-px w-full" />
}
