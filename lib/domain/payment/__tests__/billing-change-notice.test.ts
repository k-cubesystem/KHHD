/**
 * 결제 수단 변경 복귀 화면이 보여 줄 안내.
 *
 * 이 화면은 처음에 «무엇을 보여 줄지»를 스스로 정했고, 그래서 회원이 토스 창에서 **취소**를 눌러도
 * 붉은 X 에 「바꾸지 못했습니다」를 띄웠다. `payment-failure.ts` 가 이미 못 박아 둔 원칙
 * (「취소는 실패가 아니다 — 자기가 그만둔 것을 실패라고 하면 잘못한 것 같고 뭔가 망가진 것 같다」)이
 * 이 화면에는 닿지 않았던 것이다.
 *
 * 못 박는 것:
 *  1. 취소는 중립이다 — 붉은 톤도, «실패·오류·못했» 낱말도 쓰지 않는다.
 *  2. 주소로 바로 들어온 것도 «아무 일도 없었다» — 경고하지 않는다.
 *  3. 진짜 실패는 붉게, 그리고 **기존 결제 수단이 그대로라는 사실**을 반드시 말한다.
 *  4. 모르는 코드는 토스 문구를 살린다(지어내지 않는다).
 */
import { billingChangeNotice, failedNotice } from '../billing-change-notice'

/** 취소 자리에 나오면 안 되는 낱말 — 「실패했다」는 인상을 주는 말들. */
const ALARMING = ['실패', '오류', '못했', '문제가 생겼']

describe('취소는 실패가 아니다', () => {
  it.each(['PAY_PROCESS_CANCELED', 'USER_CANCEL'])('%s 는 중립 톤이다', (code) => {
    const notice = billingChangeNotice(code, null, null, null)

    expect(notice?.tone).toBe('neutral')
    for (const word of ALARMING) {
      expect(`${notice?.title} ${notice?.body}`).not.toContain(word)
    }
  })

  it('그만둬도 기존 결제 수단이 그대로라는 것을 말해 준다', () => {
    expect(billingChangeNotice('USER_CANCEL', null, null, null)?.body).toContain('기존 결제 수단은 그대로')
  })

  it('«돈» 이야기를 하지 않는다 — 여기서는 청구가 일어나지 않는다', () => {
    const notice = billingChangeNotice('USER_CANCEL', null, null, null)
    expect(`${notice?.title} ${notice?.body}`).not.toContain('결제되지')
  })
})

describe('주소로 바로 들어온 자리', () => {
  it('인증 정보가 없으면 중립으로 안내한다 — 아무 일도 없었다', () => {
    const notice = billingChangeNotice(null, null, null, null)

    expect(notice?.tone).toBe('neutral')
    for (const word of ALARMING) {
      expect(`${notice?.title} ${notice?.body}`).not.toContain(word)
    }
  })

  it('authKey 만 있고 customerKey 가 없으면 넘어가지 않는다', () => {
    expect(billingChangeNotice(null, null, 'auth_1', null)?.tone).toBe('neutral')
  })

  it('인증이 온전하면 안내가 없다 — 그때만 발급으로 넘어간다', () => {
    expect(billingChangeNotice(null, null, 'auth_1', 'HHD_user_2')).toBeNull()
  })
})

describe('진짜 실패', () => {
  it('카드사 거절은 붉게 알리고, 기존 수단이 그대로라는 것을 덧붙인다', () => {
    const notice = billingChangeNotice('REJECT_CARD_COMPANY', null, null, null)

    expect(notice?.tone).toBe('error')
    expect(notice?.body).toContain('기존 결제 수단은 그대로')
  })

  it('🔴 모르는 코드는 토스 문구를 살린다 — 지어내지 않는다', () => {
    const notice = billingChangeNotice('SOME_NEW_CODE', '카드사 점검 중입니다.', null, null)

    expect(notice?.tone).toBe('error')
    expect(notice?.body).toContain('카드사 점검 중입니다.')
  })

  it('이유를 모르면 빈 문장을 남기지 않는다', () => {
    expect(failedNotice('   ').body).toContain('기존 결제 수단은 그대로')
  })
})
