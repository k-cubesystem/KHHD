/**
 * 결제 취소 셀프서비스 판정 계약.
 *
 * 여기서 지키는 약속:
 *  1. 세 갈래 판정 — 전액 남음 / 일부·전부 소진 / 취소 대상 아님.
 *  2. 청약철회 7일 경계는 **사용자 유리**하게(7일째까지 수수료 0), 수수료는 내림.
 *  3. 손실 처리량은 «지갑에 남지 않아 회수 못 하는 복채»와 정확히 같다(RPC 가 실제로 하는 계산).
 *  4. 멤버십 일할 환불은 기간·복채 소진 중 **더 큰 쪽 하나만** 공제한다.
 */
import {
  CANCEL_MEMO_MAX_LENGTH,
  classifyChargeCancel,
  computeMembershipRefund,
  sanitizeCancelMemo,
  validateCancelReason,
} from '../self-cancel'

const NOW = new Date('2026-08-12T00:00:00Z')
const DAY = 86_400_000

function paidDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString()
}

function chargeInput(overrides: Partial<Parameters<typeof classifyChargeCancel>[0]> = {}) {
  return {
    paidAmount: 10_000,
    grantedCredits: 20,
    ledgerRemaining: 20,
    walletBalance: 20,
    status: 'completed',
    bokchaeType: 'charge',
    paidAt: paidDaysAgo(1),
    now: NOW,
    ...overrides,
  }
}

describe('classifyChargeCancel — 세 갈래 판정', () => {
  it('(a) 지급 복채가 전액 남아 있으면 즉시 취소 가능', () => {
    const plan = classifyChargeCancel(chargeInput({ walletBalance: 50 }))

    expect(plan.verdict).toBe('FULL_REFUNDABLE')
    expect(plan.recoverableCredits).toBe(20)
    expect(plan.spentCredits).toBe(0)
    expect(plan.lossCredits).toBe(0)
    expect(plan.refundAmount).toBe(10_000)
  })

  it('(b) 일부 소진이면 취소 불가 갈래로 떨어지고 부족분이 손실 처리 대상이 된다', () => {
    const plan = classifyChargeCancel(chargeInput({ walletBalance: 8 }))

    expect(plan.verdict).toBe('PARTIALLY_SPENT')
    expect(plan.recoverableCredits).toBe(8)
    expect(plan.spentCredits).toBe(12)
    expect(plan.lossCredits).toBe(12)
    // 회수 못 한 12/20 만큼이 회사 손실 — 10,000 × 12/20
    expect(plan.lossAmount).toBe(6_000)
  })

  it('(b) 전부 소진해도 같은 갈래다 — 환불액은 전액, 손실은 지급 전량', () => {
    const plan = classifyChargeCancel(chargeInput({ walletBalance: 0 }))

    expect(plan.verdict).toBe('PARTIALLY_SPENT')
    expect(plan.spentCredits).toBe(20)
    expect(plan.lossCredits).toBe(20)
    expect(plan.lossAmount).toBe(10_000)
    expect(plan.refundAmount).toBe(10_000)
  })

  it('(c) 이미 취소된 결제는 금액을 0 으로 닫는다', () => {
    const plan = classifyChargeCancel(chargeInput({ status: 'refunded' }))

    expect(plan.verdict).toBe('NOT_CANCELLABLE')
    expect(plan.blockedReason).toBe('ALREADY_CANCELLED')
    expect(plan.refundAmount).toBe(0)
    expect(plan.lossCredits).toBe(0)
  })

  it('(c) 충전 결제가 아니면 취소 대상이 아니다', () => {
    const plan = classifyChargeCancel(chargeInput({ bokchaeType: 'feature' }))

    expect(plan.verdict).toBe('NOT_CANCELLABLE')
    expect(plan.blockedReason).toBe('NOT_A_CHARGE')
  })

  it('(c) 결제 완료 상태가 아니면 취소 대상이 아니다', () => {
    expect(classifyChargeCancel(chargeInput({ status: 'pending' })).blockedReason).toBe('NOT_COMPLETED')
    expect(classifyChargeCancel(chargeInput({ status: 'wallet_failed' })).blockedReason).toBe('NOT_COMPLETED')
  })

  it('(c) 이미 전액 취소돼 남은 결제 금액이 없으면 취소 대상이 아니다', () => {
    const plan = classifyChargeCancel(chargeInput({ cancelledAmount: 10_000 }))

    expect(plan.verdict).toBe('NOT_CANCELLABLE')
    expect(plan.blockedReason).toBe('ALREADY_CANCELLED')
  })
})

