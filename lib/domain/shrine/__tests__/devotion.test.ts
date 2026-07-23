import {
  DEVOTION_MAX_LEVEL,
  DEVOTION_THRESHOLDS,
  DEVOTION_REWARDS,
  DEVOTION_LAST_REWARD_LEVEL,
  levelFromDays,
  daysToNextLevel,
  devotionProgress,
  rewardForLevel,
} from '../devotion'

// ── DB 카탈로그 고정 픽스처 (실측 2026-07-24, plzvanxcxjkaazcfrtls) ──
// 보상 트랙의 code 가 실존하는지 고정 검증한다. DB 시드가 바뀌면 이 픽스처도 함께 갱신.
const DB_THEME_CODES = new Set([
  'choga', // 무료(초가) — 보상 제외 대상
  'banga',
  'yonggung',
  'dokkaebi',
  'seolbit',
  'daljip',
  'hongsal',
  'byeolbat',
])
const DB_ITEM_NAMES = new Set([
  '기본 촛불',
  '향로',
  '복 부적',
  '공물 꽃',
  '황금 등불',
  '은풍경',
  '초롱',
  '놋방울',
  '청주',
  '청죽',
  '물항아리',
  '연화방석',
  '기억의 함',
])
// 최초 방문 시 자동 지급되는 스타터킷(scene.ts ensureStarterKit) — 보상으로 쓰면 즉시 '보유 중'이라 제외해야 함
const STARTER_ITEM_NAMES = new Set(['기본 촛불', '초롱', '공물 꽃', '청죽', '은풍경', '놋방울', '물항아리'])

describe('정성 레벨 곡선', () => {
  describe('DEVOTION_THRESHOLDS — 누적 임계값', () => {
    it('길이는 상한 단(20)과 같다', () => {
      expect(DEVOTION_THRESHOLDS).toHaveLength(DEVOTION_MAX_LEVEL)
    })
    it('확정 곡선 [1,2,4,6,9,12,16,20,25,30,36,42,49,56,64,72,81,90,100,110]', () => {
      expect([...DEVOTION_THRESHOLDS]).toEqual([
        1, 2, 4, 6, 9, 12, 16, 20, 25, 30, 36, 42, 49, 56, 64, 72, 81, 90, 100, 110,
      ])
    })
    it('발주서 표본: 1단=1일·2단=2일·3단=4일·4단=6일·5단=9일', () => {
      expect(DEVOTION_THRESHOLDS[0]).toBe(1)
      expect(DEVOTION_THRESHOLDS[1]).toBe(2)
      expect(DEVOTION_THRESHOLDS[2]).toBe(4)
      expect(DEVOTION_THRESHOLDS[3]).toBe(6)
      expect(DEVOTION_THRESHOLDS[4]).toBe(9)
    })
    it('엄격한 오름차순 (승급은 갈수록 완만)', () => {
      for (let i = 1; i < DEVOTION_THRESHOLDS.length; i++) {
        expect(DEVOTION_THRESHOLDS[i]).toBeGreaterThan(DEVOTION_THRESHOLDS[i - 1])
      }
    })
  })

  describe('levelFromDays — 경계값', () => {
    const cases: Array<[number, number]> = [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 2],
      [4, 3],
      [5, 3],
      [6, 4],
      [8, 4],
      [9, 5],
      [11, 5],
      [12, 6],
      [16, 7],
      [20, 8],
      [25, 9],
      [30, 10],
      [42, 12],
      [56, 14],
      [110, 20],
      [200, 20], // 상한 클램프
    ]
    it.each(cases)('days=%s → %s단', (days, expected) => {
      expect(levelFromDays(days)).toBe(expected)
    })

    it('0·음수·소수·비유한 방어', () => {
      expect(levelFromDays(0)).toBe(0)
      expect(levelFromDays(-10)).toBe(0)
      expect(levelFromDays(1.9)).toBe(1) // floor
      expect(levelFromDays(Number.NaN)).toBe(0)
      expect(levelFromDays(Infinity)).toBe(0)
    })
  })

  describe('daysToNextLevel — 역산', () => {
    const cases: Array<[number, number]> = [
      [0, 1], // 0일 → 1단까지 1일
      [1, 1], // 1단(1일) → 2단까지 1일
      [2, 2], // 2단(2일) → 3단(4일)까지 2일
      [6, 3], // 4단(6일) → 5단(9일)까지 3일
      [110, 0], // 최고 단 → 0
      [999, 0],
    ]
    it.each(cases)('days=%s → 남은 %s일', (days, expected) => {
      expect(daysToNextLevel(days)).toBe(expected)
    })
    it('음수 방어', () => {
      expect(daysToNextLevel(-5)).toBe(1)
    })
  })

  describe('devotionProgress — 통합', () => {
    it('0일: 0단, 다음 1단까지 1일', () => {
      const p = devotionProgress(0)
      expect(p).toEqual({ totalDays: 0, level: 0, nextLevel: 1, nextThreshold: 1, daysToNext: 1 })
    })
    it('중간(7일): 4단, 다음 5단(9일)까지 2일', () => {
      const p = devotionProgress(7)
      expect(p.level).toBe(4)
      expect(p.nextLevel).toBe(5)
      expect(p.nextThreshold).toBe(9)
      expect(p.daysToNext).toBe(2)
    })
    it('최고 단(110일): nextLevel null, daysToNext 0', () => {
      const p = devotionProgress(110)
      expect(p.level).toBe(20)
      expect(p.nextLevel).toBeNull()
      expect(p.nextThreshold).toBeNull()
      expect(p.daysToNext).toBe(0)
    })
    it('결정론: 같은 입력 같은 결과', () => {
      expect(devotionProgress(30)).toEqual(devotionProgress(30))
    })
    it('소수 입력 정규화', () => {
      expect(devotionProgress(9.9).totalDays).toBe(9)
      expect(devotionProgress(9.9).level).toBe(5)
    })
  })
})

