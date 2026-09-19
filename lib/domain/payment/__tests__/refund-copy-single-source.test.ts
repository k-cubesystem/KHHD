/**
 * 환불 조건 문구의 숫자는 한 곳에서만 온다.
 *
 * 실제 사고(2026-09-01 발견): 카드사 심사에 제출한 문서는 상점 화면이
 * 「미사용분 7일 이내 전액, 이후 90%」를 명시한다고 적었는데, 화면은 「7일 이내 가능」
 * 까지만 있었다. 심사관이 캡처와 설명을 대조하면 바로 어긋난다 —
 * 1차 통과 후 2차 회신을 기다리는 중에 자초하는 반려 사유다.
 *
 * 같은 숫자가 화면 4곳에 손으로 박혀 있어 수수료율을 바꾸면 옛 숫자가 남는 구조이기도 했다.
 * 2026-09-18 이용권 전환 — 문구의 대상이 «미사용 이용권»으로 바뀌었고, 규율은 그대로다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  chargeRefundPolicyLine,
  computeMembershipRefund,
  membershipRefundPolicyLine,
  WITHDRAWAL_PERIOD_DAYS,
  LATE_CANCEL_FEE_RATE,
} from '../self-cancel'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'

const ROOT = join(__dirname, '..', '..', '..', '..')
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

/** 결제 전에 환불 조건을 보여주는 화면들. 새 결제 화면이 생기면 여기에 더한다. */
const COPY_SCREENS = [
  'components/store/pass-purchase-section.tsx',
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

  it('대상은 «미사용 이용권»이다 — 잔액형 재화 어휘를 쓰지 않는다', () => {
    const line = chargeRefundPolicyLine()
    expect(line).toBe('미사용 이용권은 결제일로부터 7일 이내 전액, 이후 90% 환불합니다.')
    expect(findBannedPassTerms(line)).toEqual([])
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

/**
 * 멤버십 즉시 해지 환불은 «일할»이 아니라 max 산식이다(약관 제7조 제3항 · computeMembershipRefund).
 *
 * 실제 결함(2026-09-19 배포 전 리뷰): 결제 동의·해지·관리 화면이 «잔여 기간 일할 환불»을 약속했는데,
 * 이번 주기 이용권을 날짜보다 많이 쓴 회원은 그보다 적게 돌려받는다 — 동의 문구가 실제보다 후했다.
 */
const MEMBERSHIP_REFUND_SCREENS = [
  'components/payment/purchase-consent.tsx',
  'app/protected/membership/manage/page.tsx',
  'app/protected/membership/cancel/page.tsx',
]
const MEMBERSHIP_CANCEL_FORM = 'app/protected/membership/cancel/membership-cancel-form.tsx'

describe('멤버십 환불 문구 — «큰 쪽» 공제', () => {
  it('정본 문구가 두 비율 중 큰 쪽을 뺀다고 밝히고, 일할 환불을 약속하지 않는다', () => {
    const line = membershipRefundPolicyLine()
    expect(line).toContain('지난 기간 비율')
    expect(line).toContain('이용권 사용 비율')
    expect(line).toContain('큰 쪽')
    expect(line).not.toContain('일할')
    expect(findBannedPassTerms(line)).toEqual([])
  })

  it('문구가 산식과 같은 말을 한다 — 첫날 해지해도 이번 주기 이용권을 다 썼으면 환불은 0원', () => {
    const plan = computeMembershipRefund({
      price: 12_800,
      periodStart: '2026-09-01T00:00:00Z',
      periodEnd: '2026-10-01T00:00:00Z',
      monthlyPasses: 5,
      usedPasses: 5,
      now: new Date('2026-09-01T12:00:00Z'),
    })
    expect(plan.usageRatio).toBe(Math.max(plan.dayUsageRatio, plan.creditUsageRatio))
    expect(plan.refundAmount).toBe(0)
  })

  it.each(MEMBERSHIP_REFUND_SCREENS)('%s 는 정본 함수를 쓴다', (rel) => {
    expect(read(rel)).toContain('membershipRefundPolicyLine()')
  })

  it('해지 화면의 즉시 해지 설명도 같은 산식을 말한다', () => {
    expect(read(MEMBERSHIP_CANCEL_FORM)).toContain('큰 쪽')
  })

  it.each([...MEMBERSHIP_REFUND_SCREENS, MEMBERSHIP_CANCEL_FORM])('%s 에 «일할» 환불 약속이 남아 있지 않다', (rel) => {
    expect(read(rel)).not.toMatch(/일할|남은 기간만큼 환불/)
  })
})
