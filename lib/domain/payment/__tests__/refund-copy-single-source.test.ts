/**
 * 환불 조건 문구의 숫자는 한 곳에서만 온다.
 *
 * 실제 사고(2026-09-01 발견): 카드사 심사에 제출한 문서는 상점 화면이
 * 「미사용분 7일 이내 전액, 이후 90%」를 명시한다고 적었는데, 화면은 「7일 이내 가능」
 * 까지만 있었다. 심사관이 캡처와 설명을 대조하면 바로 어긋난다 —
 * 1차 통과 후 2차 회신을 기다리는 중에 자초하는 반려 사유다.
 *
 * 같은 숫자가 화면 4곳에 손으로 박혀 있어 수수료율을 바꾸면 옛 숫자가 남는 구조이기도 했다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { chargeRefundPolicyLine, WITHDRAWAL_PERIOD_DAYS, LATE_CANCEL_FEE_RATE } from '../self-cancel'

const ROOT = join(__dirname, '..', '..', '..', '..')
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

/** 결제 전에 환불 조건을 보여주는 화면들. 새 결제 화면이 생기면 여기에 더한다. */
const COPY_SCREENS = [
  'components/membership/talisman-purchase-section.tsx',
  'app/protected/store/checkout/page.tsx',
  'components/payment/purchase-consent.tsx',
]

describe('환불 조건 문구', () => {
  it('상수에서 숫자를 도출한다 — 문구에 손으로 적지 않는다', () => {
    const line = chargeRefundPolicyLine()
    expect(line).toContain(`${WITHDRAWAL_PERIOD_DAYS}일`)
    expect(line).toContain(`${Math.round((1 - LATE_CANCEL_FEE_RATE) * 100)}%`)
  })

  it('수수료율을 바꾸면 문구도 따라 바뀐다', () => {
    // 지금 값(10%)에서 「90%」가 나오는지 — 상수와 문구가 실제로 연결돼 있음을 확인.
    expect(LATE_CANCEL_FEE_RATE).toBe(0.1)
    expect(chargeRefundPolicyLine()).toContain('90%')
  })

  it.each(COPY_SCREENS)('%s 는 정본 함수를 쓰고 숫자를 직접 적지 않는다', (rel) => {
    const source = read(rel)
    expect(source).toContain('chargeRefundPolicyLine')
    // 「7일 이내 … 90%」를 손으로 적은 흔적이 남아 있으면 안 된다.
    expect(/이후\s*90%/.test(source)).toBe(false)
  })

  it('심사 문서가 설명하는 조건이 실제 문구에 들어 있다', () => {
    const doc = read('docs/toss-review/일반결제-결제경로.md')
    expect(doc).toContain('90%')
    const line = chargeRefundPolicyLine()
    expect(line).toContain('90%')
    expect(line).toContain('7일')
  })
})