describe('정성 보상 트랙', () => {
  it('보상 단은 유일하고 오름차순', () => {
    const levels = DEVOTION_REWARDS.map((r) => r.level)
    expect(new Set(levels).size).toBe(levels.length)
    expect([...levels]).toEqual([...levels].sort((a, b) => a - b))
  })

  it('code(테마 code·신물 name)는 유일', () => {
    const codes = DEVOTION_REWARDS.map((r) => r.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('모든 보상 단은 1~상한 범위, qty>=1', () => {
    for (const r of DEVOTION_REWARDS) {
      expect(r.level).toBeGreaterThanOrEqual(1)
      expect(r.level).toBeLessThanOrEqual(DEVOTION_MAX_LEVEL)
      expect(r.qty).toBeGreaterThanOrEqual(1)
    }
  })

  it('모든 테마 보상 code 는 실존(DB 테마 code) & 무료 choga 제외', () => {
    for (const r of DEVOTION_REWARDS.filter((x) => x.kind === 'theme')) {
      expect(DB_THEME_CODES.has(r.code)).toBe(true)
      expect(r.code).not.toBe('choga')
    }
  })

  it('모든 신물 보상 code 는 실존(DB 신물 name) & 스타터킷 지급분 제외', () => {
    for (const r of DEVOTION_REWARDS.filter((x) => x.kind === 'item')) {
      expect(DB_ITEM_NAMES.has(r.code)).toBe(true)
      expect(STARTER_ITEM_NAMES.has(r.code)).toBe(false)
    }
  })

  it('테마·신물 교차 — 두 종류 모두 존재', () => {
    const kinds = new Set(DEVOTION_REWARDS.map((r) => r.kind))
    expect(kinds.has('theme')).toBe(true)
    expect(kinds.has('item')).toBe(true)
  })

  it('프리미엄 별밭(byeolbat)은 최상위권 단(>=9)', () => {
    const byeolbat = DEVOTION_REWARDS.find((r) => r.code === 'byeolbat')
    expect(byeolbat).toBeDefined()
    expect(byeolbat!.level).toBeGreaterThanOrEqual(9)
  })

  it('최고가 신물 기억의 함은 정점(최상위 단)', () => {
    const chest = DEVOTION_REWARDS.find((r) => r.code === '기억의 함')
    expect(chest).toBeDefined()
    expect(chest!.level).toBe(DEVOTION_LAST_REWARD_LEVEL)
    expect(Math.max(...DEVOTION_REWARDS.map((r) => r.level))).toBe(chest!.level)
  })

  it('1단부터 보상 시작', () => {
    expect(rewardForLevel(1)).not.toBeNull()
    expect(Math.min(...DEVOTION_REWARDS.map((r) => r.level))).toBe(1)
  })

  it('rewardForLevel — 걸린 단만 반환, 그 외 null', () => {
    expect(rewardForLevel(1)?.code).toBe('banga')
    expect(rewardForLevel(9)?.code).toBe('byeolbat')
    expect(rewardForLevel(DEVOTION_LAST_REWARD_LEVEL + 1)).toBeNull()
    expect(rewardForLevel(0)).toBeNull()
  })
})
