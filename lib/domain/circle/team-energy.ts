/**
 * 팀 기운 지도 — 그룹 한 벌의 «전체 균형 · 그 기운을 든 사람 · 서로의 관계 · 역할 결».
 *
 * 순수 함수다. 입력은 액션이 값으로 바꿔 넘긴 사람들(기운·명식 힌트·십성 분포)이고, 출력은 문장과 라벨이다.
 *
 * 🔴 점수를 만들지 않는다. 궁합 엔진(`compatibility-engine.ts`)의 «판정 조건»만 옮기고 점수는 버린다 —
 *    직장 그룹에서 숫자가 생길 여지를 구조적으로 없애는 것이다(PRD-energy-circle §3-6).
 */
import type { Element } from '@/lib/domain/shrine/types'
import { EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import { averageEnergy, findComplements, lowestElement, type EnergyHolder } from '@/lib/domain/shrine/energy-map'
import { SIPSEONG_GROUPS, type SipseongGroupKey } from '@/lib/domain/remedy/remedy'
import { ELEMENT_LORE } from './element-lore'
import { CIRCLE_KIND_META, type CircleKind } from './circle'

/** 그룹의 한 사람 — 기운(지도와 같은 값) + 명식 힌트(없으면 null). */
export interface CircleMemberEnergy extends EnergyHolder {
  relation: string
  avatarId: string | null
  /** 일간 오행 — 「끌어주는·거리가 약인 사이」 판정에 쓴다. */
  dayMaster: Element | null
  /** 명식이 채우라 하는 기운(용신). */
  mansikYongsin: Element | null
  /** 명식이 더 채우지 말라 하는 기운(기신). */
  mansikGisin: Element | null
  /** 십성 분포(정관·편관·…) — 역할 결. 없으면 null. */
  sipseong: Record<string, number> | null
}

export type PairLabel = 'complement' | 'lift' | 'distance' | 'independent'

export const PAIR_LABEL_KO: Record<PairLabel, string> = {
  complement: '채워 주는 사이',
  lift: '끌어 주는 사이',
  distance: '거리가 약인 사이',
  independent: '각자 서는 사이',
}

export interface PairRelation {
  aId: string
  aName: string
  bId: string
  bName: string
  label: PairLabel
  /** 라벨의 근거 오행(각자 서는 사이는 null). */
  element: Element | null
  /** 화면 문장 — 숫자 없음. */
  reason: string
}

export interface RoleGrain {
  key: SipseongGroupKey
  plain: string
}

export interface CircleRoles {
  thick: RoleGrain
  thin: RoleGrain
  sentence: string
}

export interface CircleEnergy {
  kind: CircleKind
  scoreMode: 'bands' | 'full'
  notice: string | null
  entries: readonly CircleMemberEnergy[]
  average: Record<Element, number>
  /** 그룹 평균에서 가장 옅은 기운 — 함께 채울 것. */
  lowest: Element
  /** 그 기운을 넘치게 든 사람들. 없으면 빈 배열 → 물건으로 채운다. */
  holders: readonly { targetId: string; name: string }[]
  /** 든 사람이 없을 때 물건 한 가지. */
  fallbackItem: string
  pairs: readonly PairRelation[]
  roles: CircleRoles | null
}

function label(el: Element): string {
  return `${EL_LABEL[el]}(${EL_KO[el]})`
}

/** 그 기운을 «든» 사람 — 넘치는 기운이 그것이고, 그룹 평균보다 넉넉할 때. */
export function holdersOf(entries: readonly CircleMemberEnergy[], element: Element, average: number) {
  return entries
    .filter((e) => e.strongest === element && e.energy[element] > average)
    .map((e) => ({ targetId: e.targetId, name: e.name }))
}

/**
 * 두 사람의 관계 하나 — 우선순위: 거리가 약 > 끌어 줌 > 채워 줌 > 각자.
 * 주의를 먼저 두는 이유: 「같이 있으면 좋다」와 「오래 붙으면 지친다」가 동시에 참일 때, 사람이 먼저 알아야
 * 하는 쪽은 뒤의 것이다.
 */
export function pairRelation(a: CircleMemberEnergy, b: CircleMemberEnergy): PairRelation {
  const base = { aId: a.targetId, aName: a.name, bId: b.targetId, bName: b.name }

  // 기신 충돌 — 상대 일간이 내 기신
  if (a.mansikGisin && b.dayMaster === a.mansikGisin) {
    return {
      ...base,
      label: 'distance',
      element: a.mansikGisin,
      reason: `${b.name}님과 오래 붙어 있으면 ${a.name}님이 지칩니다. 적당한 거리가 약입니다.`,
    }
  }
  if (b.mansikGisin && a.dayMaster === b.mansikGisin) {
    return {
      ...base,
      label: 'distance',
      element: b.mansikGisin,
      reason: `${a.name}님과 오래 붙어 있으면 ${b.name}님이 지칩니다. 적당한 거리가 약입니다.`,
    }
  }

  // 용신 조력 — 상대 일간이 내 용신
  if (a.mansikYongsin && b.dayMaster === a.mansikYongsin) {
    return {
      ...base,
      label: 'lift',
      element: a.mansikYongsin,
      reason: `${b.name}님 곁에서 ${a.name}님의 기운이 트입니다. ${b.name}님의 일간이 ${a.name}님이 채울 ${label(a.mansikYongsin)} 기운입니다.`,
    }
  }
  if (b.mansikYongsin && a.dayMaster === b.mansikYongsin) {
    return {
      ...base,
      label: 'lift',
      element: b.mansikYongsin,
      reason: `${a.name}님 곁에서 ${b.name}님의 기운이 트입니다. ${a.name}님의 일간이 ${b.name}님이 채울 ${label(b.mansikYongsin)} 기운입니다.`,
    }
  }

  // 오행 보완 — 지도와 같은 규칙(findComplements)
  const comp = findComplements([a, b])
  if (comp.length > 0) {
    const c = comp[0]
    return {
      ...base,
      label: 'complement',
      element: c.element,
      reason: `${c.fromName}님의 넘치는 ${label(c.element)} 기운이 ${c.toName}님의 모자란 자리를 메웁니다.`,
    }
  }

  return {
    ...base,
    label: 'independent',
    element: null,
    reason: '크게 밀어주거나 빼앗는 기운이 뚜렷하지 않습니다. 각자 서는 사이입니다.',
  }
}

/** 모든 짝 — 입력 순서대로(i<j). 정렬을 바꾸지 않아 같은 그룹은 늘 같은 순서다. */
export function allPairs(entries: readonly CircleMemberEnergy[]): PairRelation[] {
  const out: PairRelation[] = []
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) out.push(pairRelation(entries[i], entries[j]))
  }
  return out
}

