/**
 * 결제 실패 화면 회귀선 (2026-08-18).
 *
 * 복채 충전과 멤버십이 **같은 컴포넌트**를 쓴다. 예전엔 각자 그려서 같은 상황(사용자 취소)을
 * 한쪽은 붉은 느낌표 + 「결제 실패」로, 다른 쪽은 X 아이콘 + 다른 문구로 보여줬다.
 * 화면이 보이지 않는 자리(로그인 뒤)라 눈으로 못 잡는다 — 그래서 테스트가 본다.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentFailureView } from '@/components/payment/payment-failure-view'

import { SUPPORT_LABEL } from '@/lib/domain/support/contact'
function renderView(code: string | null, message: string | null = null) {
  return render(
    <PaymentFailureView
      code={code}
      message={message}
      retryHref="/protected/store"
      retryLabel="다시 충전하기"
      exitHref="/protected/analysis"
      exitLabel="분석으로 돌아가기"
    />
  )
}

describe('🔴 사용자 취소 화면', () => {
  it('실패라고 부르지 않고, 결제되지 않았음을 알린다', () => {
    const { container } = renderView('PAY_PROCESS_CANCELED')

    expect(screen.getByText('결제를 그만두셨어요')).not.toBeNull()
    expect(container.textContent).toContain('아직 아무것도 결제되지 않았습니다')
    expect(container.textContent).not.toContain('결제 실패')
  })

  it('1:1 문의 안내를 띄우지 않는다', () => {
    const { container } = renderView('PAY_PROCESS_CANCELED')

    expect(container.textContent).not.toContain(SUPPORT_LABEL)
  })

  it('돌아갈 길 둘을 준다', () => {
    renderView('PAY_PROCESS_CANCELED')

    expect(screen.getByRole('link', { name: '다시 충전하기' }).getAttribute('href')).toBe('/protected/store')
    expect(screen.getByRole('link', { name: '분석으로 돌아가기' }).getAttribute('href')).toBe('/protected/analysis')
  })
})

describe('🔴 오류 코드는 접어 둔다', () => {
  it('처음에는 코드가 보이지 않는다', () => {
    renderView('PAY_PROCESS_CANCELED')

    expect(screen.queryByText('PAY_PROCESS_CANCELED')).toBeNull()
    expect(screen.getByRole('button', { name: /자세한 정보/ }).getAttribute('aria-expanded')).toBe('false')
  })

  it('펼치면 보인다 (문의할 때 필요하다)', async () => {
    const user = userEvent.setup()
    renderView('PAY_PROCESS_CANCELED')

    await user.click(screen.getByRole('button', { name: /자세한 정보/ }))

    expect(screen.getByText('PAY_PROCESS_CANCELED')).not.toBeNull()
  })

  it('코드가 없으면 펼치기 자체를 안 그린다', () => {
    renderView(null)

    expect(screen.queryByRole('button', { name: /자세한 정보/ })).toBeNull()
  })
})

describe('진짜 실패는 다르게 말한다', () => {
  it('설정 오류에는 재시도 버튼을 주지 않는다 (눌러도 소용없다)', () => {
    renderView('NOT_SUPPORTED_METHOD')

    expect(screen.queryByRole('link', { name: '다시 충전하기' })).toBeNull()
    expect(screen.getByRole('link', { name: '분석으로 돌아가기' })).not.toBeNull()
  })

  it('모르는 코드는 토스 문구를 그대로 보여준다', () => {
    renderView('SOME_UNKNOWN', '카드사 점검 중입니다.')

    expect(screen.getByText('카드사 점검 중입니다.')).not.toBeNull()
  })

  it('실패에는 1:1 문의를 안내한다', () => {
    const { container } = renderView('PAY_PROCESS_ABORTED')

    expect(container.textContent).toContain(SUPPORT_LABEL)
  })
})
