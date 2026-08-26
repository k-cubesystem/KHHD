import {
  VOUCHER_CATALOG,
  VOUCHER_TYPES,
  getVoucherProduct,
  isVoucherType,
  computeVoucherExpiry,
  isVoucherActive,
  SELLABLE_VOUCHER_TYPES,
} from '../vouchers'

describe('VOUCHER_CATALOG — v1 상품', () => {
  it('CHAT_DAY_PASS: 1만냥, 24시간, 멤버십 포함', () => {
    const p = VOUCHER_CATALOG.CHAT_DAY_PASS
    expect(p.priceBokchae).toBe(1)
    expect(p.durationHours).toBe(24)
    expect(p.includedInMembership).toBe(true)
    expect(p.label).toBe('속풀이 1일권')
  })

  it('VOUCHER_TYPES 는 카탈로그 키 목록', () => {
    expect(VOUCHER_TYPES).toEqual(['CHAT_DAY_PASS'])
  })
})

describe('isVoucherType — 런타임 가드', () => {
  it('알려진 타입만 통과', () => {
    expect(isVoucherType('CHAT_DAY_PASS')).toBe(true)
    expect(isVoucherType('UNKNOWN')).toBe(false)
    expect(isVoucherType('')).toBe(false)
    // 프로토타입 오염 방지
    expect(isVoucherType('toString')).toBe(false)
  })
})

describe('getVoucherProduct', () => {
  it('타입에 맞는 상품 반환', () => {
    expect(getVoucherProduct('CHAT_DAY_PASS')).toBe(VOUCHER_CATALOG.CHAT_DAY_PASS)
  })
})

describe('computeVoucherExpiry — 만료 계산', () => {
  it('기준시각 + 24시간', () => {
    const from = Date.UTC(2026, 6, 23, 0, 0, 0) // 2026-07-23T00:00:00Z
    const exp = computeVoucherExpiry(VOUCHER_CATALOG.CHAT_DAY_PASS, from)
    expect(exp.toISOString()).toBe('2026-07-24T00:00:00.000Z')
  })
})

describe('isVoucherActive — 활성 판정', () => {
  const now = Date.UTC(2026, 6, 23, 12, 0, 0)

  it('active + 미래 만료 = 활성', () => {
    expect(isVoucherActive({ status: 'active', expires_at: new Date(now + 3_600_000).toISOString() }, now)).toBe(true)
  })

  it('active + 과거 만료 = 비활성', () => {
    expect(isVoucherActive({ status: 'active', expires_at: new Date(now - 1).toISOString() }, now)).toBe(false)
  })

  it('used/취소 상태 = 비활성', () => {
    expect(isVoucherActive({ status: 'used', expires_at: new Date(now + 3_600_000).toISOString() }, now)).toBe(false)
  })

  it('expires_at 없음 = 비활성(방어)', () => {
    expect(isVoucherActive({ status: 'active', expires_at: null }, now)).toBe(false)
  })
})

/**
 * 판매 종료 상품의 서버 게이트 — 「진열만 내리고 엔드포인트는 열려 있던」 사고 잠금.
 *
 * sellable:false 는 화면 필터(SELLABLE_VOUCHER_TYPES)에만 반영돼 있었고,
 * purchaseVoucher('CHAT_DAY_PASS') 직접 호출은 복채를 실제로 차감했다.
 * Regression: /pipeline 2026-08-26 — 돈 경로 리뷰 H-5.
 */
describe('판매 종료 상품 계약', () => {
  it('sellable:false 인 상품은 진열 목록에서 빠진다', () => {
    const notSellable = VOUCHER_TYPES.filter((t) => !VOUCHER_CATALOG[t].sellable)
    for (const t of notSellable) {
      expect(SELLABLE_VOUCHER_TYPES).not.toContain(t)
    }
  })

  it('CHAT_DAY_PASS 는 판매 종료 상태다 — 서버도 이 값을 봐야 한다', () => {
    expect(VOUCHER_CATALOG.CHAT_DAY_PASS.sellable).toBe(false)
  })
})
