import {
  MOONLIGHT_ILLUM_FLOOR,
  MOONLIGHT_MAX_OPACITY,
  SEASONAL_AMBIENT,
  THEME_AMBIENT,
  ambientForTier,
  kstCalendarDate,
  kstDayKey,
  moonlightOpacity,
  withSeasonal,
  CANVAS_PARTICLE_TIER_CAP,
  CSS_PARTICLE_KIND_MAX,
  CSS_PARTICLE_STAGE_MAX,
  CSS_PARTICLE_TIER_CAP,
  type AmbientTier,
  type ThemeAmbient,
  type TintProfile,
} from '../theme-ambient'
import { SEASONAL_EVENT_KEYS, type SeasonalEventKey } from '../seasonal'
import { AMBIENT_THEMES } from '@/lib/config/gamefeel'

/**
 * P2 확산(16테마) + P3(달·절기)의 계약 시험.
 *
 * 이 파일이 지키는 것은 «렌더가 조용히 아무것도 안 하는» 경로다. 시범 3테마만 켜져 있던 동안
 * 샘굿의 파티클 종(drip)에는 렌더 경로가 아예 없었고, 스펙·타입·테스트 전부 초록이었는데도
 * 확산 전까지 아무도 몰랐다. 그래서 여기서는 «값이 맞는가» 만큼 «그 값이 화면에 닿는가» 를 본다.
 */

const TIERS: readonly AmbientTier[] = ['low', 'mid', 'high']
const THEMES = Object.keys(THEME_AMBIENT)
const PURE_HOUR = { night: 0, dawn: 6.5, day: 12, dusk: 18.5 } as const
const DAY: TintProfile = { base: 'day', amp: 1, dayAmp: 0 }
const NIGHT: TintProfile = { base: 'night', amp: 0.5, dayAmp: 0.8 }
const TIMELESS: TintProfile = { base: null, amp: 0.4, dayAmp: 0.75 }

function cssTotal(spec: ThemeAmbient): number {
  return (spec.particles ?? []).filter((p) => p.engine === 'css').reduce((sum, p) => sum + p.count[0], 0)
}
function canvasTotal(spec: ThemeAmbient): number {
  return (spec.particles ?? []).filter((p) => p.engine === 'canvas').reduce((sum, p) => sum + p.count[0], 0)
}

describe('AMBIENT_THEMES — 16테마 확산 (P2)', () => {
  it('스펙 모집단과 diff 0 — 스펙만 있고 안 켜진 테마도, 켜졌는데 스펙 없는 테마도 없다', () => {
    expect(AMBIENT_THEMES.slice().sort()).toEqual(THEMES.slice().sort())
    expect(AMBIENT_THEMES).toHaveLength(16)
  })

  it('중복 코드가 없다 (중복은 «켜졌다» 판정에는 무해하지만 목록이 거짓말을 시작한다)', () => {
    expect(new Set(AMBIENT_THEMES).size).toBe(AMBIENT_THEMES.length)
  })

  it('전 테마가 파티클을 최소 1종 든다 — 「공기가 있는 방」이 확산의 목적이다', () => {
    for (const code of THEMES) {
      expect((THEME_AMBIENT[code].particles ?? []).length).toBeGreaterThan(0)
    }
  })
})

