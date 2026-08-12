/**
 * 사주·궁합 허브(/protected/analysis) 하단의 「오늘의 운세」는 «버튼»이지 «자동 생성»이 아니다.
 *
 * 종전 구현은 마운트 useEffect 에서 generateDailyFortune() 을 불러, 허브에 들어오기만 해도
 * 하루 한 번 AI(Gemini) 실호출 + 복채 적립 + 기록 저장이 사용자 의사와 무관하게 일어났다.
 * 이 테스트는 그 자동 호출이 (정적이든 동적 import 든) 되살아나면 즉시 실패한다.
 */
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { DailyFortuneCard } from '@/components/analysis/daily-fortune-card'

const generateDailyFortune = jest.fn()
const checkAttendanceAvailability = jest.fn()

jest.mock('@/app/actions/fortune/daily', () => ({
  generateDailyFortune: (...args: unknown[]) => generateDailyFortune(...args),
}))

jest.mock('@/app/actions/payment/attendance', () => ({
  checkAttendanceAvailability: (...args: unknown[]) => checkAttendanceAvailability(...args),
}))

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => ({ daily: '오늘의 운세', viewDetail: '자세히 보기' })[key] ?? key,
}))

const push = jest.fn()

/** 마운트 직후의 마이크로/매크로 태스크까지 흘려보낸다 — 동적 import 호출도 잡기 위해. */
async function flushEffects() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('DailyFortuneCard — 허브의 오늘의 운세 진입 버튼', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push, replace: jest.fn(), refresh: jest.fn() })
  })

  it('화면에 뜨는 것만으로는 운세를 생성하지 않는다 (AI 자동 호출 없음)', async () => {
    render(<DailyFortuneCard userName="해화" />)
    await flushEffects()

    expect(generateDailyFortune).not.toHaveBeenCalled()
    expect(checkAttendanceAvailability).not.toHaveBeenCalled()
  })

  it('「오늘의 운세」 버튼 하나로 보인다', () => {
    render(<DailyFortuneCard userName="해화" />)

    // getByRole/getByText 는 없으면 던진다 — 존재 자체가 단언이다.
    const button = screen.getByRole('button', { name: /오늘의 운세/ })
    expect(button.tagName).toBe('BUTTON')
    expect(screen.getByText('해화님의 오늘').textContent).toBe('해화님의 오늘')
  })

  it('누르면 오늘의 운세 전용 화면으로 간다 — 그 자리에서 생성하지 않는다', async () => {
    render(<DailyFortuneCard userName="해화" />)

    await userEvent.click(screen.getByRole('button', { name: /오늘의 운세/ }))

    expect(push).toHaveBeenCalledWith('/protected/analysis/today')
    expect(generateDailyFortune).not.toHaveBeenCalled()
  })
})
