import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  THEME_AMBIENT,
  ambientForTheme,
  ambientForTier,
  resolveParticleCount,
  tintOpacities,
  CANVAS_PARTICLE_TIER_CAP,
  CSS_PARTICLE_KIND_MAX,
  CSS_PARTICLE_STAGE_MAX,
  CSS_PARTICLE_TIER_CAP,
  TINT_V2,
  TINT_V2_CSS_BOOST,
  type AmbientParticle,
  type AmbientTier,
  type ThemeAmbient,
  type TintProfile,
} from '../theme-ambient'
import { phaseWeights } from '../scene-clock'
import geometryJson from '../theme-stage-geometry.json'

const TIERS: readonly AmbientTier[] = ['low', 'mid', 'high']
const THEMES = Object.keys(THEME_AMBIENT)
/** 어느 블렌드 창(경계 ±1h)에도 걸리지 않는 순수 위상 대표 시각 — scene-clock 테스트와 같은 값 */
const PURE_HOUR = { night: 0, dawn: 6.5, day: 12, dusk: 18.5 } as const
const HEX_RE = /^#[0-9a-f]{6}$/i

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function cssTotal(spec: ThemeAmbient, index: 0 | 1 | 2): number {
  return (spec.particles ?? []).filter((p) => p.engine === 'css').reduce((sum, p) => sum + p.count[index], 0)
}

describe('THEME_AMBIENT — 스펙 완전성', () => {
  it('테마 키 집합이 theme-stage-geometry.json themeElements 와 diff 0', () => {
    // 스펙 없는 테마는 «앰비언트 없이 조용히» 렌더되므로 누락은 무증상 회귀가 된다.
    const population = Object.keys(geometryJson.themeElements).sort()
    expect(THEMES.slice().sort()).toEqual(population)
    expect(population).toHaveLength(16)
  })

  it('알려진 테마는 스펙을 돌려주고, 모르는 코드는 null (인덱스 접근이 undefined 를 감추지 않게)', () => {
    expect(ambientForTheme('banga')).toBe(THEME_AMBIENT.banga)
    expect(ambientForTheme('없는테마')).toBeNull()
    expect(ambientForTheme('')).toBeNull()
    expect(ambientForTheme('constructor')).toBeNull()
    expect(ambientForTheme('toString')).toBeNull()
  })

  it('테마마다 tintProfile 은 필수, 원경광·파티클·글로우는 최소 1종 이상 존재', () => {
    for (const code of THEMES) {
      const spec = THEME_AMBIENT[code]
      expect(spec.tintProfile).toBeDefined()
      const layers = (spec.backdrop?.length ?? 0) + (spec.particles?.length ?? 0) + (spec.glows?.length ?? 0)
      expect(layers).toBeGreaterThan(0)
    }
  })
})

describe('THEME_AMBIENT — 색 방어 (stage.ts safeColor 전례)', () => {
  it('전 hue 가 #RRGGBB — CSS 주입 여지 0', () => {
    const hues: string[] = []
    for (const code of THEMES) {
      const spec = THEME_AMBIENT[code]
      for (const b of spec.backdrop ?? []) hues.push(b.hue)
      for (const g of spec.glows ?? []) hues.push(g.hue)
    }
    expect(hues.length).toBeGreaterThan(20)
    for (const hue of hues) expect(hue).toMatch(HEX_RE)
  })
})

