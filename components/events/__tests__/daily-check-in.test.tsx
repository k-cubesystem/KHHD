/**
 * 출석 달력의 '오늘'이 서버(KST 멱등)와 같은 날을 가리키는지, 자정을 넘긴 세션에서 따라 넘어가는지,
 * 그리고 출석이 재화가 아니라 신당 정성으로 안내되는지를 못 박는다.
 *
 * 예전 구현은 렌더 최상단 `new Date()` + `toISOString()` 이라 KST 00:00~09:00 사이에 UTC 기준
 * '어제' 칸에 오늘 표시가 붙었고(서버 기록과 하루 어긋남), 자정을 넘겨도 갱신되지 않았다.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { DailyCheckIn } from '@/components/events/daily-check-in'
import { recordDailyAttendance } from '@/app/actions/payment/attendance'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'

jest.mock('@/app/actions/payment/attendance', () => ({
  recordDailyAttendance: jest.fn(),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const mockRecord = recordDailyAttendance as jest.MockedFunction<typeof recordDailyAttendance>

/** KST 시각을 절대시각으로 (KST = UTC+9) */
const kst = (iso: string) => new Date(`${iso}+09:00`)

function renderOpen(checkedDates: string[] = [], canCheckIn = true) {
  const view = render(<DailyCheckIn canCheckIn={canCheckIn} checkedDates={checkedDates} />)
  fireEvent.click(screen.getByLabelText('일일 출석 체크 열기'))
  return view
}

const todayCellLabel = () =>
  screen
    .getAllByRole('gridcell')
    .map((cell) => cell.getAttribute('aria-label'))
    .find((label) => label?.includes('오늘'))

const monthLabel = () => screen.getByText(/^\d{4}년 \d{1,2}월$/).textContent

const navButton = (label: string) => screen.getByLabelText(label) as HTMLButtonElement

describe('DailyCheckIn — 오늘 판정', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('KST 새벽(UTC 로는 아직 어제)에도 KST 기준 오늘 칸에 표시한다', () => {
    jest.setSystemTime(kst('2026-08-12T00:30:00'))
    renderOpen()
    expect(todayCellLabel()).toBe('8월 12일 오늘')
  })

  it('자정을 넘기면 열어둔 화면의 오늘 칸이 다음 날로 옮겨간다', () => {
    jest.setSystemTime(kst('2026-08-11T23:59:30'))
    renderOpen()
    expect(todayCellLabel()).toBe('8월 11일 오늘')

    act(() => {
      jest.advanceTimersByTime(31_000)
    })

    expect(todayCellLabel()).toBe('8월 12일 오늘')
  })

  it('달이 바뀌는 자정에는 보고 있는 달까지 따라 넘어간다', () => {
    jest.setSystemTime(kst('2026-08-31T23:59:30'))
    renderOpen()
    expect(monthLabel()).toBe('2026년 8월')

    act(() => {
      jest.advanceTimersByTime(31_000)
    })

    expect(monthLabel()).toBe('2026년 9월')
    expect(todayCellLabel()).toBe('9월 1일 오늘')
  })

  it('서버가 준 KST 날짜와 같은 칸에 출석 완료가 찍힌다', () => {
    jest.setSystemTime(kst('2026-08-12T00:30:00'))
    renderOpen(['2026-08-12'], false)
    expect(todayCellLabel()).toBe('8월 12일 출석 완료 오늘')
  })

  it('이번 달보다 앞은 못 가고, 3개월 뒤로까지만 간다', () => {
    jest.setSystemTime(kst('2026-08-12T10:00:00'))
    renderOpen()

    expect(navButton('다음 달').disabled).toBe(true)

    act(() => {
      navButton('이전 달').click()
      navButton('이전 달').click()
    })
    expect(monthLabel()).toBe('2026년 6월')
    expect(navButton('이전 달').disabled).toBe(false)
    expect(navButton('다음 달').disabled).toBe(false)

    act(() => {
      navButton('이전 달').click()
    })
    expect(monthLabel()).toBe('2026년 5월')
    expect(navButton('이전 달').disabled).toBe(true)
  })
})

describe('DailyCheckIn — 보상은 신당 정성이다', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('화면 문구에 재화 금지어가 없다', () => {
    renderOpen()
    expect(findBannedPassTerms(document.body.textContent ?? '')).toEqual([])
    expect(document.body.textContent).not.toMatch(/\d+\s*냥/)
  })

  it('출석하면 정성이 쌓였다고 알리고 오늘 칸을 채운다', async () => {
    mockRecord.mockResolvedValue({ success: true, devotionGained: true, devotionTotalDays: 12 })
    renderOpen()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /오늘 출석 체크하기/ }))
    })

    expect(mockRecord).toHaveBeenCalledTimes(1)
    const message = (toast.success as jest.Mock).mock.calls[0][0] as string
    expect(message).toContain('정성')
    expect(message).toContain('12일')
    expect(findBannedPassTerms(message)).toEqual([])
    expect(screen.getByRole('button', { name: /오늘 출석 완료/ })).toBeDisabled()
  })

  it('오늘 이미 기도로 정성을 올렸으면 «+1일»을 약속하지 않는다', async () => {
    mockRecord.mockResolvedValue({ success: true, devotionGained: false, devotionTotalDays: 12 })
    renderOpen()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /오늘 출석 체크하기/ }))
    })

    const message = (toast.success as jest.Mock).mock.calls[0][0] as string
    expect(message).toContain('이미')
    expect(message).not.toContain('쌓였어요')
  })

  it('정성 적립이 실패하면(누적 0) 출석만 알린다', async () => {
    mockRecord.mockResolvedValue({ success: true, devotionGained: false, devotionTotalDays: 0 })
    renderOpen()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /오늘 출석 체크하기/ }))
    })

    expect(toast.success).toHaveBeenCalledWith('출석했어요.', expect.anything())
  })

  it('이미 출석한 날이면 오류를 알리고 버튼을 닫는다', async () => {
    mockRecord.mockResolvedValue({ success: false, alreadyChecked: true, error: '오늘은 이미 출석했어요.' })
    renderOpen()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /오늘 출석 체크하기/ }))
    })

    expect(toast.error).toHaveBeenCalledWith('오늘은 이미 출석했어요.')
    expect(screen.getByRole('button', { name: /오늘 출석 완료/ })).toBeDisabled()
  })

  it('요청이 끊기면 오류를 알리고 다시 누를 수 있게 둔다', async () => {
    mockRecord.mockRejectedValue(new Error('network'))
    renderOpen()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /오늘 출석 체크하기/ }))
    })

    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /오늘 출석 체크하기/ })).toBeEnabled()
  })
})
