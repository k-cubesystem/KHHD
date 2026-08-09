import {
  effectsTier,
  fromEffectsTier,
  perfTier,
  toEffectsTier,
  LITE_FPS,
  LITE_MEMORY_GB,
  LOW_CONCURRENCY,
  type EffectsTier,
  type PerfSignals,
  type PerfTier,
} from '../perf-gate'

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

describe('perfTier — 3티어 (앰비언트 상한 게이트)', () => {
  const UNKNOWN: PerfSignals = { deviceMemoryGb: null, hardwareConcurrency: null, avgFps: null, mobile: null }
  const at = (s: Partial<PerfSignals>): PerfTier => perfTier({ ...UNKNOWN, ...s })

  it('확정 기준값: 코어 4 이하가 저사양', () => {
    expect(LOW_CONCURRENCY).toBe(4)
  })

  describe('low — 근거가 하나라도 있으면 내린다', () => {
    it.each<[string, Partial<PerfSignals>]>([
      ['메모리 2GB', { deviceMemoryGb: 2 }],
      ['코어 4개', { hardwareConcurrency: 4 }],
      ['코어 2개', { hardwareConcurrency: 2 }],
      ['30fps', { avgFps: 30 }],
      ['고성능 신호와 섞여도 저사양 근거 우선', { deviceMemoryGb: 16, hardwareConcurrency: 2, mobile: false }],
    ])('%s → low', (_label, signals) => {
      expect(at(signals)).toBe('low')
    })
  })

  it('mid — 저사양 근거는 없고 모바일일 때만', () => {
    expect(at({ deviceMemoryGb: 8, hardwareConcurrency: 8, avgFps: 60, mobile: true })).toBe('mid')
    expect(at({ mobile: true })).toBe('mid')
  })

  it('high — 데스크톱, 그리고 모바일 여부를 모를 때(근거 없이 낮추지 않는다)', () => {
    expect(at({ deviceMemoryGb: 8, hardwareConcurrency: 8, avgFps: 60, mobile: false })).toBe('high')
    expect(at({})).toBe('high')
    expect(at({ mobile: null })).toBe('high')
  })

  it('경계값 — 기준 «미만/이하» 일 때만 low', () => {
    expect(at({ deviceMemoryGb: LITE_MEMORY_GB })).toBe('high')
    expect(at({ deviceMemoryGb: 3.99 })).toBe('low')
    expect(at({ avgFps: LITE_FPS })).toBe('high')
    expect(at({ avgFps: 44.9 })).toBe('low')
    expect(at({ hardwareConcurrency: LOW_CONCURRENCY })).toBe('low')
    expect(at({ hardwareConcurrency: 5 })).toBe('high')
  })

  it('쓰레기 측정값은 미측정과 동일 취급', () => {
    for (const junk of [Number.NaN, Infinity, -Infinity, 0, -1]) {
      expect(at({ deviceMemoryGb: junk, hardwareConcurrency: junk, avgFps: junk })).toBe('high')
      expect(at({ deviceMemoryGb: junk, avgFps: 30 })).toBe('low')
    }
  })

  it('결정론 — 같은 입력 같은 결과', () => {
    const s: PerfSignals = { deviceMemoryGb: 4, hardwareConcurrency: 6, avgFps: 55, mobile: true }
    expect(perfTier(s)).toBe(perfTier(s))
  })
})

describe('2티어 ↔ 3티어 하위호환', () => {
  it('lite ⇔ low · full ⇒ high', () => {
    const lite: EffectsTier = toEffectsTier('low')
    const low: PerfTier = fromEffectsTier('lite')
    expect(lite).toBe('lite')
    expect(low).toBe('low')
    expect(toEffectsTier('mid')).toBe('full')
    expect(toEffectsTier('high')).toBe('full')
    expect(fromEffectsTier('full')).toBe('high')
  })

  it('lite 는 왕복해도 lite (ShrineRoomClient 가 쓰는 기존 경로 보존)', () => {
    expect(toEffectsTier(fromEffectsTier('lite'))).toBe('lite')
    expect(toEffectsTier(fromEffectsTier('full'))).toBe('full')
  })

  it('같은 신호(메모리·fps)만 주면 두 판정이 일치한다 — 신규 신호가 없을 때 회귀 0', () => {
    const cases: Array<[number | null, number | null]> = [
      [8, 60],
      [2, 60],
      [8, 30],
      [2, 30],
      [null, null],
      [4, 45],
      [3.99, null],
      [null, 44.9],
    ]
    for (const [memory, fps] of cases) {
      const tier = perfTier({ deviceMemoryGb: memory, hardwareConcurrency: null, avgFps: fps, mobile: null })
      expect(toEffectsTier(tier)).toBe(effectsTier(memory, fps))
    }
  })
})