describe('THEME_AMBIENT — 성능 예산 (ARCH §6)', () => {
  it('count 는 [low ≤ mid ≤ high] 인 0 이상 정수', () => {
    for (const code of THEMES) {
      for (const p of THEME_AMBIENT[code].particles ?? []) {
        const [low, mid, high] = p.count
        for (const n of p.count) {
          expect(Number.isInteger(n)).toBe(true)
          expect(n).toBeGreaterThanOrEqual(0)
        }
        expect(low).toBeLessThanOrEqual(mid)
        expect(mid).toBeLessThanOrEqual(high)
      }
    }
  })

  it('css 는 종당 12개 · 무대 합산 20개 이하 (high 기준)', () => {
    for (const code of THEMES) {
      const spec = THEME_AMBIENT[code]
      for (const p of spec.particles ?? []) {
        if (p.engine === 'css') expect(p.count[2]).toBeLessThanOrEqual(CSS_PARTICLE_KIND_MAX)
      }
      expect(cssTotal(spec, 2)).toBeLessThanOrEqual(CSS_PARTICLE_STAGE_MAX)
    }
  })

  it('캔버스 파티클은 티어 상한(EffectsCanvas 풀 160) 안', () => {
    for (const code of THEMES) {
      for (const p of THEME_AMBIENT[code].particles ?? []) {
        if (p.engine !== 'canvas') continue
        TIERS.forEach((_tier, i) => expect(p.count[i]).toBeLessThanOrEqual(CANVAS_PARTICLE_TIER_CAP[i]))
      }
    }
  })

  it('area·glow 좌표가 무대 0~100% 박스 안 (월드 320 좌표계 혼입 방지)', () => {
    for (const code of THEMES) {
      const spec = THEME_AMBIENT[code]
      const rects = [...(spec.backdrop ?? []).map((b) => b.area), ...(spec.particles ?? []).map((p) => p.area)]
      for (const r of rects) {
        expect(r.w).toBeGreaterThan(0)
        expect(r.h).toBeGreaterThan(0)
        expect(r.x).toBeGreaterThanOrEqual(0)
        expect(r.y).toBeGreaterThanOrEqual(0)
        expect(r.x + r.w).toBeLessThanOrEqual(100)
        expect(r.y + r.h).toBeLessThanOrEqual(100)
      }
      for (const g of spec.glows ?? []) {
        expect(g.x).toBeGreaterThanOrEqual(0)
        expect(g.x).toBeLessThanOrEqual(100)
        expect(g.y).toBeGreaterThanOrEqual(0)
        expect(g.y).toBeLessThanOrEqual(100)
        expect(g.r).toBeGreaterThan(0)
        // 스트로브(2Hz 이상)는 광과민 위험, 12초 초과는 사람이 못 알아본다
        expect(g.pulseMs).toBeGreaterThanOrEqual(1500)
        expect(g.pulseMs).toBeLessThanOrEqual(12000)
      }
    }
  })

  it('한 테마의 글로우 맥동 주기는 서로 달라야 한다 (동시 맥동은 기계처럼 보인다)', () => {
    for (const code of THEMES) {
      const pulses = (THEME_AMBIENT[code].glows ?? []).map((g) => g.pulseMs)
      expect(new Set(pulses).size).toBe(pulses.length)
    }
  })
})

