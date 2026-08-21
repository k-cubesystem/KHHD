'use client'

/**
 * 대시보드 초하루 D-day 배너 (설계 T4 — 진입 동선 1접점).
 * 창 판정의 정본은 서버(getRitualWindow — 서버 액션·크론)이며, 이 배너의 계산은
 * 「표시 목적」 클라 사용 — 실제 진입 시 페이지가 서버에서 재검증한다.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getRitualWindow, type RitualWindow } from '@/lib/domain/ritual/lunar-window'
import { isRitualEntryEnabled } from '@/app/actions/ritual/loop'

export function RitualBanner() {
  const [w, setW] = useState<RitualWindow | null>(null)
  useEffect(() => {
    let alive = true
    // ⚠️ 킬스위치가 꺼져 있으면 창 계산 결과와 무관하게 렌더하지 않는다.
    //    /protected/ritual 이 redirect 로 튕기므로, 이 확인이 없으면 눌러도 되돌아오는
    //    죽은 버튼이 된다(설계의 「죽은 버튼 금지」 원칙). 판정은 서버 한 곳에만 있다.
    void isRitualEntryEnabled().then((enabled) => {
      if (!alive || !enabled) return
      try {
        setW(getRitualWindow())
      } catch {
        setW(null)
      }
    })
    return () => {
      alive = false
    }
  }, [])
  if (!w) return null

  if (w.inWindow) {
    return (
      <Link
        href="/protected/ritual"
        className="hanji-card mx-4 mb-4 flex min-h-[56px] items-center justify-between rounded-xl border border-seal/40 px-4 py-3"
      >
        <span className="font-serif text-body font-bold text-ink-light">
          🏮 {w.monthLabel} — 식구들 문안이 도착했어요
        </span>
        <span className="bok-badge shrink-0 rounded-[3px] px-2 py-1 text-[11px] text-ink-light">의례 올리기</span>
      </Link>
    )
  }
  return (
    <Link
      href="/protected/ritual"
      className="mx-4 mb-4 flex min-h-[44px] items-center justify-between rounded-xl border border-gold-500/15 px-4 py-2.5 text-body-sm text-ink-primary/70"
    >
      <span>다음 초하루 문안까지</span>
      <span className="font-serif font-bold tabular-nums text-primary">D-{w.daysUntilNext}</span>
    </Link>
  )
}
