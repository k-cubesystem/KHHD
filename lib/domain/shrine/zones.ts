/**
 * 미니룸 배치 존 규격 — 무대 % 좌표 (x,y: 0~100)
 * 아이템은 placement_layer가 허용하는 존 안에만 배치 가능 (드래그 시 클램프)
 */

import type { Layer } from './types'

export interface ZoneRange {
  x: [number, number]
  y: [number, number]
}

export const ZONES: Record<Layer, ZoneRange> = {
  hanging: { x: [8, 92], y: [8, 20] },
  wall: { x: [8, 92], y: [23, 42] },
  /**
   * 제단. 안2.3 에서 제단이 2단(단상+상판)이 되면서 상판 상면이 내려갔다 —
   * 종전 하한 42 는 이제 **상판 뒤 허공**이라 거기 놓인 공물이 상에 가려 보이지 않는다
   * (라이브 실측: altar 배치 14건 중 3건이 42~48 구간에 있었고 전부 가려진 상태였다).
   * 그래서 하한을 48 로 올린다 — 되돌리는 것이 아니라 이미 깨져 있던 배치를 상 앞으로 꺼내는 것이다.
   * 상한 54→56 은 여유다: 시드 상판 앵커가 53.6 이라 종전에는 0.4%p 밖에 남지 않아
   * 상판을 조금만 더 내려도 앵커가 존 밖으로 나가 **영구 도달 불가**가 됐다(banga-wide-seed 계약).
   *
   * ⚠️ 저장 시에만 클램프한다(조회는 안 한다) — 42~48 배치는 다음 저장 때 48 로 올라온다.
   */
  altar: { x: [24, 76], y: [48, 56] },
  floor: { x: [8, 92], y: [64, 90] },
}

export const ZONE_LABEL: Record<Layer, string> = {
  hanging: '매달기',
  wall: '벽',
  altar: '제단',
  floor: '바닥',
}

export function clampPct(v: number, range: [number, number]): number {
  return Math.min(range[1], Math.max(range[0], v))
}

/** 새 아이템을 존 중앙 부근에 놓을 초기 좌표 (겹침 완화용 랜덤 지터) */
export function initialSpot(layer: Layer, jitter: number): { x: number; y: number } {
  const z = ZONES[layer]
  const midX = (z.x[0] + z.x[1]) / 2
  const spanX = (z.x[1] - z.x[0]) / 2 - 6
  return {
    x: clampPct(midX + (jitter - 0.5) * spanX, z.x),
    y: (z.y[0] + z.y[1]) / 2,
  }
}

/** 신당지기 미니미 위치 (건네기 판정 기준점) */
export const KEEPER_POS = { x: 12, y: 61 }
export const KEEPER_GIVE_RADIUS = 15