describe('moonlightOpacity — 달빛 겹', () => {
  it('낮·새벽·초저녁은 0 — 검수된 원화가 한 픽셀도 안 바뀐다', () => {
    for (const h of [PURE_HOUR.day, PURE_HOUR.dawn, PURE_HOUR.dusk]) {
      expect(moonlightOpacity(h, 1, DAY)).toBe(0)
    }
    for (let h = 8; h <= 16; h += 0.25) expect(moonlightOpacity(h, 1, DAY)).toBe(0)
  })

  it('한밤 보름이 최대치 — 그리고 그 최대치가 상한 상수와 같다', () => {
    expect(moonlightOpacity(PURE_HOUR.night, 1, DAY)).toBe(MOONLIGHT_MAX_OPACITY)
  })

  it('그믐(FLOOR 미만)은 0 — 실낱 조도가 상시 켜진 층이 되지 않는다', () => {
    expect(moonlightOpacity(PURE_HOUR.night, 0, DAY)).toBe(0)
    expect(moonlightOpacity(PURE_HOUR.night, MOONLIGHT_ILLUM_FLOOR - 0.001, DAY)).toBe(0)
    expect(moonlightOpacity(PURE_HOUR.night, MOONLIGHT_ILLUM_FLOOR, DAY)).toBeGreaterThan(0)
  })

  it('조도에 정비례한다', () => {
    const full = moonlightOpacity(PURE_HOUR.night, 1, DAY)
    expect(moonlightOpacity(PURE_HOUR.night, 0.5, DAY)).toBeCloseTo(full * 0.5, 4)
  })

  it('밤 원판 테마도 달빛은 든다 — 밤 틴트만 0 일 뿐 달이 없는 게 아니다', () => {
    expect(moonlightOpacity(PURE_HOUR.night, 1, NIGHT)).toBe(MOONLIGHT_MAX_OPACITY)
  })

  it('무시간 원판(용궁 심해)은 언제나 0 — 하늘이 없는 방에 달빛을 넣지 않는다', () => {
    for (let h = 0; h <= 24; h += 0.5) expect(moonlightOpacity(h, 1, TIMELESS)).toBe(0)
    expect(THEME_AMBIENT.yonggung.tintProfile.base).toBeNull()
  })

  it('해질녘→밤 경계가 연속 (0.01h 간격 최대 변화 0.01 이하)', () => {
    let prev = moonlightOpacity(0, 1, DAY)
    let maxJump = 0
    for (let i = 1; i <= 2400; i++) {
      const cur = moonlightOpacity(i / 100, 1, DAY)
      maxJump = Math.max(maxJump, Math.abs(cur - prev))
      prev = cur
    }
    expect(maxJump).toBeLessThanOrEqual(0.01)
    expect(maxJump).toBeGreaterThan(0)
  })

  it('쓰레기 입력 방어 — 유한한 0~1 만 나간다', () => {
    expect(moonlightOpacity(Number.NaN, 1, DAY)).toBe(moonlightOpacity(0, 1, DAY))
    expect(moonlightOpacity(PURE_HOUR.night, Number.NaN, DAY)).toBe(0)
    expect(moonlightOpacity(PURE_HOUR.night, Infinity, DAY)).toBe(0)
    expect(moonlightOpacity(PURE_HOUR.night, -2, DAY)).toBe(0)
    expect(moonlightOpacity(PURE_HOUR.night, 9, DAY)).toBe(MOONLIGHT_MAX_OPACITY)
  })

  it('결정론 — 같은 입력 같은 결과', () => {
    expect(moonlightOpacity(21.37, 0.83, DAY)).toBe(moonlightOpacity(21.37, 0.83, DAY))
  })
})