describe('classifyChargeCancel — 청약철회 7일(약관 제7조 제2항)', () => {
  it('결제 당일은 경과 0일 · 수수료 없음(초일 불산입)', () => {
    const plan = classifyChargeCancel(chargeInput({ paidAt: paidDaysAgo(0) }))

    expect(plan.elapsedDays).toBe(0)
    expect(plan.withinWithdrawalPeriod).toBe(true)
    expect(plan.feeAmount).toBe(0)
  })

  it('7일째까지는 수수료가 붙지 않는다 — 경계는 사용자에게 유리하게', () => {
    const plan = classifyChargeCancel(chargeInput({ paidAt: paidDaysAgo(7) }))

    expect(plan.elapsedDays).toBe(7)
    expect(plan.withinWithdrawalPeriod).toBe(true)
    expect(plan.refundAmount).toBe(10_000)
  })

  it('8일째부터 10% 수수료가 차감된다', () => {
    const plan = classifyChargeCancel(chargeInput({ paidAt: paidDaysAgo(8) }))

    expect(plan.withinWithdrawalPeriod).toBe(false)
    expect(plan.feeRate).toBe(0.1)
    expect(plan.feeAmount).toBe(1_000)
    expect(plan.refundAmount).toBe(9_000)
  })

  it('수수료는 내림 — 1원 단위 반올림 이득은 사용자가 가져간다', () => {
    const plan = classifyChargeCancel(chargeInput({ paidAmount: 9_999, paidAt: paidDaysAgo(30) }))

    expect(plan.feeAmount).toBe(999)
    expect(plan.refundAmount).toBe(9_000)
    expect(plan.feeAmount + plan.refundAmount).toBe(9_999)
  })

  it('부분 취소 이력이 있으면 남은 결제 금액만 환불 대상이 된다', () => {
    const plan = classifyChargeCancel(chargeInput({ cancelledAmount: 3_000, paidAt: paidDaysAgo(1) }))

    expect(plan.grossAmount).toBe(7_000)
    expect(plan.refundAmount).toBe(7_000)
  })
})

describe('validateCancelReason — 객관식 + 메모', () => {
  it('알 수 없는 사유 코드는 거부한다', () => {
    expect(validateCancelReason({ reasonCode: 'HACK' })).toEqual({ ok: false, error: '취소 사유를 선택해주세요.' })
    expect(validateCancelReason({ reasonCode: undefined }).ok).toBe(false)
  })

  it('「기타」는 메모가 없으면 통과하지 못한다', () => {
    expect(validateCancelReason({ reasonCode: 'OTHER' }).ok).toBe(false)
    expect(validateCancelReason({ reasonCode: 'OTHER', memo: '   ' }).ok).toBe(false)

    const result = validateCancelReason({ reasonCode: 'OTHER', memo: '앱이 자꾸 튕겨요' })
    expect(result).toEqual({ ok: true, reasonCode: 'OTHER', memo: '앱이 자꾸 튕겨요' })
  })

  it('다른 사유는 메모 없이도 통과한다', () => {
    expect(validateCancelReason({ reasonCode: 'MISTAKE' })).toEqual({ ok: true, reasonCode: 'MISTAKE', memo: '' })
  })
})

describe('sanitizeCancelMemo — 저장 전 정규화', () => {
  it('꺾쇠를 지워 마크업 주입 경로를 막는다', () => {
    expect(sanitizeCancelMemo('<script>alert(1)</script>')).toBe('scriptalert(1)/script')
    expect(sanitizeCancelMemo('<img src=x onerror=1>')).toBe('img src=x onerror=1')
  })

  it('제어문자·제로폭 문자를 제거한다', () => {
    const raw = `a${String.fromCharCode(0)}b${String.fromCharCode(8203)}c`
    expect(sanitizeCancelMemo(raw)).toBe('abc')
  })

  it('길이를 상한으로 자른다', () => {
    expect(sanitizeCancelMemo('가'.repeat(500))).toHaveLength(CANCEL_MEMO_MAX_LENGTH)
  })

  it('문자열이 아니면 빈 문자열', () => {
    expect(sanitizeCancelMemo(undefined)).toBe('')
    expect(sanitizeCancelMemo({ evil: true })).toBe('')
  })
})