describe('THEME_AMBIENT — tintProfile 확정값', () => {
  it('amp·dayAmp·ampV1 은 0~1', () => {
    for (const code of THEMES) {
      const { amp, dayAmp, ampV1 } = THEME_AMBIENT[code].tintProfile
      expect(amp).toBeGreaterThan(0)
      expect(amp).toBeLessThanOrEqual(1)
      expect(dayAmp).toBeGreaterThanOrEqual(0)
      expect(dayAmp).toBeLessThanOrEqual(1)
      if (ampV1 !== undefined) {
        expect(ampV1).toBeGreaterThan(0)
        expect(ampV1).toBeLessThanOrEqual(1)
      }
    }
  })

  it('밤 원판 테마는 달집·별밭·연등·도깨비 넷뿐 — v2 에서 amp 0.4→0.5, 주광층은 뮤럴 명도별로 다르다', () => {
    const night = THEMES.filter((c) => THEME_AMBIENT[c].tintProfile.base === 'night')
    expect(night.sort()).toEqual(['byeolbat', 'daljip', 'dokkaebi', 'yeondeung'])
    for (const c of night) expect(THEME_AMBIENT[c].tintProfile.amp).toBe(0.5)
    // dayAmp 는 원화 평균 명도(L*)의 역순으로 준 값이다 — 어두운 방일수록 낮에 더 들어 올린다.
    // 실측 L*: 도깨비 22.7 · 달집 30.6 · 별밭 39.0 · 연등 44.9 (뮤럴 v3 벽, 2026-08-12)
    expect(THEME_AMBIENT.dokkaebi.tintProfile.dayAmp).toBe(0.8)
    expect(THEME_AMBIENT.daljip.tintProfile.dayAmp).toBe(0.8)
    expect(THEME_AMBIENT.byeolbat.tintProfile.dayAmp).toBe(0.85)
    expect(THEME_AMBIENT.yeondeung.tintProfile.dayAmp).toBe(0.9)
  })

  it('홍살=노을 원판 · 용궁=무시간 심해 — 둘 다 주광층으로 낮을 얻는다', () => {
    expect(THEME_AMBIENT.hongsal.tintProfile).toEqual({ base: 'dusk', amp: 0.65, dayAmp: 0.7, ampV1: 0.5 })
    expect(THEME_AMBIENT.yonggung.tintProfile).toEqual({ base: null, amp: 0.4, dayAmp: 0.75, ampV1: 0.3 })
  })

  it('나머지 10테마는 낮 원판(amp 1, dayAmp 0) — 낮 = 원화 픽셀 동일 계약이 여기서 못 박힌다', () => {
    const day = THEMES.filter((c) => THEME_AMBIENT[c].tintProfile.base === 'day')
    expect(day).toHaveLength(10)
    for (const c of day) {
      expect(THEME_AMBIENT[c].tintProfile.amp).toBe(1)
      expect(THEME_AMBIENT[c].tintProfile.dayAmp).toBe(0)
      // 낮 원판은 v2 에서 amp 를 안 올렸으므로 원복용 v1 값이 필요 없다
      expect(THEME_AMBIENT[c].tintProfile.ampV1).toBeUndefined()
    }
  })

  it('원판이 낮이 아닌 6테마는 전부 dayAmp > 0 — 이게 없으면 그 방은 하루 종일 정지한다', () => {
    const nonDay = THEMES.filter((c) => THEME_AMBIENT[c].tintProfile.base !== 'day')
    expect(nonDay.sort()).toEqual(['byeolbat', 'daljip', 'dokkaebi', 'hongsal', 'yeondeung', 'yonggung'])
    for (const c of nonDay) {
      expect(THEME_AMBIENT[c].tintProfile.dayAmp).toBeGreaterThan(0)
      // v2 에서 amp 를 올린 테마는 반드시 원복용 v1 값을 남긴다(레버가 거짓말하지 않도록)
      expect(THEME_AMBIENT[c].tintProfile.ampV1).toBeDefined()
    }
  })
})