/** 십성 다섯 그룹 합산 → 두꺼운 결·옅은 결. 동수면 선언 순서(결정론). 분포가 하나도 없으면 null. */
export function circleRoles(entries: readonly CircleMemberEnergy[]): CircleRoles | null {
  const dists = entries.map((e) => e.sipseong).filter((d): d is Record<string, number> => !!d)
  if (dists.length === 0) return null

  const counts = SIPSEONG_GROUPS.map((group) => ({
    key: group.key,
    plain: group.plain,
    count: dists.reduce((sum, dist) => sum + group.members.reduce((inner, name) => inner + (dist[name] ?? 0), 0), 0),
  }))

  let thick = counts[0]
  let thin = counts[0]
  for (const c of counts) {
    if (c.count > thick.count) thick = c
    if (c.count < thin.count) thin = c
  }

  return {
    thick: { key: thick.key, plain: thick.plain },
    thin: { key: thin.key, plain: thin.plain },
    sentence: `이 그룹은 ${thick.plain}이 두껍고, ${thin.plain}이 옅습니다. 옅은 결은 지금 있는 사람 중 그 결에 가까운 사람과, 그 결을 보태는 물건으로 채웁니다.`,
  }
}

export function buildCircleEnergy(kind: CircleKind, entries: readonly CircleMemberEnergy[]): CircleEnergy {
  const meta = CIRCLE_KIND_META[kind]
  const average = averageEnergy(entries)
  const lowest = lowestElement(average)
  return {
    kind,
    scoreMode: meta.scoreMode,
    notice: meta.notice,
    entries,
    average,
    lowest,
    holders: holdersOf(entries, lowest, average[lowest]),
    fallbackItem: ELEMENT_LORE[lowest].deskItem,
    pairs: allPairs(entries),
    roles: circleRoles(entries),
  }
}

/** 화면 문자열 전량 — 금지어·숫자 검사용. */
export function circleEnergyTexts(ce: CircleEnergy): string[] {
  const out: string[] = [ce.fallbackItem]
  for (const p of ce.pairs) out.push(PAIR_LABEL_KO[p.label], p.reason)
  if (ce.roles) out.push(ce.roles.sentence)
  return out
}