describe('SEASONAL_AMBIENT · withSeasonal — 절기 가산 겹', () => {
  it('5대 절기가 모두 있고 도메인 키 집합과 diff 0', () => {
    expect(Object.keys(SEASONAL_AMBIENT).sort()).toEqual(SEASONAL_EVENT_KEYS.slice().sort())
  })

  it('절기가 없으면 **같은 참조** 를 돌려준다 (헛 리렌더 0)', () => {
    const spec = THEME_AMBIENT.banga
    expect(withSeasonal(spec, null)).toBe(spec)
  })

  it('모르는 키는 무시하고 원본 그대로 (인덱스 접근이 undefined 를 감추지 않게)', () => {
    const spec = THEME_AMBIENT.banga
    expect(withSeasonal(spec, 'constructor' as SeasonalEventKey)).toBe(spec)
    expect(withSeasonal(spec, '없는절기' as SeasonalEventKey)).toBe(spec)
  })

  it('입력 불변 — 원본 스펙은 어느 조합에서도 변하지 않는다', () => {
    const before = JSON.stringify(THEME_AMBIENT)
    for (const code of THEMES) for (const key of SEASONAL_EVENT_KEYS) withSeasonal(THEME_AMBIENT[code], key)
    expect(JSON.stringify(THEME_AMBIENT)).toBe(before)
  })

  it('테마 층이 앞·절기 층이 뒤 — 저사양에서 깎이는 쪽이 언제나 절기다', () => {
    const merged = withSeasonal(THEME_AMBIENT.banga, 'chuseok')
    const themeParticles = THEME_AMBIENT.banga.particles ?? []
    expect(merged.particles?.slice(0, themeParticles.length)).toEqual(themeParticles)
    expect(merged.particles?.length).toBe(themeParticles.length + (SEASONAL_AMBIENT.chuseok.particles?.length ?? 0))
  })

  it('tintProfile 은 절기가 건드리지 않는다 — 원판 보호 계약은 테마 것이다', () => {
    for (const code of THEMES) {
      for (const key of SEASONAL_EVENT_KEYS) {
        expect(withSeasonal(THEME_AMBIENT[code], key).tintProfile).toBe(THEME_AMBIENT[code].tintProfile)
      }
    }
  })

  it('합쳐진 글로우 맥동 주기가 전부 다르다 — 같은 박자로 뛰면 기계처럼 보인다', () => {
    for (const code of THEMES) {
      for (const key of SEASONAL_EVENT_KEYS) {
        const pulses = (withSeasonal(THEME_AMBIENT[code], key).glows ?? []).map((g) => g.pulseMs)
        expect(new Set(pulses).size).toBe(pulses.length)
      }
    }
  })

  it('절기 좌표·색·주기도 테마와 같은 방어 규격을 지킨다', () => {
    for (const key of SEASONAL_EVENT_KEYS) {
      const add = SEASONAL_AMBIENT[key]
      const rects = [...(add.backdrop ?? []).map((b) => b.area), ...(add.particles ?? []).map((p) => p.area)]
      for (const r of rects) {
        expect(r.w).toBeGreaterThan(0)
        expect(r.h).toBeGreaterThan(0)
        expect(r.x).toBeGreaterThanOrEqual(0)
        expect(r.y).toBeGreaterThanOrEqual(0)
        expect(r.x + r.w).toBeLessThanOrEqual(100)
        expect(r.y + r.h).toBeLessThanOrEqual(100)
      }
      for (const b of add.backdrop ?? []) expect(b.hue).toMatch(/^#[0-9a-f]{6}$/i)
      for (const g of add.glows ?? []) {
        expect(g.hue).toMatch(/^#[0-9a-f]{6}$/i)
        expect(g.pulseMs).toBeGreaterThanOrEqual(1500)
        expect(g.pulseMs).toBeLessThanOrEqual(12000)
      }
      for (const p of add.particles ?? []) {
        const [low, mid, high] = p.count
        expect(low).toBeLessThanOrEqual(mid)
        expect(mid).toBeLessThanOrEqual(high)
        if (p.engine === 'css') expect(high).toBeLessThanOrEqual(CSS_PARTICLE_KIND_MAX)
      }
    }
  })

  it('전 16테마 × 5절기 × 3티어 — 합쳐도 티어 상한을 절대 넘지 않는다', () => {
    TIERS.forEach((tier, i) => {
      for (const code of THEMES) {
        for (const key of SEASONAL_EVENT_KEYS) {
          const out = ambientForTier(withSeasonal(THEME_AMBIENT[code], key), tier)
          expect(cssTotal(out)).toBeLessThanOrEqual(CSS_PARTICLE_TIER_CAP[i])
          expect(canvasTotal(out)).toBeLessThanOrEqual(CANVAS_PARTICLE_TIER_CAP[i])
        }
      }
    })
  })

  it('high 에서 css 무대 합산이 스펙 표 규율(20) 안 — 절기가 붙어도 DOM 노드가 불어나지 않는다', () => {
    for (const code of THEMES) {
      for (const key of SEASONAL_EVENT_KEYS) {
        expect(cssTotal(ambientForTier(withSeasonal(THEME_AMBIENT[code], key), 'high'))).toBeLessThanOrEqual(
          CSS_PARTICLE_STAGE_MAX
        )
      }
    }
  })

  it('결정론 — 같은 조합 같은 결과', () => {
    expect(ambientForTier(withSeasonal(THEME_AMBIENT.daljip, 'daeboreum'), 'mid')).toEqual(
      ambientForTier(withSeasonal(THEME_AMBIENT.daljip, 'daeboreum'), 'mid')
    )
  })
})

describe('kstCalendarDate · kstDayKey — 달·절기 도메인 입력', () => {
  /** 2026-08-11 00:30 KST = 2026-08-10 15:30 UTC — UTC 로는 전날이다(오프셋을 안 태우면 하루 밀린다) */
  const KST_EARLY = Date.UTC(2026, 7, 10, 15, 30)

  it('UTC 전날 늦은 시각도 KST 로는 그날이다', () => {
    expect(kstCalendarDate(KST_EARLY)).toEqual({ y: 2026, m: 8, d: 11 })
    expect(kstDayKey(KST_EARLY)).toBe('2026-08-11')
  })

  it('KST 자정 직전·직후에서 날짜가 정확히 한 번 넘어간다', () => {
    const beforeMidnight = Date.UTC(2026, 7, 10, 14, 59, 59)
    const afterMidnight = Date.UTC(2026, 7, 10, 15, 0, 0)
    expect(kstDayKey(beforeMidnight)).toBe('2026-08-10')
    expect(kstDayKey(afterMidnight)).toBe('2026-08-11')
  })

  it('같은 날 안에서는 키가 변하지 않는다 — 60초 틱이 헛 판정을 부르지 않는다', () => {
    const base = Date.UTC(2026, 8, 25, 3, 0)
    for (let m = 0; m < 60 * 10; m += 37) {
      expect(kstDayKey(base + m * 60_000)).toBe(kstDayKey(base))
    }
  })

  it('한 자리 월·일은 0 을 채운다 (문자열 비교가 곧 날짜 비교가 되게)', () => {
    // 2026-01-04 12:00 UTC = 같은 날 21:00 KST
    expect(kstDayKey(Date.UTC(2026, 0, 4, 12, 0))).toBe('2026-01-04')
    // 2026-01-04 16:00 UTC = 다음 날 01:00 KST
    expect(kstDayKey(Date.UTC(2026, 0, 4, 16, 0))).toBe('2026-01-05')
  })

  it('비유한 입력도 던지지 않고 유효한 날짜를 돌려준다', () => {
    expect(Number.isFinite(kstCalendarDate(Number.NaN).y)).toBe(true)
    expect(kstDayKey(Number.NaN)).toBe(kstDayKey(0))
  })

  it('결정론 — 같은 epoch 같은 결과', () => {
    expect(kstCalendarDate(KST_EARLY)).toEqual(kstCalendarDate(KST_EARLY))
  })
})

describe('추석 2026-09-25 — P3 출하 기준일 실측', () => {
  it('그날 절기 창이 열려 있고 보름달이다 (달빛 겹이 최대치로 든다)', async () => {
    const { activeSeasonal } = await import('../seasonal')
    const { lunarPhase } = await import('../lunar')
    const date = { y: 2026, m: 9, d: 25 }
    expect(activeSeasonal(date)?.key).toBe('chuseok')
    const moon = lunarPhase(date)
    expect(moon.isFullMoon).toBe(true)
    // 추석 밤 = 보름 + 밤 위상 → 달빛이 상한에 닿는다
    expect(moonlightOpacity(PURE_HOUR.night, moon.illum, DAY)).toBeCloseTo(MOONLIGHT_MAX_OPACITY, 2)
  })
})
