import {
  VOUCHER_CATALOG,
  VOUCHER_TYPES,
  getVoucherProduct,
  isVoucherType,
  computeVoucherExpiry,
  isVoucherActive,
} from '../vouchers'

describe('VOUCHER_CATALOG — v1 상품', () => {
  it('CHAT_DAY_PASS: 1만냥, 24시간, 멤버십 포함', () => {
    const p = VOUCHER_CATALOG.CHAT_DAY_PASS
    expect(p.priceBokchae).toBe(1)
    expect(p.durationHours).toBe(24)
    expect(p.includedInMembership).toBe(true)
    expect(p.label).toBe('고민상담 1일권')
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
