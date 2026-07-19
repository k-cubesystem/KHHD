import { ELEMENTS } from './energy'
import type { Element } from './types'

export interface EnergyMapEntry {
  /** 'self' 또는 family_members.id */
  targetId: string
  name: string
  relation: string
  /** 오행 정령 아바타 키 (family_members.avatar_id). 본인·미설정은 null */
  avatarId: string | null
  hasShrine: boolean
  itemCount: number
  deityName: string | null
  energy: Record<Element, number>
  /** 가장 부족한 기운 (채워야 할 것) */
  yongsin: Element
  /** 가장 넘치는 기운 (남에게 나눠줄 수 있는 것) */
  strongest: Element
}

/** A 가 넘치는 기운으로 B 의 부족을 메워줄 수 있는 관계 */
export interface Complement {
  fromId: string
  fromName: string
  toId: string
  toName: string
  element: Element
}

export interface FamilyEnergyMap {
  entries: EnergyMapEntry[]
  average: Record<Element, number>
  /** 가족 전체 평균에서 가장 부족한 기운 */
  familyYongsin: Element
  complements: Complement[]
}

export function lowestElement(energy: Record<Element, number>): Element {
  let low: Element = ELEMENTS[0]
  for (const el of ELEMENTS) if (energy[el] < energy[low]) low = el
  return low
}

export function highestElement(energy: Record<Element, number>): Element {
  let high: Element = ELEMENTS[0]
  for (const el of ELEMENTS) if (energy[el] > energy[high]) high = el
  return high
}

/** 구성원 평균 오행 — 가족 전체의 기운 균형 */
export function averageEnergy(entries: EnergyMapEntry[]): Record<Element, number> {
  const sum: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  if (entries.length === 0) return sum
  for (const e of entries) for (const el of ELEMENTS) sum[el] += e.energy[el]
  for (const el of ELEMENTS) sum[el] = Math.round(sum[el] / entries.length)
  return sum
}

/** 보완 관계 최소 격차 — 이보다 작으면 "메워준다"고 부르기 민망하다 */
export const COMPLEMENT_MIN_GAP = 15

/**
 * 서로의 기운을 메워주는 짝을 찾는다.
 * A 의 최강 기운이 B 의 최약 기운과 같고, 그 격차가 충분할 때만 성립.
 */
export function findComplements(entries: EnergyMapEntry[]): Complement[] {
  const out: Complement[] = []
  for (const giver of entries) {
    for (const taker of entries) {
      if (giver.targetId === taker.targetId) continue
      if (giver.strongest !== taker.yongsin) continue
      const gap = giver.energy[giver.strongest] - taker.energy[taker.yongsin]
      if (gap < COMPLEMENT_MIN_GAP) continue
      out.push({
        fromId: giver.targetId,
        fromName: giver.name,
        toId: taker.targetId,
        toName: taker.name,
        element: giver.strongest,
      })
    }
  }
  return out
}

export function buildEnergyMap(entries: EnergyMapEntry[]): FamilyEnergyMap {
  const average = averageEnergy(entries)
  return {
    entries,
    average,
    familyYongsin: lowestElement(average),
    complements: findComplements(entries),
  }
}
