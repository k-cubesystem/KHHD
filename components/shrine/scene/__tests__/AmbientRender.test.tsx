import { render } from '@testing-library/react'
import {
  AMBIENT_CANVAS_KINDS,
  AMBIENT_CSS_KINDS,
  AMBIENT_EMIT_MIN_MS,
  AmbientBackdrop,
  ambientEmitPlan,
} from '../AmbientBackdrop'
import { Moonlight, SeasonalMark } from '../SkyOmens'
import {
  SEASONAL_AMBIENT,
  THEME_AMBIENT,
  ambientForTier,
  withSeasonal,
  type AmbientParticle,
  type AmbientTier,
} from '@/lib/domain/shrine/theme-ambient'
import { SEASONAL_EVENT_KEYS } from '@/lib/domain/shrine/seasonal'
import { SHRINE_ANIM_CLASSES } from '@/lib/domain/shrine/anim-audit'

/**
 * 「스펙에 적혀 있는데 화면에 닿지 않는다」를 막는 대조.
 *
 * 이 파일이 있는 이유: 샘굿 스펙은 낙수 파티클 16알을 적고 있었지만 그 종(drip)에는 렌더 경로가
 * 없었다 — 타입도 통과, 도메인 테스트도 초록, 콘솔도 조용. 시범 3테마만 켜져 있어서 확산 전까지
 * 아무도 몰랐다. 값이 맞는지가 아니라 **그 값이 DOM/캔버스에 닿는지**를 여기서 본다.
 */

const TIERS: readonly AmbientTier[] = ['low', 'mid', 'high']
const THEMES = Object.keys(THEME_AMBIENT)

/** 스펙에 실제로 쓰인 (종, 엔진) 짝 전부 — 테마 + 절기 */
function usedPairs(): Array<{ kind: AmbientParticle['kind']; engine: AmbientParticle['engine'] }> {
  const out: Array<{ kind: AmbientParticle['kind']; engine: AmbientParticle['engine'] }> = []
  for (const code of THEMES) for (const p of THEME_AMBIENT[code].particles ?? []) out.push({ ...p })
  for (const key of SEASONAL_EVENT_KEYS) for (const p of SEASONAL_AMBIENT[key].particles ?? []) out.push({ ...p })
  return out
}

describe('파티클 종 → 렌더 경로 (16테마 + 5절기 전수)', () => {
  it('css 로 적힌 종은 전부 CSS 스타일을 갖는다', () => {
    for (const p of usedPairs()) {
      if (p.engine !== 'css') continue
      expect(AMBIENT_CSS_KINDS).toContain(p.kind)
    }
  })

  it('canvas 로 적힌 종은 전부 EffectsCanvas 종에 매핑된다 (구 drip 사고 재발 차단)', () => {
    for (const p of usedPairs()) {
      if (p.engine !== 'canvas') continue
      expect(AMBIENT_CANVAS_KINDS).toContain(p.kind)
    }
  })

  it('css 종의 애니 클래스가 연출 계측 목록에 전부 등록돼 있다 (죽어도 아무도 모르는 층 금지)', () => {
    for (const kind of AMBIENT_CSS_KINDS) {
      expect(SHRINE_ANIM_CLASSES).toContain(`shrine-amb-${kind}`)
    }
  })
})

describe('ambientEmitPlan — 캔버스 이미터 계획', () => {
  it('캔버스 파티클을 든 테마는 mid 티어에서 반드시 이미터가 선다 (계획이 비면 한 알도 안 난다)', () => {
    for (const code of THEMES) {
      const hasCanvas = (THEME_AMBIENT[code].particles ?? []).some((p) => p.engine === 'canvas')
      const plan = ambientEmitPlan(ambientForTier(THEME_AMBIENT[code], 'mid'))
      expect(plan.length > 0).toBe(hasCanvas)
    }
  })

  it('절기가 붙으면 이미터가 줄지 않는다', () => {
    for (const code of THEMES) {
      const base = ambientEmitPlan(ambientForTier(THEME_AMBIENT[code], 'high')).length
      for (const key of SEASONAL_EVENT_KEYS) {
        const merged = ambientEmitPlan(ambientForTier(withSeasonal(THEME_AMBIENT[code], key), 'high')).length
        expect(merged).toBeGreaterThanOrEqual(base)
      }
    }
  })

  it('간격은 하한 이상 · 좌표는 무대 0~100% 안 · 전부 유한', () => {
    for (const code of THEMES) {
      for (const key of [null, ...SEASONAL_EVENT_KEYS] as const) {
        for (const tier of TIERS) {
          for (const e of ambientEmitPlan(ambientForTier(withSeasonal(THEME_AMBIENT[code], key), tier))) {
            expect(e.intervalMs).toBeGreaterThanOrEqual(AMBIENT_EMIT_MIN_MS)
            expect(Number.isFinite(e.intervalMs)).toBe(true)
            expect(e.x).toBeGreaterThanOrEqual(0)
            expect(e.x).toBeLessThanOrEqual(100)
            expect(e.y).toBeGreaterThanOrEqual(0)
            expect(e.y).toBeLessThanOrEqual(100)
          }
        }
      }
    }
  })
})

