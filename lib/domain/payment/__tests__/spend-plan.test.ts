import { computeSpendPlan } from '../spend-plan'

describe('computeSpendPlan — 충전분 캡 무관 / 무료분만 캡', () => {
  it('한도 내 소비: 전부 무료분에서, 충전분 불필요', () => {
    const p = computeSpendPlan({ cost: 20, dailyLimit: 30, usedToday: 0, chargeExemptRemaining: 0 })
    expect(p).toEqual({ allowed: true, fromCap: 20, overCap: 0 })
  })

  it('한도 정확히 소진: 여전히 허용', () => {
    const p = computeSpendPlan({ cost: 30, dailyLimit: 30, usedToday: 0, chargeExemptRemaining: 0 })
    expect(p.allowed).toBe(true)
    expect(p.fromCap).toBe(30)
    expect(p.overCap).toBe(0)
  })

  it('한도 초과 + 충전분 충분: 초과분은 충전분에서 (허용)', () => {
    const p = computeSpendPlan({ cost: 40, dailyLimit: 30, usedToday: 0, chargeExemptRemaining: 100 })
    expect(p).toEqual({ allowed: true, fromCap: 30, overCap: 10 })
  })

  it('한도 초과 + 충전분 부족: 차단(INSUFFICIENT_CHARGED)', () => {
    const p = computeSpendPlan({ cost: 40, dailyLimit: 30, usedToday: 0, chargeExemptRemaining: 5 })
    expect(p.allowed).toBe(false)
    expect(p.reason).toBe('INSUFFICIENT_CHARGED')
  })

  it('한도 이미 소진 + 충전분 없음: 차단(DAILY_LIMIT)', () => {
    const p = computeSpendPlan({ cost: 10, dailyLimit: 30, usedToday: 30, chargeExemptRemaining: 0 })
    expect(p.allowed).toBe(false)
    expect(p.reason).toBe('DAILY_LIMIT')
    expect(p.fromCap).toBe(0)
    expect(p.overCap).toBe(10)
  })

  it('비구독자(한도 0) + 충전분 있음: 충전분으로 사용 가능 — 머니트랩 해소', () => {
    const p = computeSpendPlan({ cost: 10, dailyLimit: 0, usedToday: 0, chargeExemptRemaining: 50 })
    expect(p).toEqual({ allowed: true, fromCap: 0, overCap: 10 })
  })

  it('비구독자(한도 0) + 충전분 없음: 차단(DAILY_LIMIT)', () => {
    const p = computeSpendPlan({ cost: 10, dailyLimit: 0, usedToday: 0, chargeExemptRemaining: 0 })
    expect(p.allowed).toBe(false)
    expect(p.reason).toBe('DAILY_LIMIT')
  })

  it('한도 초과분 == 충전분 잔여(경계): 허용', () => {
    const p = computeSpendPlan({ cost: 40, dailyLimit: 30, usedToday: 0, chargeExemptRemaining: 10 })
    expect(p.allowed).toBe(true)
    expect(p.overCap).toBe(10)
  })

  it('부분 사용 후 한도: usedToday 반영', () => {
    const p = computeSpendPlan({ cost: 20, dailyLimit: 30, usedToday: 25, chargeExemptRemaining: 100 })
    // capRemaining=5 → fromCap=5, overCap=15 (충전분 100 충분)
    expect(p).toEqual({ allowed: true, fromCap: 5, overCap: 15 })
  })

  it('cost 0: 허용, 소비 0', () => {
    const p = computeSpendPlan({ cost: 0, dailyLimit: 0, usedToday: 0, chargeExemptRemaining: 0 })
    expect(p).toEqual({ allowed: true, fromCap: 0, overCap: 0 })
  })

  it('음수 cost 방어: 0으로 취급', () => {
    const p = computeSpendPlan({ cost: -5, dailyLimit: 10, usedToday: 0, chargeExemptRemaining: 0 })
    expect(p.allowed).toBe(true)
    expect(p.fromCap).toBe(0)
    expect(p.overCap).toBe(0)
  })
})