describe('tintOpacities — 위상 틴트 opacity', () => {
  const DAY: TintProfile = { base: 'day', amp: 1, dayAmp: 0 }
  const NIGHT: TintProfile = { base: 'night', amp: 0.5, dayAmp: 0.8 }
  const DUSK: TintProfile = { base: 'dusk', amp: 0.65, dayAmp: 0.7 }
  const TIMELESS: TintProfile = { base: null, amp: 0.4, dayAmp: 0.75 }
  const NONE = { dawn: 0, day: 0, dusk: 0, night: 0 }

  it('낮 원판 테마는 낮에 네 층 모두 0 — 검수된 원화가 픽셀 그대로 보인다(v1 계약 유지)', () => {
    for (const code of THEMES) {
      if (THEME_AMBIENT[code].tintProfile.base !== 'day') continue
      expect(tintOpacities(PURE_HOUR.day, THEME_AMBIENT[code].tintProfile)).toEqual(NONE)
    }
    // 블렌드 창 밖의 낮 시간대 전체가 0 이어야 한다(9~16시)
    for (let h = 9; h <= 16; h += 0.25) {
      expect(tintOpacities(h, DAY)).toEqual(NONE)
    }
  })

  it('★ 계약 변경(v2): 낮 원판이 아닌 테마는 낮에 주광층이 뜬다 — 밤 그림이 낮에 밝아진다', () => {
    for (const code of THEMES) {
      const profile = THEME_AMBIENT[code].tintProfile
      const o = tintOpacities(PURE_HOUR.day, profile)
      if (profile.base === 'day') continue
      expect(o.day).toBeGreaterThan(0)
      // 밝히는 층만 뜬다 — 낮에 어둡히는 층이 함께 뜨면 그림이 탁해진다
      expect(o.dawn).toBe(0)
      expect(o.dusk).toBe(0)
      expect(o.night).toBe(0)
    }
    expect(tintOpacities(PURE_HOUR.day, NIGHT)).toEqual({ dawn: 0, day: 0.8, dusk: 0, night: 0 })
    expect(tintOpacities(PURE_HOUR.day, TIMELESS)).toEqual({ dawn: 0, day: 0.75, dusk: 0, night: 0 })
    expect(tintOpacities(PURE_HOUR.day, DUSK)).toEqual({ dawn: 0, day: 0.7, dusk: 0, night: 0 })
  })

  it('낮 원판 테마: 순수 위상에서 그 위상 성분만 1, 주광층은 언제나 0', () => {
    expect(tintOpacities(PURE_HOUR.night, DAY)).toEqual({ dawn: 0, day: 0, dusk: 0, night: 1 })
    expect(tintOpacities(PURE_HOUR.dawn, DAY)).toEqual({ dawn: 1, day: 0, dusk: 0, night: 0 })
    expect(tintOpacities(PURE_HOUR.dusk, DAY)).toEqual({ dawn: 0, day: 0, dusk: 1, night: 0 })
    for (let h = 0; h <= 24; h += 0.1) expect(tintOpacities(h, DAY).day).toBe(0)
  })

  it('🔴 밤 원판 테마: 어느 시각에도 night 성분 0 — 밤 그림에 밤 틴트를 겹치면 방이 새까매진다', () => {
    expect(tintOpacities(PURE_HOUR.night, NIGHT).night).toBe(0)
    for (const code of ['daljip', 'byeolbat', 'yeondeung', 'dokkaebi']) {
      const profile = THEME_AMBIENT[code].tintProfile
      for (let h = 0; h <= 24; h += 0.1) expect(tintOpacities(h, profile).night).toBe(0)
    }
  })

  it('밤 원판 테마의 dawn·dusk 는 살아 있되 amp 만큼만', () => {
    expect(tintOpacities(PURE_HOUR.dawn, NIGHT)).toEqual({ dawn: 0.5, day: 0, dusk: 0, night: 0 })
    expect(tintOpacities(PURE_HOUR.dusk, NIGHT)).toEqual({ dawn: 0, day: 0, dusk: 0.5, night: 0 })
  })

  it('노을 원판 테마(홍살): 석양에 dusk 0, 밤은 amp 만큼', () => {
    expect(tintOpacities(PURE_HOUR.dusk, DUSK).dusk).toBe(0)
    expect(tintOpacities(PURE_HOUR.night, DUSK)).toEqual({ dawn: 0, day: 0, dusk: 0, night: 0.65 })
    for (let h = 17; h <= 19; h += 0.1) expect(tintOpacities(h, DUSK).dusk).toBe(0)
  })

  it('무시간 원판(용궁 심해): 네 위상 모두 살아 있다 — 수면 위 광량이 물속까지 내려온다', () => {
    expect(tintOpacities(PURE_HOUR.night, TIMELESS)).toEqual({ dawn: 0, day: 0, dusk: 0, night: 0.4 })
    expect(tintOpacities(PURE_HOUR.dawn, TIMELESS).dawn).toBe(0.4)
    expect(tintOpacities(PURE_HOUR.dusk, TIMELESS).dusk).toBe(0.4)
    expect(tintOpacities(PURE_HOUR.day, TIMELESS).day).toBe(0.75)
  })

  it('amp 스케일 — 어둡힘 3층은 amp 에, 주광층은 dayAmp 에 정비례', () => {
    for (const h of [0, 6.5, 18.5, 4.5, 19.4]) {
      const full = tintOpacities(h, { base: 'day', amp: 1, dayAmp: 0 })
      const half = tintOpacities(h, { base: 'day', amp: 0.5, dayAmp: 0 })
      expect(half.dawn).toBeCloseTo(full.dawn * 0.5, 4)
      expect(half.dusk).toBeCloseTo(full.dusk * 0.5, 4)
      expect(half.night).toBeCloseTo(full.night * 0.5, 4)
    }
    for (const h of [12, 9.5, 15.75, 8.4]) {
      const full = tintOpacities(h, { base: 'night', amp: 0.5, dayAmp: 1 })
      const half = tintOpacities(h, { base: 'night', amp: 0.5, dayAmp: 0.5 })
      expect(half.day).toBeCloseTo(full.day * 0.5, 4)
    }
    expect(tintOpacities(PURE_HOUR.night, { base: 'day', amp: 0, dayAmp: 0 })).toEqual(NONE)
    expect(tintOpacities(PURE_HOUR.day, { base: 'night', amp: 0.5, dayAmp: 0 })).toEqual(NONE)
  })

  it('🔴 16테마 전부가 하루 동안 실제로 변한다 — 「밤낮이 안 되는 테마」 회귀 게이트', () => {
    // v1 은 밤 원판 4테마·용궁이 하루 종일 최대 진폭 0.4 밖에 못 냈고(그나마 짧은 새벽·해질녘뿐),
    // 낮·밤에는 **아무 층도 뜨지 않아** 화면이 완전히 정지했다. 그게 CEO 가 본 현상이다.
    for (const code of THEMES) {
      const profile = THEME_AMBIENT[code].tintProfile
      const at = (h: number): number => {
        const o = tintOpacities(h, profile)
        // 밝히는 층은 +, 어둡히는 층은 − 로 세어 «그 시각의 밝기 방향» 하나로 압축한다
        return o.day - (o.dawn + o.dusk + o.night)
      }
      const samples = [0, 3, 6.5, 12, 15, 18.5, 21, 23].map(at)
      const span = Math.max(...samples) - Math.min(...samples)
      expect(span).toBeGreaterThanOrEqual(0.5)
      // 낮과 한밤이 서로 다른 방향이어야 «하루» 로 읽힌다
      expect(at(PURE_HOUR.day)).toBeGreaterThan(at(PURE_HOUR.night))
    }
  })

  it('동시에 뜨는 층은 최대 2장 — 전면 승격 레이어 예산(ARCH §6)', () => {
    for (const code of THEMES) {
      const profile = THEME_AMBIENT[code].tintProfile
      for (let i = 0; i <= 2400; i += 3) {
        const o = tintOpacities(i / 100, profile)
        expect([o.dawn, o.day, o.dusk, o.night].filter((v) => v > 0).length).toBeLessThanOrEqual(2)
      }
    }
  })

  it('경계 블렌드가 연속 — 0.01h 간격 최대 변화 0.01 이하 (급점프 = 화면이 튄다)', () => {
    for (const profile of [DAY, NIGHT, DUSK, TIMELESS]) {
      let prev = tintOpacities(0, profile)
      let maxJump = 0
      for (let i = 1; i <= 2400; i++) {
        const cur = tintOpacities(i / 100, profile)
        maxJump = Math.max(
          maxJump,
          Math.abs(cur.dawn - prev.dawn),
          Math.abs(cur.day - prev.day),
          Math.abs(cur.dusk - prev.dusk),
          Math.abs(cur.night - prev.night)
        )
        prev = cur
      }
      expect(maxJump).toBeLessThanOrEqual(0.01)
      expect(maxJump).toBeGreaterThan(0) // 아예 안 변하면 시간층이 죽은 것이다
    }
  })

  it('자정 랩어라운드도 연속 (23.999h ≈ 0.001h)', () => {
    for (const profile of [DAY, NIGHT, DUSK, TIMELESS]) {
      expect(tintOpacities(23.999, profile)).toEqual(tintOpacities(0.001, profile))
    }
  })

  it('전 구간·전 테마에서 0~1 범위, 합은 amp·dayAmp 중 큰 값 이하', () => {
    for (const code of THEMES) {
      const profile = THEME_AMBIENT[code].tintProfile
      const cap = Math.max(profile.amp, profile.dayAmp)
      for (let i = 0; i <= 2400; i += 7) {
        const o = tintOpacities(i / 100, profile)
        const sum = o.dawn + o.day + o.dusk + o.night
        for (const v of [o.dawn, o.day, o.dusk, o.night]) {
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(1)
        }
        expect(sum).toBeLessThanOrEqual(cap + 1e-6)
      }
    }
  })

  it('scene-clock 위상 판정을 그대로 쓴다 — 가중치와 어긋나지 않는다', () => {
    for (const h of [0, 4.5, 5, 6, 7.5, 8, 12, 16.5, 17, 19, 20, 21]) {
      const w = phaseWeights(h)
      const o = tintOpacities(h, { base: 'day', amp: 1, dayAmp: 0 })
      expect(o.dawn).toBeCloseTo(w.dawn, 4)
      expect(o.dusk).toBeCloseTo(w.dusk, 4)
      expect(o.night).toBeCloseTo(w.night, 4)
      // 주광층도 같은 판정을 쓴다 — 위상 경계를 두 번 구현하면 층끼리 다른 시각을 산다
      expect(tintOpacities(h, { base: 'night', amp: 0, dayAmp: 1 }).day).toBeCloseTo(w.day, 4)
    }
  })

  it('쓰레기 입력 방어 — 유한값만 나간다', () => {
    expect(tintOpacities(Number.NaN, DAY)).toEqual(tintOpacities(0, DAY))
    expect(tintOpacities(Infinity, DAY)).toEqual(tintOpacities(0, DAY))
    expect(tintOpacities(25, DAY)).toEqual(tintOpacities(1, DAY))
    expect(tintOpacities(-1, DAY)).toEqual(tintOpacities(23, DAY))
    const junk = (amp: number, dayAmp: number): TintProfile => ({ base: 'day', amp, dayAmp })
    expect(tintOpacities(PURE_HOUR.night, junk(Number.NaN, 0))).toEqual(NONE)
    expect(tintOpacities(PURE_HOUR.night, junk(9, 0))).toEqual({ dawn: 0, day: 0, dusk: 0, night: 1 })
    expect(tintOpacities(PURE_HOUR.night, junk(-3, 0))).toEqual(NONE)
    // 주광층도 같은 방어를 받는다 (base 가 낮이 아닐 때만 뜨므로 밤 원판으로 잰다)
    const dayJunk = (dayAmp: number): TintProfile => ({ base: 'night', amp: 0, dayAmp })
    expect(tintOpacities(PURE_HOUR.day, dayJunk(Number.NaN)).day).toBe(0)
    expect(tintOpacities(PURE_HOUR.day, dayJunk(9)).day).toBe(1)
    expect(tintOpacities(PURE_HOUR.day, dayJunk(-3)).day).toBe(0)
  })

  it('결정론 — 같은 입력 같은 결과', () => {
    expect(tintOpacities(19.37, NIGHT)).toEqual(tintOpacities(19.37, NIGHT))
  })
})