describe('AmbientBackdrop — 16테마 실렌더', () => {
  it('전 테마 × 전 티어에서 DOM 노드 수가 티어 css 예산과 정확히 맞는다', () => {
    for (const code of THEMES) {
      for (const tier of TIERS) {
        const spec = ambientForTier(THEME_AMBIENT[code], tier)
        const { container, unmount } = render(<AmbientBackdrop spec={spec} />)
        const expected = (spec.particles ?? [])
          .filter((p) => p.engine === 'css')
          .reduce((sum, p) => sum + p.count[0], 0)
        expect(container.querySelectorAll('span[class*="shrine-amb-"]')).toHaveLength(expected)
        expect(container.querySelectorAll('.shrine-amb-back')).toHaveLength(spec.backdrop?.length ?? 0)
        expect(container.querySelectorAll('.shrine-amb-glow')).toHaveLength(spec.glows?.length ?? 0)
        unmount()
      }
    }
  })

  it('층 전체가 비배치 — pointer-events 를 먹지 않는다 (배치 드래그 보호)', () => {
    const { container } = render(<AmbientBackdrop spec={ambientForTier(THEME_AMBIENT.daljip, 'high')} />)
    expect(container.firstElementChild?.className).toContain('pointer-events-none')
  })

  it('결정론 — 같은 스펙을 두 번 그리면 마크업이 바이트까지 같다 (SSR·클라 불일치 0)', () => {
    for (const code of THEMES) {
      const spec = ambientForTier(THEME_AMBIENT[code], 'high')
      const a = render(<AmbientBackdrop spec={spec} />)
      const first = a.container.innerHTML
      a.unmount()
      const b = render(<AmbientBackdrop spec={spec} />)
      expect(b.container.innerHTML).toBe(first)
      b.unmount()
    }
  })
})

describe('Moonlight — 달빛 겹', () => {
  it('opacity 0 이면 DOM 에 아무것도 남기지 않는다 (낮 = 원화 픽셀 동일)', () => {
    const { container } = render(<Moonlight opacity={0} />)
    expect(container.innerHTML).toBe('')
  })

  it('비유한·음수도 그리지 않는다', () => {
    for (const v of [Number.NaN, -0.2, -1]) {
      const { container, unmount } = render(<Moonlight opacity={v} />)
      expect(container.innerHTML).toBe('')
      unmount()
    }
  })

  it('짙기가 있으면 클래스·비배치·인라인 opacity 만 실린다 (그라디언트는 CSS 고정값)', () => {
    const { container } = render(<Moonlight opacity={0.24} roundClassName=" rounded-[17px]" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('shrine-moonlight')
    expect(el.className).toContain('pointer-events-none')
    expect(el.className).toContain('rounded-[17px]')
    expect(el.style.opacity).toBe('0.24')
    expect(el.style.background).toBe('')
  })

  it('결정론 — 같은 짙기면 같은 마크업', () => {
    const a = render(<Moonlight opacity={0.13} />)
    const first = a.container.innerHTML
    a.unmount()
    const b = render(<Moonlight opacity={0.13} />)
    expect(b.container.innerHTML).toBe(first)
    b.unmount()
  })
})

describe('SeasonalMark — 절기 현판', () => {
  it('절기가 없으면 미렌더 — 1년의 350일은 DOM 에 흔적이 없다', () => {
    const { container } = render(<SeasonalMark event={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('절기 5종 라벨이 그대로 읽히고 비배치다', () => {
    for (const key of SEASONAL_EVENT_KEYS) {
      const { container, unmount } = render(<SeasonalMark event={{ key, label: `라벨-${key}` }} />)
      expect(container.textContent).toBe(`라벨-${key}`)
      expect(container.firstElementChild?.className).toContain('pointer-events-none')
      unmount()
    }
  })
})
