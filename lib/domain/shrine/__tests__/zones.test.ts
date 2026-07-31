import { ZONES, clampPct, initialSpot } from '../zones'
import type { Layer } from '../types'

/**
 * 배치 자유도 v2 「층은 문법, 위치는 자유」 계약 (부록 P).
 *
 * 핵심은 **무손실**이다: v1 → v2 는 전 축 확장만이라 기존 저장 배치가 다음 저장 때 단 1건도
 * 움직이지 않는다. 여기서 v1 범위를 리터럴로 박아 두고 v2 ⊇ v1 을 강제한다 — 앞으로 누군가
 * 축 하나를 좁히면(선의의 "정리"라도) 이 테스트가 그 순간을 잡는다.
 */

/** v1 존 (2026-07-09 e542d7f ~ 2026-07-31 안2.5) — 라이브 배치 29건이 전부 이 안에 있다. */
const V1: Record<Layer, { x: [number, number]; y: [number, number] }> = {
  hanging: { x: [8, 92], y: [8, 20] },
  wall: { x: [8, 92], y: [23, 42] },
  altar: { x: [24, 76], y: [48, 56] },
  floor: { x: [8, 92], y: [64, 90] },
}

const LAYERS: readonly Layer[] = ['hanging', 'wall', 'altar', 'floor']

describe('ZONES v2 — 무손실 확장 계약', () => {
  it('★ 전 층·전 축이 v1 을 포함한다 (좁아지는 축 = 기존 배치 이동 = 금지)', () => {
    for (const layer of LAYERS) {
      const v1 = V1[layer]
      const v2 = ZONES[layer]
      expect(v2.x[0]).toBeLessThanOrEqual(v1.x[0])
      expect(v2.x[1]).toBeGreaterThanOrEqual(v1.x[1])
      expect(v2.y[0]).toBeLessThanOrEqual(v1.y[0])
      expect(v2.y[1]).toBeGreaterThanOrEqual(v1.y[1])
    }
  })

  it('altar 하한 48 불가침 — 상판 뒤 허공 배치가 되살아나면 안 된다 (안2.5 라이브 실측 3건)', () => {
    expect(ZONES.altar.y[0]).toBe(48)
  })

  it('altar x 는 v1 그대로 — 좁히면 라이브 6건 이동, 넓힐 실익은 앵커·스냅이 담당 (부록 P-2)', () => {
    expect(ZONES.altar.x).toEqual([24, 76])
  })

  it('죽은 띠 소멸 — y 4~96 이 hanging∪wall∪floor 로 빈틈없이 덮인다', () => {
    // v1 의 공백 20~23·42~48·56~64 가 클램프 벽을 만들던 것(진단 D-1)의 회귀 방지.
    // altar 는 상판 전용 층이라 연속성 계산에서 제외해도 성립해야 한다.
    for (let y = 4; y <= 96; y += 0.5) {
      const covered = (['hanging', 'wall', 'floor'] as const).some((l) => y >= ZONES[l].y[0] && y <= ZONES[l].y[1])
      expect(covered).toBe(true)
    }
  })

  it('전 층이 방 안(0~100)에 있다', () => {
    for (const layer of LAYERS) {
      const z = ZONES[layer]
      expect(z.x[0]).toBeGreaterThanOrEqual(0)
      expect(z.x[1]).toBeLessThanOrEqual(100)
      expect(z.y[0]).toBeGreaterThanOrEqual(0)
      expect(z.y[1]).toBeLessThanOrEqual(100)
    }
  })
})

describe('initialSpot — 새 아이템의 첫 자리는 어제와 같다 (HOME_Y 동결)', () => {
  it('층별 기준선 y 가 v1 중점값 그대로다 — 존 확장이 첫 자리를 밀지 않는다', () => {
    // v1 중점: hanging (8+20)/2=14 · wall (23+42)/2=32.5 · altar (48+56)/2=52 · floor (64+90)/2=77
    expect(initialSpot('hanging', 0.5).y).toBe(14)
    expect(initialSpot('wall', 0.5).y).toBe(32.5)
    expect(initialSpot('altar', 0.5).y).toBe(52)
    expect(initialSpot('floor', 0.5).y).toBe(77)
  })

  it('x 는 존 안에 있고 지터가 결정론적이다', () => {
    for (const layer of LAYERS) {
      for (const j of [0, 0.25, 0.5, 0.75, 1]) {
        const a = initialSpot(layer, j)
        const b = initialSpot(layer, j)
        expect(a).toEqual(b)
        expect(a.x).toBeGreaterThanOrEqual(ZONES[layer].x[0])
        expect(a.x).toBeLessThanOrEqual(ZONES[layer].x[1])
      }
    }
  })
})

describe('clampPct — 저장 시 클램프의 단일 출처', () => {
  it('범위 안은 그대로, 밖은 경계로', () => {
    expect(clampPct(50, [4, 96])).toBe(50)
    expect(clampPct(-10, [4, 96])).toBe(4)
    expect(clampPct(200, [4, 96])).toBe(96)
  })
})
