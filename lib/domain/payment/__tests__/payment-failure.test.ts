/**
 * 결제 실패 안내 회귀선 — **취소를 실패라고 부르지 않는다** (2026-08-18).
 *
 * 예전 화면은 사용자가 스스로 「취소」를 눌러도 붉은 경고 + 「결제 실패」 + 오류 코드를 띄웠다.
 * 자기가 그만둔 것을 실패라고 하면 잘못한 것 같고 뭔가 망가진 것 같다. 그 톤을 여기서 고정한다.
 */
import { describePaymentFailure, isUserCanceled } from '@/lib/domain/payment/payment-failure'

const CANCEL_CODES = ['PAY_PROCESS_CANCELED', 'USER_CANCEL']

describe('🔴 사용자 취소는 실패가 아니다', () => {
  it.each(CANCEL_CODES)('%s 는 취소로 분류된다', (code) => {
    expect(isUserCanceled(code)).toBe(true)
    expect(describePaymentFailure(code).kind).toBe('canceled')
  })

  it.each(CANCEL_CODES)('%s 문구에 실패·오류 같은 낱말이 없다', (code) => {
    const { title, description } = describePaymentFailure(code)
    const text = `${title} ${description}`

    for (const banned of ['실패', '오류', '에러', '문제가 발생']) {
      expect(`${code}/${banned}: ${text.includes(banned)}`).toBe(`${code}/${banned}: false`)
    }
  })

  it('🔴 취소에는 고객센터를 안내하지 않는다 (불안만 준다)', () => {
    for (const code of CANCEL_CODES) {
      expect(describePaymentFailure(code).showSupport).toBe(false)
    }
  })

  it('취소해도 다시 시도할 길은 남긴다', () => {
    expect(describePaymentFailure('PAY_PROCESS_CANCELED').canRetry).toBe(true)
  })

  it('아무것도 결제되지 않았다고 분명히 말한다', () => {
    expect(describePaymentFailure('PAY_PROCESS_CANCELED').description).toContain('아직 아무것도 결제되지 않았습니다')
  })
})

describe('거절과 실패를 가른다', () => {
  it('카드사 거절은 rejected — 다른 카드로 유도한다', () => {
    const notice = describePaymentFailure('REJECT_CARD_COMPANY')

    expect(notice.kind).toBe('rejected')
    expect(notice.canRetry).toBe(true)
    expect(notice.description).toContain('다른 카드')
  })

  it('설정 오류는 다시 시도해도 소용없으므로 재시도를 권하지 않는다', () => {
    for (const code of ['NOT_SUPPORTED_METHOD', 'UNAUTHORIZED_KEY']) {
      const notice = describePaymentFailure(code)
      expect(`${code}: ${notice.canRetry}`).toBe(`${code}: false`)
      expect(`${code}: ${notice.showSupport}`).toBe(`${code}: true`)
    }
  })
})

describe('🔴 모르는 코드는 토스 문구를 살린다', () => {
  it('토스가 준 메시지를 그대로 쓴다 (지어내지 않는다)', () => {
    const notice = describePaymentFailure('SOME_UNKNOWN_CODE', '카드사 점검 중입니다.')

    expect(notice.kind).toBe('failed')
    expect(notice.description).toBe('카드사 점검 중입니다.')
  })

  it('메시지가 없으면 우리 문장으로 덮는다', () => {
    expect(describePaymentFailure('SOME_UNKNOWN_CODE', null).description).toBe('잠시 뒤 다시 시도해 주세요.')
    expect(describePaymentFailure('SOME_UNKNOWN_CODE', '   ').description).toBe('잠시 뒤 다시 시도해 주세요.')
  })

  it('코드 자체가 없어도 죽지 않는다', () => {
    for (const code of [null, undefined, '']) {
      expect(describePaymentFailure(code).kind).toBe('failed')
      expect(isUserCanceled(code)).toBe(false)
    }
  })
})
