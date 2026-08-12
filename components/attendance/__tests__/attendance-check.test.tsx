/**
 * 출석 달력의 '오늘'이 서버(KST 멱등)와 같은 날을 가리키는지, 그리고 자정을 넘긴 세션에서
 * 그 표시가 따라 넘어가는지를 못 박는다.
 *
 * 이전 구현은 렌더 최상단 `const today = new Date()` + `toISOString()` 이라
 *  - KST 00:00~09:00 사이에는 UTC 기준 '어제' 칸에 오늘 표시가 붙었고(서버 기록과 하루 어긋남)
 *  - 자정을 넘겨도 갱신되지 않았다.
 */
import { act, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AttendanceCheck } from '@/components/attendance/attendance-check'

jest.mock('@/app/actions/payment/attendance', () => ({
  checkInAttendance: jest.fn(),
}))

jest.mock('@/components/shrine/scene/useShrineAudio', () => ({
  useShrineAudio: () => ({ play: jest.fn() }),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

// use-wallet 은 서버액션(next/cache)을 끌고 온다 — 여기선 쿼리 키만 필요하다
jest.mock('@/hooks/use-wallet', () => ({
  WALLET_BALANCE_KEY: ['wallet', 'balance'],
}))

/** KST 시각을 절대시각으로 (KST = UTC+9) */
const kst = (iso: string) => new Date(`${iso}+09:00`)

function renderCard(checkedDates: string[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AttendanceCheck canCheckIn checkedDates={checkedDates} weekCount={0} totalBokchae={0} />
    </QueryClientProvider>
  )
}

/** aria-label 에 '오늘'이 붙은 칸의 라벨 */
const todayCellLabel = () =>
  screen
    .getAllByRole('gridcell')
    .map((cell) => cell.getAttribute('aria-label'))
    .find((label) => label?.includes('오늘'))

const monthLabel = () => screen.getByText(/^\d{4}년 \d{1,2}월$/).textContent

const navButton = (label: string) => screen.getByLabelText(label) as HTMLButtonElement

describe('AttendanceCheck — 오늘 판정', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('KST 새벽(UTC 로는 아직 어제)에도 KST 기준 오늘 칸에 표시한다', () => {
    jest.setSystemTime(kst('2026-08-12T00:30:00')) // = 2026-08-11 15:30 UTC
    renderCard()
    expect(todayCellLabel()).toBe('8월 12일 오늘')
  })

  it('자정을 넘기면 열어둔 화면의 오늘 칸이 다음 날로 옮겨간다', () => {
    jest.setSystemTime(kst('2026-08-11T23:59:30'))
    renderCard()
    expect(todayCellLabel()).toBe('8월 11일 오늘')

    act(() => {
      jest.advanceTimersByTime(31_000)
    })

    expect(todayCellLabel()).toBe('8월 12일 오늘')
  })

  it('달이 바뀌는 자정에는 보고 있는 달까지 따라 넘어간다', () => {
    jest.setSystemTime(kst('2026-08-31T23:59:30'))
    renderCard()
    expect(monthLabel()).toBe('2026년 8월')

    act(() => {
      jest.advanceTimersByTime(31_000)
    })

    expect(monthLabel()).toBe('2026년 9월')
    expect(todayCellLabel()).toBe('9월 1일 오늘')
  })

  it('서버가 준 KST 날짜와 같은 칸에 출석 완료가 찍힌다', () => {
    jest.setSystemTime(kst('2026-08-12T00:30:00'))
    renderCard(['2026-08-12'])
    expect(todayCellLabel()).toBe('8월 12일 출석 완료 오늘')
  })

  it('이번 달보다 앞은 못 가고, 3개월 뒤로까지만 간다', () => {
    jest.setSystemTime(kst('2026-08-12T10:00:00'))
    renderCard()

    expect(navButton('다음 달').disabled).toBe(true)
    const prev = navButton('이전 달')

    act(() => {
      prev.click()
      prev.click()
    })
    expect(monthLabel()).toBe('2026년 6월')
    expect(navButton('이전 달').disabled).toBe(false)
    expect(navButton('다음 달').disabled).toBe(false)

    act(() => {
      prev.click()
    })
    expect(monthLabel()).toBe('2026년 5월')
    expect(navButton('이전 달').disabled).toBe(true)
  })
})
