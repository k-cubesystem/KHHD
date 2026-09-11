import type { MemberCategory } from '@/lib/domain/family/member-category'
import { ELEMENTS } from './energy'
import type { Element } from './types'

export interface EnergyMapEntry {
  /** 'self' 또는 family_members.id */
  targetId: string
  name: string
  relation: string
  /** 오행 정령 아바타 키 (family_members.avatar_id). 본인·미설정은 null */
  avatarId: string | null
  /**
   * 인연 갈래 — 가족/지인(2026-08-16).
   * 🔴 지도는 «가족 기운»을 보는 화면이라 기본 비교 대상은 가족이다. 지인은 골라야 들어온다.
   */
  category: MemberCategory
  hasShrine: boolean
  itemCount: number
  deityName: string | null
  /** 타고난 오행 비율(합 100) — 지장간·자리 무게로 낸 세력(element-profile). 지도의 막대. */
  energy: Record<Element, number>
  /** 신당 살림·관상·손금을 얹은 기운을 비율로 — 처방전의 «살림 얹은 기운» 토글. */
  energyLive: Record<Element, number>
  /** 가장 부족한 기운 (채워야 할 것) */
  yongsin: Element
  /** 가장 넘치는 기운 (남에게 나눠줄 수 있는 것) */
  strongest: Element
}

/**
 * 기운을 든 최소 단위 — 보완 짝을 찾는 데 실제로 쓰이는 필드만.
 *
 * 지도(EnergyMapEntry)는 신당 살림까지 반영한 «현재» 기운이고, 허브 배너 요약은 사주만 본
 * «타고난» 기운이다. 둘은 계산 깊이가 다르지만 **짝을 찾는 규칙은 같아야** 하므로
 * findComplements 의 입력을 이 모양으로 좁혀 둘 다 통과시킨다(EnergyMapEntry 가 이를 만족한다).
 */
export interface EnergyHolder {
  targetId: string
  name: string
  energy: Record<Element, number>
  yongsin: Element
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
export function averageEnergy(entries: readonly Pick<EnergyHolder, 'energy'>[]): Record<Element, number> {
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
export function findComplements(entries: readonly EnergyHolder[]): Complement[] {
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

// ─── 허브 배너 요약 ──────────────────────────────────────────────────────────
//
// 허브(사주·궁합)의 「우리 가족 기운 지도」 배너가 쓰는 축약본이다.
//
// 🔴 **지도와 계산 깊이가 다르다.** 지도는 신당 살림·관상·손금까지 얹은 «지금의 기운»이고,
//    배너는 사주만 본 «타고난 기운»이다. 배너에서 전체 계산을 돌리면 허브 첫 화면에서
//    가족 수만큼 신당 배치·카탈로그를 훑게 된다 — 배너 하나가 질 비용이 아니다.
//    그래서 문구도 «타고난» 이라고 적는다. 두 화면이 다른 수를 보이는 것이 아니라
//    **다른 것을 보이는** 것이므로, 라벨이 그 차이를 지고 있어야 한다.

/** 요약을 만들 때 넣는 한 사람 — 기운은 사주에서 유도한 «타고난» 값이다. */
export interface EnergySummarySource {
  targetId: string
  name: string
  avatarId: string | null
  energy: Record<Element, number>
}

/** 배너가 그리는 한 사람 — 넘치는 기운과 부족한 기운만 든다. */
export interface EnergySummaryMember {
  targetId: string
  name: string
  avatarId: string | null
  strongest: Element
  yongsin: Element
  /** 타고난 비율(합 100) — 배너의 오각형 썸네일이 사람마다 선으로 겹친다. */
  energy: Record<Element, number>
}

export interface FamilyEnergySummary {
  /** 본인 포함 견줄 수 있는 사람 수. 2 미만이면 배너는 «가족 등록» 상태로 선다. */
  count: number
  members: readonly EnergySummaryMember[]
  /** 가족 평균에서 가장 부족한 기운 — 온 가족이 함께 채울 것 */
  familyYongsin: Element
  /** 가족 평균 비율(합 100) — 오각형 썸네일의 금색 채움. */
  average: Record<Element, number>
  /** 서로 메워주는 짝 하나(없으면 null). 여럿이면 격차가 가장 큰 짝을 고른다. */
  complement: Complement | null
}

/**
 * 요약 만들기 — 순수 함수다(DB·시각을 보지 않는다).
 * 짝이 여럿이면 **격차가 가장 큰** 하나를 고른다: 배너는 한 줄만 말할 수 있으므로
 * 가장 할 말이 있는 짝이 그 자리를 가져가야 한다.
 */
export function buildFamilyEnergySummary(sources: readonly EnergySummarySource[]): FamilyEnergySummary {
  const holders: EnergyHolder[] = sources.map((s) => ({
    targetId: s.targetId,
    name: s.name,
    energy: s.energy,
    yongsin: lowestElement(s.energy),
    strongest: highestElement(s.energy),
  }))
  const byId = new Map(holders.map((h) => [h.targetId, h]))
  const gap = (c: Complement): number => {
    const from = byId.get(c.fromId)
    const to = byId.get(c.toId)
    if (!from || !to) return 0
    return from.energy[c.element] - to.energy[c.element]
  }
  const complements = findComplements(holders)
  let best: Complement | null = null
  for (const c of complements) if (best === null || gap(c) > gap(best)) best = c
  const average = averageEnergy(holders)

  return {
    count: sources.length,
    members: sources.map((s, i) => ({
      targetId: s.targetId,
      name: s.name,
      avatarId: s.avatarId,
      strongest: holders[i].strongest,
      yongsin: holders[i].yongsin,
      energy: s.energy,
    })),
    familyYongsin: lowestElement(average),
    average,
    complement: best,
  }
}
