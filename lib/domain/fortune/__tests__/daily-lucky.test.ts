import { deriveDailyLucky } from '../daily-lucky'

describe('deriveDailyLucky — 결정적 파생(F-7)', () => {
  it('같은 (날짜·일간·일진) → 같은 결과 (결정적, AI 재호출 없음)', () => {
    const a = deriveDailyLucky('2026-07-22', '木', '水')
    const b = deriveDailyLucky('2026-07-22', '木', '水')
    expect(a).toEqual(b)
  })

  it('날짜가 바뀌면 숫자·시간이 변한다 (매일 고정 아님)', () => {
    const days = ['2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25', '2026-07-26']
    const nums = new Set(days.map((d) => deriveDailyLucky(d, '木', '水').number))
    const times = new Set(days.map((d) => deriveDailyLucky(d, '木', '水').timeRange))
    expect(nums.size).toBeGreaterThan(1)
    expect(times.size).toBeGreaterThan(1)
  })

  it('총운 별점은 일진↔일간 오행 관계(십성)를 따른다', () => {
    expect(deriveDailyLucky('2026-07-22', '木', '水').stars).toBe(5) // 인성(水生木)
    expect(deriveDailyLucky('2026-07-22', '木', '火').stars).toBe(4) // 식상(木生火)
    expect(deriveDailyLucky('2026-07-22', '木', '木').stars).toBe(4) // 비겁(동일)
    expect(deriveDailyLucky('2026-07-22', '木', '土').stars).toBe(3) // 재성(木剋土)
    expect(deriveDailyLucky('2026-07-22', '木', '金').stars).toBe(2) // 관성(金剋木)
  })

  it('행운의 색은 나를 돕는 오행(인성)이다', () => {
    expect(deriveDailyLucky('2026-07-22', '木', '水').color.name).toBe('검정') // 水生木
    expect(deriveDailyLucky('2026-07-22', '火', '土').color.name).toBe('초록') // 木生火
    expect(deriveDailyLucky('2026-07-22', '水', '木').color.name).toBe('흰색') // 金生水
  })

  it('출력 범위: 별점 1~5, 숫자 1~9, 시간대 형식', () => {
    for (const el of ['木', '火', '土', '金', '水']) {
      const r = deriveDailyLucky('2026-07-22', el, '水')
      expect(r.stars).toBeGreaterThanOrEqual(1)
      expect(r.stars).toBeLessThanOrEqual(5)
      expect(r.number).toBeGreaterThanOrEqual(1)
      expect(r.number).toBeLessThanOrEqual(9)
      expect(r.timeRange).toMatch(/시 \(\d{2}~\d{2}시\)/)
      expect(r.color.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})
