/**
 * 오각형(오행) 그래프 기하 — 순수 함수. SVG 는 components/family/element-radar.tsx 가 그린다.
 *
 * 축은 상생 순(木→火→土→金→水)으로 시계 방향, 木이 맨 위. 반지름은 비율(합 100)의 40% 를 가득으로 본다 —
 * 균형(20%)이 절반 지점이라 «둥근 오각형 = 고른 기운»으로 읽힌다.
 */
import type { Element } from '@/lib/domain/shrine/types'

export const RADAR_AXES: readonly Element[] = ['wood', 'fire', 'earth', 'metal', 'water']

/** 가득(반지름 100%)으로 보는 비율. 40% 를 넘는 오행은 가장자리에 붙는다. */
export const RADAR_MAX_SHARE = 40
/** 0% 도 점이 중심에 붙지 않게 최소 반지름 비율. */
export const RADAR_MIN_RATIO = 0.05

export interface RadarPoint {
  x: number
  y: number
}

/** i번째 축의 각도(라디안). 0번(木)이 위(-90°). */
export function axisAngle(index: number): number {
  return -Math.PI / 2 + (index * 2 * Math.PI) / RADAR_AXES.length
}

export function pointAt(index: number, radius: number, cx: number, cy: number): RadarPoint {
  const a = axisAngle(index)
  return { x: round(cx + radius * Math.cos(a)), y: round(cy + radius * Math.sin(a)) }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}

/** 비율 → 다섯 꼭짓점. */
export function radarPoints(
  share: Record<Element, number>,
  radius: number,
  cx: number,
  cy: number,
  max: number = RADAR_MAX_SHARE
): RadarPoint[] {
  return RADAR_AXES.map((el, i) => {
    const ratio = Math.max(RADAR_MIN_RATIO, Math.min(1, share[el] / max))
    return pointAt(i, radius * ratio, cx, cy)
  })
}

/** 가득 찬 오각형(눈금 고리). ratio 로 안쪽 고리도 만든다. */
export function ringPoints(radius: number, cx: number, cy: number, ratio: number = 1): RadarPoint[] {
  return RADAR_AXES.map((_, i) => pointAt(i, radius * ratio, cx, cy))
}

export function polygonAttr(points: readonly RadarPoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ')
}