describe('틴트 v2 — CSS 산출물과 원복 레버 정합', () => {
  const css = readFileSync(path.join(process.cwd(), 'app', 'shrine-scene.css'), 'utf8')

  /** v1(2026-08-11) 그라디언트 알파. v2 는 «색은 그대로, 알파만 배수» 라 이 표가 원복의 기준점이다. */
  const V1_ALPHA: Readonly<Record<'dawn' | 'dusk' | 'night', readonly number[]>> = {
    dawn: [0.16, 0.09, 0.03],
    dusk: [0.14, 0.08, 0.03],
    night: [0.3, 0.19, 0.1],
  }

  /**
   * 그 클래스의 **그라디언트 선언 블록**의 알파들. 같은 클래스가 공용 transition 규칙에도
   * 들어 있으므로(첫 매치는 그쪽이다) background 를 든 블록만 고른다.
   */
  function alphasOf(className: string): number[] {
    const blocks = [...css.matchAll(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1])
    const decl = blocks.find((b) => b.includes('background'))
    expect(decl).toBeDefined()
    return [...(decl ?? '').matchAll(/rgba\([^)]*?,\s*([\d.]+)\s*\)/g)].map((m) => Number(m[1]))
  }

  it('🔴 어둡힘 3층 알파가 v1 × TINT_V2_CSS_BOOST 와 정확히 일치 — 어긋나면 원복 레버가 조용히 거짓말한다', () => {
    for (const phase of ['dawn', 'dusk', 'night'] as const) {
      const got = alphasOf(`shrine-tint-${phase}`)
      const want = V1_ALPHA[phase].map((a) => Number((a * TINT_V2_CSS_BOOST[phase]).toFixed(4)))
      expect(got).toHaveLength(want.length)
      got.forEach((a, i) => expect(a).toBeCloseTo(want[i], 4))
    }
  })

  it('주광층 .shrine-tint-day 가 CSS 에 실재하고, 위→아래로 옅어진다(빛은 위에서 든다)', () => {
    // 클래스가 없으면 TimeTint 가 opacity 만 실은 «아무 색도 없는» 투명 div 를 얹는다 = 무증상 사망.
    const alphas = alphasOf('shrine-tint-day')
    expect(alphas.length).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < alphas.length; i++) expect(alphas[i]).toBeLessThan(alphas[i - 1])
    expect(alphas[0]).toBeGreaterThan(0.1)
  })

  it('네 층 모두 크로스페이드 transition 을 받는다 (한 층만 빠지면 그 시간대만 툭 튄다)', () => {
    const rule =
      /\.shrine-tint-dawn,\s*\.shrine-tint-day,\s*\.shrine-tint-dusk,\s*\.shrine-tint-night\s*\{[^}]*transition:\s*opacity/
    expect(rule.test(css)).toBe(true)
  })

  it('원복 레버가 켜져 있다 (내렸으면 v1 화면 — 배포 의도인지 확인하고 이 줄을 고친다)', () => {
    expect(TINT_V2).toBe(true)
  })
})

