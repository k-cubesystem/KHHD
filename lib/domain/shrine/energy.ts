/**
 * 신당 기운 엔진 — 순수 함수 (클라이언트·서버 공용, 단위테스트 대상)
 *
 * 총 기운 = 기본 프로필(사주+관상+손금) + Σ(배치 아이템 energy_power) + 오행 공명 보너스(+5)
 * 공명: 같은 오행 아이템 3개가 반경 RESONANCE_RADIUS(%) 내에 모이면 발동
 */

import type { CatalogItem, Element, Placement } from './types'

export const ELEMENTS: readonly Element[] = ['wood', 'fire', 'earth', 'metal', 'water']

export const EL_KO: Record<Element, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }
export const EL_LABEL: Record<Element, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' }
export const EL_COLOR: Record<Element, string> = {
  wood: '#4a7c59',
  fire: '#9e2b2b',
  earth: '#d4a017',
  metal: '#c9a84c',
  water: '#2d5f8a',
}

export const RESONANCE_RADIUS = 22 // % 좌표 유클리드 거리
export const RESONANCE_BONUS = 5
export const ENERGY_MAX = 100

export interface ResonanceHit {
  element: Element
  cx: number
  cy: number
}

export interface EnergyResult {
  energy: Record<Element, number>
  /** 가장 낮은 기운 = 용신(채워야 할 기운) */
  yongsin: Element
  resonant: ResonanceHit[]
}

/** 같은 오행 3개가 반경 내 모인 조합 탐지. 오행당 최초 1조합만 반환. */
export function detectResonance(placements: Placement[], catalogById: Map<string, CatalogItem>): ResonanceHit[] {
  const byEl = new Map<Element, Placement[]>()
  for (const p of placements) {
    const el = catalogById.get(p.catalogItemId)?.element
    if (!el) continue
    const arr = byEl.get(el)
    if (arr) arr.push(p)
    else byEl.set(el, [p])
  }

  const hits: ResonanceHit[] = []
  for (const [element, arr] of byEl) {
    if (arr.length < 3) continue
    const found = firstCloseTrio(arr)
    if (found) hits.push({ element, ...found })
  }
  return hits
}

function firstCloseTrio(arr: Placement[]): { cx: number; cy: number } | null {
  for (let i = 0; i < arr.length - 2; i++) {
    for (let j = i + 1; j < arr.length - 1; j++) {
      for (let k = j + 1; k < arr.length; k++) {
        const trio = [arr[i], arr[j], arr[k]]
        const cx = (trio[0].x + trio[1].x + trio[2].x) / 3
        const cy = (trio[0].y + trio[1].y + trio[2].y) / 3
        if (trio.every((p) => Math.hypot(p.x - cx, p.y - cy) < RESONANCE_RADIUS)) {
          return { cx, cy }
        }
      }
    }
  }
  return null
}

/** 기본 프로필 + 배치 + 공명 → 최종 오행 기운 + 용신 */
export function computeEnergy(
  base: Record<Element, number>,
  placements: Placement[],
  catalogById: Map<string, CatalogItem>
): EnergyResult {
  const energy: Record<Element, number> = { ...base }

  for (const p of placements) {
    const item = catalogById.get(p.catalogItemId)
    if (!item?.element) continue
    energy[item.element] = Math.min(ENERGY_MAX, energy[item.element] + item.energyPower)
  }

  const resonant = detectResonance(placements, catalogById)
  for (const hit of resonant) {
    energy[hit.element] = Math.min(ENERGY_MAX, energy[hit.element] + RESONANCE_BONUS)
  }

  let yongsin: Element = ELEMENTS[0]
  for (const el of ELEMENTS) {
    if (energy[el] < energy[yongsin]) yongsin = el
  }

  return { energy, yongsin, resonant }
}

/** placements 배열을 catalog Map으로 빠르게 조회하기 위한 헬퍼 */
export function indexCatalog(catalog: CatalogItem[]): Map<string, CatalogItem> {
  return new Map(catalog.map((c) => [c.id, c]))
}

// ─── 사주 → 기본 기운 프로필 (scene 로드·수호신 자동배정 공용) ──────────────

const HANJA_TO_EL: Record<string, Element> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' }

export const DEFAULT_BASE: Record<Element, number> = { wood: 40, fire: 40, earth: 40, metal: 40, water: 40 }

/** 사주 오행 분포(한자 키) → 기본 기운 + 용신(가장 부족한 기운). 결정론 순수 함수. */
export function deriveBaseFromDistribution(dist: Record<string, number>): {
  base: Record<Element, number>
  yongsin: Element
} {
  const base: Record<Element, number> = { ...DEFAULT_BASE }
  for (const [k, v] of Object.entries(dist)) {
    const el = HANJA_TO_EL[k]
    if (el) base[el] = Math.max(5, Math.min(90, 20 + v * 15))
  }
  let yongsin: Element = 'wood'
  for (const el of ELEMENTS) {
    if (base[el] < base[yongsin]) yongsin = el
  }
  return { base, yongsin }
}