describe('computeMembershipRefund — 잔여기간 일할 환불', () => {
  const periodStart = new Date('2026-08-01T00:00:00Z')
  const periodEnd = new Date('2026-08-31T00:00:00Z')

  function membershipInput(overrides: Partial<Parameters<typeof computeMembershipRefund>[0]> = {}) {
    return {
      price: 9_900,
      periodStart,
      periodEnd,
      grantedCredits: 10,
      walletBalance: 10,
      now: new Date('2026-08-02T00:00:00Z'),
      ...overrides,
    }
  }

  it('복채를 쓰지 않았으면 순수 일할 환불', () => {
    const plan = computeMembershipRefund(membershipInput())

    expect(plan.totalDays).toBe(30)
    expect(plan.usedDays).toBe(1)
    expect(plan.remainingDays).toBe(29)
    expect(plan.refundAmount).toBe(9_570) // floor(9900 × 29/30)
    expect(plan.keptCredits).toBe(10)
  })

  it('지급 복채를 다 써버렸으면 이용 비율 100% — 환불 0', () => {
    const plan = computeMembershipRefund(membershipInput({ walletBalance: 0 }))

    expect(plan.creditUsageRatio).toBe(1)
    expect(plan.usageRatio).toBe(1)
    expect(plan.refundAmount).toBe(0)
  })

  it('기간과 복채 중 더 큰 쪽 하나만 공제한다(이중 공제 금지)', () => {
    const plan = computeMembershipRefund(membershipInput({ now: new Date('2026-08-16T00:00:00Z'), walletBalance: 7 }))

    expect(plan.dayUsageRatio).toBeCloseTo(0.5)
    expect(plan.creditUsageRatio).toBeCloseTo(0.3)
    expect(plan.usageRatio).toBeCloseTo(0.5)
    // 두 비율을 더했다면 0.8 이 되어 1,980원이 나온다 — 그러면 안 된다.
    expect(plan.refundAmount).toBe(4_950)
  })

  it('복채를 기간보다 빨리 소진했으면 복채 비율이 이긴다', () => {
    const plan = computeMembershipRefund(membershipInput({ walletBalance: 2 }))

    expect(plan.creditUsageRatio).toBeCloseTo(0.8)
    expect(plan.usageRatio).toBeCloseTo(0.8)
    // 부동소수 오차(9900 × 0.19999…)로 1,979원이 되면 안 된다 — 1원이라도 사용자에게 유리하게.
    expect(plan.refundAmount).toBe(1_980)
  })

  it('가입 직후 해지는 전액 환불(청약철회 상당)', () => {
    const plan = computeMembershipRefund(membershipInput({ now: periodStart }))

    expect(plan.usedDays).toBe(0)
    expect(plan.refundAmount).toBe(9_900)
  })

  it('기간이 끝났으면 환불액이 없다', () => {
    const plan = computeMembershipRefund(membershipInput({ now: new Date('2026-09-05T00:00:00Z') }))

    expect(plan.usedDays).toBe(30)
    expect(plan.remainingDays).toBe(0)
    expect(plan.refundAmount).toBe(0)
  })

  it('기간 정보가 없으면 자동 환불하지 않는다(수동 처리 대상)', () => {
    const plan = computeMembershipRefund(membershipInput({ periodStart: null, periodEnd: null }))

    expect(plan.totalDays).toBe(0)
    expect(plan.refundAmount).toBe(0)
  })

  it('이미 환불된 금액을 넘겨 환불하지 않는다', () => {
    const plan = computeMembershipRefund(membershipInput({ alreadyRefunded: 9_000 }))

    expect(plan.refundAmount).toBe(900)
  })

  it('위약금을 붙이지 않는다 — 잔여 대금 전부가 환불 대상', () => {
    const plan = computeMembershipRefund(membershipInput({ now: periodStart, walletBalance: 10 }))

    expect(plan.refundAmount).toBe(9_900)
  })
})