describe('phaseWeights — 틴트가 소비하는 scene-clock 공용 헬퍼', () => {
  it('순수 위상은 그 위상만 1', () => {
    expect(phaseWeights(PURE_HOUR.day)).toEqual({ dawn: 0, day: 1, dusk: 0, night: 0 })
    expect(phaseWeights(PURE_HOUR.night)).toEqual({ dawn: 0, day: 0, dusk: 0, night: 1 })
  })

  it('경계 정각은 두 위상 0.5씩, 합은 언제나 1', () => {
    expect(phaseWeights(20)).toEqual({ dawn: 0, day: 0, dusk: 0.5, night: 0.5 })
    for (let i = 0; i <= 2400; i += 3) {
      const w = phaseWeights(i / 100)
      expect(w.dawn + w.day + w.dusk + w.night).toBeCloseTo(1, 6)
    }
  })
})

describe('resolveParticleCount — 티어 인덱스 클램프', () => {
  const canvas: AmbientParticle = {
    kind: 'snow',
    engine: 'canvas',
    count: [10, 24, 40],
    area: { x: 0, y: 0, w: 100, h: 55 },
  }
  const css: AmbientParticle = {
    kind: 'mote',
    engine: 'css',
    count: [3, 6, 9],
    area: { x: 0, y: 0, w: 100, h: 50 },
  }

  it('캔버스 밀도 파티클은 티어 값 그대로 (low 도 [0] 값 유지)', () => {
    expect(resolveParticleCount(canvas, 'low')).toBe(10)
    expect(resolveParticleCount(canvas, 'mid')).toBe(24)
    expect(resolveParticleCount(canvas, 'high')).toBe(40)
  })

  it('css 는 low 에서만 절반 내림 — 저사양의 진짜 비용은 DOM 노드 수다', () => {
    expect(resolveParticleCount(css, 'low')).toBe(1) // floor(3/2)
    expect(resolveParticleCount(css, 'mid')).toBe(6)
    expect(resolveParticleCount(css, 'high')).toBe(9)
    expect(resolveParticleCount({ ...css, count: [1, 1, 1] }, 'low')).toBe(0)
  })

  it('종당·티어 상한을 넘겨 적어도 상한에서 잘린다', () => {
    expect(resolveParticleCount({ ...css, count: [0, 99, 99] }, 'high')).toBe(CSS_PARTICLE_KIND_MAX)
    expect(resolveParticleCount({ ...canvas, count: [0, 0, 999] }, 'high')).toBe(CANVAS_PARTICLE_TIER_CAP[2])
    expect(resolveParticleCount({ ...canvas, count: [999, 0, 0] }, 'low')).toBe(CANVAS_PARTICLE_TIER_CAP[0])
  })

  it('음수·소수·비유한도 0 이상 정수로만 나간다', () => {
    expect(resolveParticleCount({ ...canvas, count: [-5, 0, 0] }, 'low')).toBe(0)
    expect(resolveParticleCount({ ...canvas, count: [7.9, 0, 0] }, 'low')).toBe(7)
    expect(resolveParticleCount({ ...canvas, count: [Number.NaN, 0, 0] }, 'low')).toBe(0)
    expect(resolveParticleCount({ ...canvas, count: [Infinity, 0, 0] }, 'low')).toBe(0)
  })
})

