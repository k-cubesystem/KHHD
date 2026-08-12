import {
  describePaymentSettlement,
  isPaymentStatusFilter,
  PAYMENT_STATUS_FILTERS,
} from '@/app/admin/payments/payment-display'

describe('describePaymentSettlement', () => {
  it('취소가 없으면 결제액 그대로 보여 준다', () => {
    expect(describePaymentSettlement({ amount: 10000, cancelled_amount: 0, status: 'completed' })).toEqual({
      kind: 'none',
      net: 10000,
      cancelled: 0,
    })
  })

  it('부분 취소 — status 는 completed 로 남지만 실결제액은 줄어든다(이번 수복의 핵심)', () => {
    expect(describePaymentSettlement({ amount: 10000, cancelled_amount: 3000, status: 'completed' })).toEqual({
      kind: 'partial',
      net: 7000,
      cancelled: 3000,
    })
  })

  it('전액 취소는 status=refunded 가 정본 — 실결제액 0', () => {
    expect(describePaymentSettlement({ amount: 10000, cancelled_amount: 10000, status: 'refunded' })).toEqual({
      kind: 'full',
      net: 0,
      cancelled: 10000,
    })
  })

  it('전액 취소인데 취소액 기록이 없으면 결제 총액을 취소액으로 본다(매출 집계가 refunded 를 통째로 빼는 것과 같은 답)', () => {
    expect(describePaymentSettlement({ amount: 10000, cancelled_amount: 0, status: 'refunded' })).toEqual({
      kind: 'full',
      net: 0,
      cancelled: 10000,
    })
  })

  it('취소액이 결제액을 다 먹었는데 status 가 아직 completed 면(웹훅 순서 꼬임) 전액 취소로 읽는다', () => {
    expect(describePaymentSettlement({ amount: 10000, cancelled_amount: 10000, status: 'completed' })).toEqual({
      kind: 'full',
      net: 0,
      cancelled: 10000,
    })
  })

  it('취소액이 결제액을 넘겨 기록돼도 결제액을 넘어 표시하지 않는다', () => {
    expect(describePaymentSettlement({ amount: 10000, cancelled_amount: 99999, status: 'refunded' })).toEqual({
      kind: 'full',
      net: 0,
      cancelled: 10000,
    })
  })

  it('null · 음수 · 소수는 0 이상 정수로 방어한다', () => {
    expect(describePaymentSettlement({ amount: 5000, cancelled_amount: null, status: 'completed' })).toEqual({
      kind: 'none',
      net: 5000,
      cancelled: 0,
    })
    expect(describePaymentSettlement({ amount: 5000, cancelled_amount: -100, status: 'completed' })).toEqual({
      kind: 'none',
      net: 5000,
      cancelled: 0,
    })
  })

  it('테스트 충전(0원)은 취소 표기가 붙지 않는다', () => {
    expect(describePaymentSettlement({ amount: 0, cancelled_amount: 0, status: 'test_charge' })).toEqual({
      kind: 'none',
      net: 0,
      cancelled: 0,
    })
  })
})

describe('isPaymentStatusFilter', () => {
  it('허용 목록만 통과시킨다 — 임의 문자열이 status 질의로 새지 않는다', () => {
    for (const value of PAYMENT_STATUS_FILTERS) {
      expect(isPaymentStatusFilter(value)).toBe(true)
    }
    expect(isPaymentStatusFilter('pending')).toBe(false)
    expect(isPaymentStatusFilter('')).toBe(false)
  })

  it('부분 취소는 status 컬럼에 없는 합성 필터로 남아 있어야 한다', () => {
    expect(PAYMENT_STATUS_FILTERS).toContain('partial_cancel')
    expect(PAYMENT_STATUS_FILTERS).toContain('refunded')
  })
})
