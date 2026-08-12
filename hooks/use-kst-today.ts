'use client'

import { useSyncExternalStore } from 'react'
import { formatKstDate } from '@/lib/utils'

const DAY_MS = 24 * 60 * 60 * 1000
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * 다음 KST 자정까지 남은 ms. 최소 1초를 보장한다(0ms 타이머 재귀 폭주 방지).
 * 순수 함수 — 테스트에서 직접 검증한다.
 */
export function msUntilNextKstMidnight(now: number = Date.now()): number {
  const kstNow = now + KST_OFFSET_MS
  const sinceMidnight = ((kstNow % DAY_MS) + DAY_MS) % DAY_MS
  return Math.max(DAY_MS - sinceMidnight, 1000)
}

/** "YYYY-MM-DD" → 달력 계산용 조각. monthIndex 는 Date 와 같은 0-based. */
export function parseKstDateString(date: string): { year: number; monthIndex: number; day: number } {
  const [year, month, day] = date.split('-').map(Number)
  return { year, monthIndex: month - 1, day }
}

/**
 * KST 날짜 문자열을 '로컬 달력 날짜가 동일한' Date 로 바꾼다.
 * getMonth()/getDate() 로 월·일을 읽는 기존 API(절기 판정 등)에 KST 기준을 넘길 때 쓴다.
 */
export function kstDateToLocalDate(date: string): Date {
  const { year, monthIndex, day } = parseKstDateString(date)
  return new Date(year, monthIndex, day)
}

/* ─────────────────────────────────────────
   자정에 스스로 갱신되는 '오늘(KST)' 스토어
───────────────────────────────────────── */
const listeners = new Set<() => void>()
let snapshot: string | null = null
let timerId: ReturnType<typeof setTimeout> | null = null

function getSnapshot(): string {
  // 캐시가 있어야 getSnapshot 이 호출마다 같은 값을 돌려준다(useSyncExternalStore 계약).
  if (snapshot === null) snapshot = formatKstDate(Date.now())
  return snapshot
}

/**
 * 서버에서는 모듈 캐시를 쓰지 않는다 — 프로세스가 살아 있는 동안 날짜가 굳어버린다.
 * KST 는 고정 오프셋이라 서버 렌더 시점과 하이드레이션 시점의 값이 (자정 순간을 빼면) 같다.
 */
function getServerSnapshot(): string {
  return formatKstDate(Date.now())
}

function revalidate(): void {
  const next = formatKstDate(Date.now())
  if (next === snapshot) return
  snapshot = next
  for (const listener of listeners) listener()
}

function schedule(): void {
  if (timerId !== null) clearTimeout(timerId)
  timerId = setTimeout(() => {
    timerId = null
    revalidate()
    schedule()
  }, msUntilNextKstMidnight())
}

/** 백그라운드 탭·잠긴 화면에서는 타이머가 지연되거나 멈춘다 — 복귀 시점에 반드시 재검사한다. */
function handleWake(): void {
  revalidate()
  schedule()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (listeners.size === 1) {
    schedule()
    document.addEventListener('visibilitychange', handleWake)
    window.addEventListener('focus', handleWake)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size > 0) return
    if (timerId !== null) {
      clearTimeout(timerId)
      timerId = null
    }
    document.removeEventListener('visibilitychange', handleWake)
    window.removeEventListener('focus', handleWake)
    // 구독자가 없으면 캐시를 버린다 — 다음 마운트가 어제 날짜를 물려받지 않도록.
    snapshot = null
  }
}

/**
 * KST(UTC+9) 기준 오늘 날짜 "YYYY-MM-DD".
 *
 * 렌더 최상단의 `new Date()` 를 대체한다. 그 관용구는 (1) 렌더마다 새 참조라 useMemo 의존성을 깨고
 * (2) 자정을 넘겨 열어둔 세션에서 날짜가 갱신되지 않으며 (3) toISOString() 을 쓰면 UTC 날짜가 나와
 * 00:00~09:00 KST 사이에는 서버(KST 멱등) 판정과 하루 어긋난다.
 *
 * 이 값은 **표시·활성화 판정용**이다. 출석 성립 여부는 서버가 KST 로 판정한다.
 */
export function useKstToday(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