describe('ambientForTier — 티어 적용', () => {
  it('count 를 티어 값으로 평탄화한다 (어느 인덱스를 읽어도 같은 값)', () => {
    const seolbit = ambientForTier(THEME_AMBIENT.seolbit, 'mid')
    expect(seolbit.particles?.[0].count).toEqual([24, 24, 24])
    expect(ambientForTier(THEME_AMBIENT.seolbit, 'low').particles?.[0].count).toEqual([10, 10, 10])
    expect(ambientForTier(THEME_AMBIENT.seolbit, 'high').particles?.[0].count).toEqual([40, 40, 40])
  })

  it('low 의 css 는 절반, 같은 스펙의 canvas 는 그대로', () => {
    const daljip = ambientForTier(THEME_AMBIENT.daljip, 'low')
    const ember = daljip.particles?.find((p) => p.engine === 'canvas')
    const firefly = daljip.particles?.find((p) => p.engine === 'css')
    expect(ember?.count[0]).toBe(8)
    expect(firefly?.count[0]).toBe(0) // floor(1/2)
    expect(ambientForTier(THEME_AMBIENT.daljip, 'high').particles?.find((p) => p.engine === 'css')?.count[0]).toBe(3)
  })

  it('입력 불변 — 원본 스펙은 어느 티어에서도 변하지 않는다', () => {
    const before = clone(THEME_AMBIENT)
    for (const code of THEMES) for (const tier of TIERS) ambientForTier(THEME_AMBIENT[code], tier)
    expect(clone(THEME_AMBIENT)).toEqual(before)
  })

  it('중첩 객체까지 새 참조 — 렌더에서 area 를 만져도 스펙이 오염되지 않는다', () => {
    const spec = THEME_AMBIENT.banga
    const out = ambientForTier(spec, 'high')
    expect(out).not.toBe(spec)
    expect(out.tintProfile).not.toBe(spec.tintProfile)
    expect(out.backdrop?.[0]).not.toBe(spec.backdrop?.[0])
    expect(out.backdrop?.[0].area).not.toBe(spec.backdrop?.[0].area)
    expect(out.particles?.[0].area).not.toBe(spec.particles?.[0].area)
    expect(out.glows?.[0]).not.toBe(spec.glows?.[0])
    expect(out.tintProfile).toEqual(spec.tintProfile)
  })

  it('없는 층은 키 자체를 만들지 않는다 (undefined 키 유입 금지)', () => {
    const bare: ThemeAmbient = { tintProfile: { base: 'day', amp: 1, dayAmp: 0 } }
    const out = ambientForTier(bare, 'high')
    expect(Object.keys(out)).toEqual(['tintProfile'])
  })

  it('무대 합산 상한 — 스펙 순서대로 예산을 소진하고 초과분은 0', () => {
    const heavy: ThemeAmbient = {
      tintProfile: { base: 'day', amp: 1, dayAmp: 0 },
      particles: Array.from({ length: 5 }, () => ({
        kind: 'mote' as const,
        engine: 'css' as const,
        count: [12, 12, 12] as [number, number, number],
        area: { x: 0, y: 0, w: 100, h: 50 },
      })),
    }
    const out = ambientForTier(heavy, 'high')
    expect(out.particles?.map((p) => p.count[0])).toEqual([12, 12, 12, 12, 2]) // 합 50 = CSS_PARTICLE_TIER_CAP.high
    expect(cssTotal(out, 0)).toBe(CSS_PARTICLE_TIER_CAP[2])
  })

  it('전 16테마 × 3티어 — 티어 상한을 절대 넘지 않는다', () => {
    TIERS.forEach((tier, i) => {
      for (const code of THEMES) {
        const out = ambientForTier(THEME_AMBIENT[code], tier)
        const css = cssTotal(out, 0)
        const canvas = (out.particles ?? [])
          .filter((p) => p.engine === 'canvas')
          .reduce((sum, p) => sum + p.count[0], 0)
        expect(css).toBeLessThanOrEqual(CSS_PARTICLE_TIER_CAP[i])
        expect(canvas).toBeLessThanOrEqual(CANVAS_PARTICLE_TIER_CAP[i])
      }
    })
  })

  it('티어가 낮을수록 파티클이 늘지 않는다 (단조성)', () => {
    for (const code of THEMES) {
      const total = (tier: AmbientTier): number =>
        (ambientForTier(THEME_AMBIENT[code], tier).particles ?? []).reduce((s, p) => s + p.count[0], 0)
      expect(total('low')).toBeLessThanOrEqual(total('mid'))
      expect(total('mid')).toBeLessThanOrEqual(total('high'))
    }
  })

  it('결정론 — 같은 입력 같은 결과', () => {
    expect(ambientForTier(THEME_AMBIENT.yonggung, 'mid')).toEqual(ambientForTier(THEME_AMBIENT.yonggung, 'mid'))
  })
})
