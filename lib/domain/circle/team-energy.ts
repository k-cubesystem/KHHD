/**
 * 팀 기운 지도 — 그룹 한 벌의 «전체 균형 · 그 기운을 든 사람 · 서로의 관계 · 역할 결».
 *
 * 순수 함수다. 입력은 액션이 값으로 바꿔 넘긴 사람들(기운 비율·명식 힌트·십성 분포)이고, 출력은 문장과 라벨이다.
 *
 * 🔴 점수를 만들지 않는다. 궁합 엔진(`compatibility-engine.ts`)의 «판정 조건»만 옮기고 점수는 버린다 —
 *    직장 그룹에서 숫자가 생길 여지를 구조적으로 없애는 것이다(PRD-energy-circle §3-6).
 *
 * ── 관계 다섯 라벨 (CEO 2026-09-11 「어떤 기운을 어떻게 채워 주는지 알려 달라」) ──
 * 사람 둘의 «일간 오행»과 «오행 비율»로 방향이 있는 관계를 세운다. 문장은 셋이 한 벌이다:
 *   reason — 어떤 기운이 왜 오가는지(상생·상극·보완의 이치)
 *   how    — 그래서 함께 무엇을 하면 그 기운이 옮아가는지(오늘 할 수 있는 것)
 *   giver/receiver — 누가 누구에게
 */
