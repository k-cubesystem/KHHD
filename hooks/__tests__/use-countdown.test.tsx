/**
 * useCountdown 계약 — 「목표 시각이 안정적인 값이라 인터벌이 초기화되지 않는다」를 못 박는다.
 * 이전 구현은 Date 객체를 받아서, 호출부가 `endDate ?? new Date(0)` 처럼 렌더마다 새 객체를 넘기면
 * 이펙트가 매 렌더 재구독돼 카운트다운이 영영 안 도는 경로가 있었다.
 */
import { act, render, screen } from '@testing-library/react'
import { useCountdown, getCountdownParts } from '@/hooks/use-countdown'

function Probe({ targetTime, intervalMs }: { targetTime: number | null; intervalMs?: number }) {
  const parts = useCountdown(targetTime, intervalMs)
  return (
    <span data-testid="left">
      {parts === null ? 'none' : `${parts.days}:${parts.hours}:${parts.minutes}:${parts.seconds}`}
    </span>
  )
}

const read = () => screen.getByTestId('left').textContent

describe('getCountdownParts', () => {
  it('남은 시간을 일·시·분·초로 쪼갠다', () => {
    const now = Date.UTC(2026, 7, 11, 0, 0, 0)
    const target = now + ((2 * 24 + 3) * 60 * 60 + 4 * 60 + 5) * 1000
    expect(getCountdownParts(target, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 })
  })

  it('이미 지났으면 null', () => {
    const now = Date.UTC(2026, 7, 11)
    expect(getCountdownParts(now - 1, now)).toBeNull()
    expect(getCountdownParts(now, now)).toBeNull()
  })
})

describe('useCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-08-11T00:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('첫 렌더부터 남은 시간이 채워져 있다 — 한 틱 동안 비어 보이지 않는다', () => {
    render(<Probe targetTime={Date.now() + 90_000} />)
    expect(read()).toBe('0:0:1:30')
  })

  it('주기마다 줄어든다', () => {
    render(<Probe targetTime={Date.now() + 90_000} />)

    act(() => {
      jest.advanceTimersByTime(30_000)
    })

    expect(read()).toBe('0:0:1:0')
  })

  it('부모가 리렌더돼도 인터벌이 초기화되지 않는다', () => {
    const target = Date.now() + 90_000
    const { rerender } = render(<Probe targetTime={target} />)

    // 매 렌더 같은 number 를 넘기는 한 이펙트는 재구독되지 않는다
    act(() => {
      jest.advanceTimersByTime(500)
    })
    rerender(<Probe targetTime={target} />)
    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(read()).toBe('0:0:1:29')
  })

  it('목표 시각이 지나면 null 로 떨어진다', () => {
    render(<Probe targetTime={Date.now() + 2_000} />)

    act(() => {
      jest.advanceTimersByTime(3_000)
    })

    expect(read()).toBe('none')
  })

  it('null 목표는 멈춘 상태 — 뒤늦게 목표가 생기면 즉시 채워진다', () => {
    const { rerender } = render(<Probe targetTime={null} />)
    expect(read()).toBe('none')

    rerender(<Probe targetTime={Date.now() + 60_000} />)
    expect(read()).toBe('0:0:1:0')
  })

  it('갱신 주기를 늘리면 그 사이에는 리렌더하지 않는다', () => {
    render(<Probe targetTime={Date.now() + 7_200_000} intervalMs={60_000} />)
    expect(read()).toBe('0:2:0:0')

    act(() => {
      jest.advanceTimersByTime(30_000)
    })
    expect(read()).toBe('0:2:0:0') // 아직 첫 60초 틱 전

    act(() => {
      jest.advanceTimersByTime(30_000)
    })
    expect(read()).toBe('0:1:59:0')
  })
})
