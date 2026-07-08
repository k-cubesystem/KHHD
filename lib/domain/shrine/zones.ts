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
  altar: { x: [24, 76], y: [42, 54] },
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