import type { Element } from '@/lib/domain/shrine/types'
import { EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import { averageEnergy, findComplements, lowestElement, type EnergyHolder } from '@/lib/domain/shrine/energy-map'
import { REMEDY_TABLE, SIPSEONG_GROUPS, type SipseongGroupKey } from '@/lib/domain/remedy/remedy'
import { CONTROLS, ELEMENT_LORE, HANJA_OF, MOTHER_OF } from './element-lore'
import { CIRCLE_KIND_META, type CircleKind } from './circle'

/** 그룹의 한 사람 — 기운 비율(합 100, 지도와 같은 값) + 명식 힌트(없으면 null). */
export interface CircleMemberEnergy extends EnergyHolder {
  relation: string
  avatarId: string | null
  /** 일간 오행 — 「끌어 주는·지켜 줄·거리가 약인 사이」 판정에 쓴다. */
  dayMaster: Element | null
  /** 명식이 채우라 하는 기운(용신). */
  mansikYongsin: Element | null
  /** 명식이 더 채우지 말라 하는 기운(기신). */
  mansikGisin: Element | null
  /** 십성 분포(정관·편관·…) — 역할 결. 없으면 null. */
  sipseong: Record<string, number> | null
}

export type PairLabel = 'complement' | 'lift' | 'guard' | 'distance' | 'independent'

export const PAIR_LABEL_KO: Record<PairLabel, string> = {
  complement: '채워 주는 사이',
  lift: '끌어 주는 사이',
  guard: '지켜 줄 사이',
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
  /** 기운을 주는 쪽·받는 쪽(각자 서는 사이는 null). */
  giverId: string | null
  receiverId: string | null
  /** 어떤 기운이 왜 오가는지 — 숫자 없음. */
  reason: string
  /** 그래서 함께 무엇을 하면 되는지 — 오늘 할 수 있는 한 가지. */
  how: string
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
  /** 그룹 평균 비율(합 100). */
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

/** 비율(합 100)에서 «넘친다»고 부를 수 있는 선 — 균형(20)보다 확실히 두꺼운 값. */
export const STRONG_SHARE = 28

function label(el: Element): string {
  return `${EL_LABEL[el]}(${EL_KO[el]})`
}

/** 그 기운을 «든» 사람 — 넘치는 기운이 그것이고, 그룹 평균보다 넉넉할 때. */
export function holdersOf(entries: readonly CircleMemberEnergy[], element: Element, average: number) {
  return entries
    .filter((e) => e.strongest === element && e.energy[element] > average)
    .map((e) => ({ targetId: e.targetId, name: e.name }))
}

type Directed = Omit<PairRelation, 'aId' | 'aName' | 'bId' | 'bName'>

/** 받는 쪽 x, 주는 쪽 y 로 본 관계 하나. 우선순위: 거리가 약 > 지켜 줄 > 끌어 줌 > 채워 줌. 없으면 null. */
function directed(x: CircleMemberEnergy, y: CircleMemberEnergy): Directed | null {
  const lack = x.yongsin
  const lackLore = ELEMENT_LORE[lack]
  const base = { giverId: y.targetId, receiverId: x.targetId }

  // ① 거리가 약 — 상대 일간이 내 기신이거나, 같은 기운을 둘 다 넘치게 들었을 때(과열).
  const gisinHit = !!y.dayMaster && x.mansikGisin === y.dayMaster
  const crowdHit =
    x.strongest === y.strongest && x.energy[x.strongest] >= STRONG_SHARE && y.energy[y.strongest] >= STRONG_SHARE
  if (gisinHit || crowdHit) {
    const el: Element = gisinHit && y.dayMaster ? y.dayMaster : x.strongest
    const lore = ELEMENT_LORE[el]
    return {
      ...base,
      label: 'distance',
      element: el,
      reason: gisinHit
        ? `${y.name}님의 ${label(el)} 일간은 ${x.name}님에게 이미 넘치는 쪽의 기운입니다. 오래 붙어 있으면 ${lore.excess}이 몰려 ${x.name}님이 지칩니다.`
        : `두 사람 다 ${label(el)} 기운이 두껍습니다. 같이 있으면 그 기운이 한쪽으로 쏠려 ${lore.excess}이 됩니다.`,
      how: `거리를 두라는 말이 아닙니다. 함께 있는 자리에 ${x.name}님의 옅은 ${label(lack)} 기운을 보태는 물건 — ${lackLore.deskItem} — 을 두고, ${REMEDY_TABLE.HOUR_BAND[HANJA_OF[lack]]} 무렵에 만나면 균형이 돌아옵니다.`,
    }
  }

  // ② 지켜 줄 — 상대 일간이 내 옅은 기운을 누른다(상극).
  if (y.dayMaster && CONTROLS[y.dayMaster] === lack) {
    return {
      ...base,
      label: 'guard',
      element: lack,
      reason: `${x.name}님의 옅은 ${label(lack)} 기운을 ${y.name}님의 ${label(y.dayMaster)} 일간이 누릅니다(${EL_KO[y.dayMaster]}克${EL_KO[lack]}). 같이 오래 있으면 ${lackLore.lacking}`,
      how: `${x.name}님 자리에 ${lackLore.deskItem}을 두면 눌리지 않습니다. ${lackLore.together}`,
    }
  }

  // ③ 끌어 줌 — 상대 일간이 내 옅은 기운을 낳거나(상생), 명식이 채우라 하는 기운 그대로일 때.
  if (y.dayMaster && MOTHER_OF[lack] === y.dayMaster) {
    return {
      ...base,
      label: 'lift',
      element: lack,
      reason: `${y.name}님의 ${label(y.dayMaster)} 일간은 ${x.name}님에게 모자란 ${label(lack)} 기운을 낳는 기운입니다(${EL_KO[y.dayMaster]}生${EL_KO[lack]}). 곁에 있으면 ${lackLore.gains}이 붙습니다.`,
      how: `${lackLore.together} — ${y.name}님과 그 시간을 같이 보내면 됩니다.`,
    }
  }
  if (y.dayMaster && x.mansikYongsin === y.dayMaster) {
    const el = y.dayMaster
    return {
      ...base,
      label: 'lift',
      element: el,
      reason: `${y.name}님의 ${label(el)} 일간이 ${x.name}님의 명식이 채우라 하는 기운 그대로입니다. 곁에 있으면 ${x.name}님의 기운이 트입니다.`,
      how: `${ELEMENT_LORE[el].together} — 그 자리에서 ${label(el)} 기운이 옮아갑니다.`,
    }
  }

  // ④ 채워 줌 — 상대의 넘치는 기운이 내 옅은 기운과 같고 격차가 충분할 때(지도와 같은 규칙).
  const comp = findComplements([y, x]).find((c) => c.fromId === y.targetId && c.toId === x.targetId)
  if (comp) {
    const lore = ELEMENT_LORE[comp.element]
    return {
      ...base,
      label: 'complement',
      element: comp.element,
      reason: `${x.name}님은 ${label(comp.element)} 기운이 옅어 ${lore.lacking} ${y.name}님은 그 기운이 넉넉합니다. 같이 있는 자리에서 그 기운이 옮아갑니다.`,
      how: `${lore.together} ${y.name}님 곁에서 ${lore.gains}이 붙고, ${lore.deskItem}을 ${x.name}님 자리에 두면 혼자 있을 때도 이어집니다.`,
    }
  }

  return null
}

const LABEL_RANK: Record<PairLabel, number> = { distance: 0, guard: 1, lift: 2, complement: 3, independent: 4 }

/**
 * 두 사람의 관계 하나 — 양쪽 방향을 다 보고 더 급한 쪽을 고른다.
 * 주의를 먼저 두는 이유: 「같이 있으면 좋다」와 「오래 붙으면 지친다」가 동시에 참일 때, 사람이 먼저 알아야
 * 하는 쪽은 뒤의 것이다. 같은 순위면 a 가 받는 쪽인 것을 고른다(결정론).
 */
export function pairRelation(a: CircleMemberEnergy, b: CircleMemberEnergy): PairRelation {
  const names = { aId: a.targetId, aName: a.name, bId: b.targetId, bName: b.name }
  const ab = directed(a, b)
  const ba = directed(b, a)

  // 양쪽이 서로의 옅은 자리를 메우면 한 문장으로 — 「누가 누구에게」가 아니라 «서로».
  if (ab && ba && ab.label === 'complement' && ba.label === 'complement' && ab.element && ba.element) {
    return {
      ...names,
      label: 'complement',
      element: ab.element,
      giverId: null,
      receiverId: null,
      reason: `서로 채워 주는 사이입니다. ${b.name}님의 넉넉한 ${label(ab.element)} 기운이 ${a.name}님의 옅은 자리를, ${a.name}님의 넉넉한 ${label(ba.element)} 기운이 ${b.name}님의 옅은 자리를 메웁니다.`,
      how: `같이 있는 시간 자체가 처방입니다. ${ELEMENT_LORE[ab.element].together}`,
    }
  }

  const pick = !ab ? ba : !ba ? ab : LABEL_RANK[ba.label] < LABEL_RANK[ab.label] ? ba : ab
  if (pick) return { ...names, ...pick }

  return {
    ...names,
    label: 'independent',
    element: null,
    giverId: null,
    receiverId: null,
    reason: '크게 밀어주거나 빼앗는 기운이 뚜렷하지 않습니다. 각자 서는 사이입니다.',
    how:
      a.yongsin === b.yongsin
        ? `두 사람 다 ${label(a.yongsin)} 기운이 옅습니다. 같이 있을 때 그 기운의 물건 — ${ELEMENT_LORE[a.yongsin].deskItem} — 을 곁에 두면 둘 다 덕을 봅니다.`
        : `${a.name}님은 ${label(a.yongsin)} 기운, ${b.name}님은 ${label(b.yongsin)} 기운이 옅습니다. 각자 그것을 챙기는 편이 낫습니다.`,
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

/** 십성 다섯 무리 합산 → 두꺼운 결·옅은 결. 동수면 선언 순서(결정론). 분포가 하나도 없으면 null. */
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
  for (const p of ce.pairs) out.push(PAIR_LABEL_KO[p.label], p.reason, p.how)
  if (ce.roles) out.push(ce.roles.sentence)
  return out
}
