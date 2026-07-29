import { effectsTier, LITE_FPS, LITE_MEMORY_GB, type EffectsTier } from '../perf-gate'

describe('effectsTier — 저사양 폴백 게이트', () => {
  it('확정 기준값: 메모리 4GB · 45fps', () => {
    expect(LITE_MEMORY_GB).toBe(4)
    expect(LITE_FPS).toBe(45)
  })

  describe('4분면 (메모리 × 프레임)', () => {
    const cases: Array<[number, number, EffectsTier]> = [
      [8, 60, 'full'], // 넉넉 · 부드러움
      [2, 60, 'lite'], // 메모리 부족
      [8, 30, 'lite'], // 프레임 드랍
      [2, 30, 'lite'], // 둘 다 미달
    ]
    it.each(cases)('메모리 %sGB · %sfps → %s', (memory, fps, expected) => {
      expect(effectsTier(memory, fps)).toBe(expected)
    })
  })

  describe('경계값 — 기준 미만일 때만 lite', () => {
    it('메모리는 4GB 정확히면 full, 그 아래면 lite', () => {
      expect(effectsTier(LITE_MEMORY_GB, null)).toBe('full')
      expect(effectsTier(3.99, null)).toBe('lite')
      expect(effectsTier(0.25, null)).toBe('lite') // deviceMemory 최저 보고값
    })
    it('프레임은 45fps 정확히면 full, 그 아래면 lite', () => {
      expect(effectsTier(null, LITE_FPS)).toBe('full')
      expect(effectsTier(null, 44.9)).toBe('lite')
    })
  })

  describe('미측정(null) — 근거 없이는 폴백하지 않는다', () => {
    it('둘 다 null 이면 full', () => {
      expect(effectsTier(null, null)).toBe('full')
    })
    it('한쪽만 측정돼도 그 값으로 판정한다', () => {
      expect(effectsTier(null, 30)).toBe('lite')
      expect(effectsTier(2, null)).toBe('lite')
      expect(effectsTier(null, 60)).toBe('full')
      expect(effectsTier(8, null)).toBe('full')
    })
  })

  describe('쓰레기 측정값 방어 — 미측정과 동일 취급', () => {
    const junk: Array<number> = [Number.NaN, Infinity, -Infinity, 0, -1]
    it.each(junk)('메모리 %p 는 판정 근거로 쓰지 않는다', (v) => {
      expect(effectsTier(v, null)).toBe('full')
      expect(effectsTier(v, 60)).toBe('full')
      expect(effectsTier(v, 30)).toBe('lite') // 프레임 근거는 여전히 유효
    })
    it.each(junk)('프레임 %p 는 판정 근거로 쓰지 않는다', (v) => {
      expect(effectsTier(null, v)).toBe('full')
      expect(effectsTier(8, v)).toBe('full')
      expect(effectsTier(2, v)).toBe('lite') // 메모리 근거는 여전히 유효
    })
  })

  it('결정론 — 같은 입력 같은 결과', () => {
    expect(effectsTier(4, 45)).toBe(effectsTier(4, 45))
  })
})
