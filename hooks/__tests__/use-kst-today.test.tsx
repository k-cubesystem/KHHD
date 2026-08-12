/**
 * useKstToday 계약 — 「자정을 넘긴 세션에서 날짜가 갱신된다」를 못 박는다.
 *
 * 이 훅이 대체한 관용구(`const today = new Date()` 를 렌더 최상단에)는
 *  (1) 밤 11시 59분에 열어둔 화면이 자정을 넘겨도 계속 어제로 동작했고
 *  (2) toISOString() 을 쓰는 바람에 KST 00:00~09:00 사이에는 UTC 기준 '어제'가 나와
 *      서버(KST 멱등) 출석 판정과 하루 어긋났다.
 * 두 가지 모두 여기서 시간을 조작해 검증한다.
 */
import { act, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { useKstToday, msUntilNextKstMidnight, parseKstDateString, kstDateToLocalDate } from '@/hooks/use-kst-today'

function Probe() {
  return <span data-testid="today">{useKstToday()}</span>
}

const read = () => screen.getByTestId('today').textContent

/** KST 시각을 UTC 기준 절대시각으로 (KST = UTC+9) */
const kst = (iso: string) => new Date(`${iso}+09:00`)

describe('msUntilNextKstMidnight', () => {
  it('KST 자정까지 남은 ms 를 돌려준다', () => {
    expect(msUntilNextKstMidnight(kst('2026-08-11T23:59:30').getTime())).toBe(30_000)
    expect(msUntilNextKstMidnight(kst('2026-08-11T12:00:00').getTime())).toBe(12 * 60 * 60 * 1000)
  })

  it('자정 정각에도 0 을 돌려주지 않는다 — 0ms 타이머 재귀 폭주 방지', () => {
    expect(msUntilNextKstMidnight(kst('2026-08-12T00:00:00').getTime())).toBeGreaterThanOrEqual(1000)
  })
})

describe('parseKstDateString / kstDateToLocalDate', () => {
  it('"YYYY-MM-DD" 를 0-based monthIndex 로 쪼갠다', () => {
    expect(parseKstDateString('2026-08-12')).toEqual({ year: 2026, monthIndex: 7, day: 12 })
  })

  it('로컬 달력 날짜가 KST 날짜와 같은 Date 를 만든다 — getMonth()/getDate() 를 쓰는 기존 API 용', () => {
    const d = kstDateToLocalDate('2026-08-12')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(12)
  })
})

describe('useKstToday', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('KST 기준 오늘을 돌려준다 — UTC 로 아직 어제인 새벽에도 오늘이어야 한다', () => {
    // 2026-08-12 00:30 KST = 2026-08-11 15:30 UTC. UTC 기준으로는 아직 8/11 이다.
    jest.setSystemTime(kst('2026-08-12T00:30:00'))
    render(<Probe />)
    expect(read()).toBe('2026-08-12')
  })

  it('자정을 넘기면 열어둔 화면의 날짜가 갱신된다', () => {
    jest.setSystemTime(kst('2026-08-11T23:59:30'))
    render(<Probe />)
    expect(read()).toBe('2026-08-11')

    act(() => {
      jest.advanceTimersByTime(31_000) // KST 자정 통과
    })

    expect(read()).toBe('2026-08-12')
  })

  it('자정 전에는 갱신되지 않는다', () => {
    jest.setSystemTime(kst('2026-08-11T22:00:00'))
    render(<Probe />)

    act(() => {
      jest.advanceTimersByTime(60 * 60 * 1000) // 23:00 KST
    })

    expect(read()).toBe('2026-08-11')
  })

  it('탭 복귀 시 재검사한다 — 백그라운드에서 타이머가 정지·지연돼도 날짜가 밀리지 않는다', () => {
    jest.setSystemTime(kst('2026-08-11T23:00:00'))
    render(<Probe />)
    expect(read()).toBe('2026-08-11')

    // 타이머는 재우고(=발화시키지 않고) 시계만 다음 날로 옮긴다 — 잠긴 화면·백그라운드 탭 상황
    act(() => {
      jest.setSystemTime(kst('2026-08-12T09:00:00'))
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(read()).toBe('2026-08-12')
  })

  it('마운트가 끊겼다 다시 붙어도 어제 날짜를 물려받지 않는다', () => {
    jest.setSystemTime(kst('2026-08-11T23:00:00'))
    const first = render(<Probe />)
    expect(read()).toBe('2026-08-11')
    first.unmount()

    jest.setSystemTime(kst('2026-08-12T01:00:00'))
    render(<Probe />)
    expect(read()).toBe('2026-08-12')
  })

  it('서버 렌더도 같은 KST 날짜를 낸다 — 하이드레이션 마크업이 어긋나지 않는다', () => {
    jest.setSystemTime(kst('2026-08-12T00:30:00'))
    expect(renderToString(<Probe />)).toContain('2026-08-12')
  })
})
