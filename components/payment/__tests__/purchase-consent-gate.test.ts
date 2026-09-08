/**
 * 「구매조건 확인 및 결제진행 동의」 게이트.
 *
 * ## 🔴 무엇을 지키나
 * 카드사 결제경로 심사(토스페이먼츠 가이드 12~14p)가 ⑤ 구매과정에서 이 동의를 요구하고,
 * 「전자상거래 등에서의 소비자보호에 관한 법률」 제8조는 **대금을 받기 전에** 구매 내용을
 * 확인시키고 동의를 받도록 판매자에게 지운다.
 *
 * 🔴 체크박스를 그려 놓고 **버튼을 안 잠그면** 받는 의미가 없다. 그래서 이 회귀선은
 *    「동의 UI 가 있는가」가 아니라 **「동의 없이 결제로 넘어갈 수 없는가」** 를 잰다.
 *
 * 🔴 토스 결제창 안의 「[필수] 서비스 이용 약관, 개인정보 처리 동의」로 갈음되지 않는다 —
 *    그건 결제대행사 약관이라 성격이 다르다. 판매자 화면에서 따로 받아야 한다.
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(__dirname, '..', '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

/** 결제창을 여는 화면 — 새 결제 경로가 생기면 여기에 더한다. */
const PAY_SCREENS = [
  { label: '멤버십 정기결제', file: 'app/protected/membership/checkout/page.tsx' },
  { label: '복채 일반결제', file: 'app/protected/store/checkout/bokchae-checkout-client.tsx' },
] as const

describe('🔴 동의 없이는 결제창이 열리지 않는다', () => {
  it.each(PAY_SCREENS)('$label — 동의 블록을 쓴다', ({ file }) => {
    expect(read(file)).toContain('PurchaseConsent')
  })

  it.each(PAY_SCREENS)('$label — 결제 버튼이 동의에 잠긴다', ({ file }) => {
    const source = read(file)

    // disabled 조건에 !agreed 가 들어 있어야 한다. 없으면 체크는 장식이다.
    expect(`${file}: ${/disabled=\{[^}]*!agreed[^}]*\}/.test(source)}`).toBe(`${file}: true`)
  })

  it.each(PAY_SCREENS)('$label — 핸들러도 동의를 다시 확인한다 (버튼만 믿지 않는다)', ({ file }) => {
    const source = read(file)

    expect(`${file}: ${/if\s*\(\s*!agreed\s*\)/.test(source)}`).toBe(`${file}: true`)
  })
})

describe('🔴 복채도 주문 확인 화면을 거친다', () => {
  /**
   * 예전에는 상점 카드의 「충전하기」가 곧바로 토스 결제창을 열어, 심사가 요구하는
   * 구매과정이 통째로 비어 있었다.
   */
  /**
   * 🔴 이 잠금은 «등장 순서»를 재지 않는다.
   *
   * 2026-09-01 까지 여기는 `라우팅 위치 < 결제 호출 위치` 를 봤다. 그런데 실제 코드는
   * 라우팅이 `if (plan.id)` 조건 안에 있고 결제 호출이 그 아래에 있었으므로,
   * 「DB 를 못 읽으면 동의 없이 결제창 직행」이라는 우회로가 살아 있는 채로 통과했다.
   * 합격선이 결함과 무관한 것을 재던, 이 저장소가 이미 한 번 겪은 측정 설계 결함이다.
   *
   * 지금은 조건을 그대로 잰다 — 이 화면에는 결제창을 여는 코드가 **없어야 한다**.
   */
  it('상점 카드는 결제창을 열 수 있는 코드를 아예 갖지 않는다', () => {
    const source = read('components/membership/talisman-purchase-section.tsx')

    expect(source).toContain('/protected/store/checkout?pack=')
    for (const forbidden of ['requestPayment', 'getTossPaymentsSDK', 'successUrl']) {
      expect(`${forbidden} 없음: ${!source.includes(forbidden)}`).toBe(`${forbidden} 없음: true`)
    }
  })

  it('상품 정보를 못 읽으면 결제로 넘기지 않고 멈춘다', () => {
    const source = read('components/membership/talisman-purchase-section.tsx')

    // 폴백 상수에는 DB id 가 없다. id 없는 상품은 주문 확인 화면을 만들 수 없으므로
    // 「그냥 결제」로 떨어뜨리는 대신 사용자에게 알리고 멈춰야 한다.
    expect(/if\s*\(\s*!plan\.id\s*\)/.test(source)).toBe(true)
    expect(source).toContain('plans_unavailable')
  })

  it('주문 확인 화면은 금액을 서버에서 다시 읽는다 (화면 값을 믿지 않는다)', () => {
    const source = read('app/protected/store/checkout/page.tsx')

    expect(source).toContain('getActivePlans')
    expect(source).toContain('plans.find')
  })
})

describe('동의 문구는 구매 내용을 다시 보여준다', () => {
  it('상품명·금액·공급자·청약철회를 함께 적는다', () => {
    const source = read('components/payment/purchase-consent.tsx')

    for (const label of ['주문 상품', '결제 금액', '공급자', '청약철회']) {
      expect(`${label} 포함: ${source.includes(label)}`).toBe(`${label} 포함: true`)
    }
  })
})
