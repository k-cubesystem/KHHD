/**
 * 기운 처방전 — 사람 한 명의 «모자란 기운 → 왜 → 무엇을 곁에 둘지» 다섯 블록.
 *
 * ① 지금 기운(타고난/지금) ② 모자란 기운의 결 ③ 채워 주는 기운과 이유(직접·낳아줌·사람)
 * ④ 곁에 둘 것 세 층(신당 살림·실물·생활) ⑤ 덜어낼 것.
 *
 * **순수 함수**다. DB·시각·난수를 보지 않는다 — 같은 입력이면 같은 처방이다(remedy.ts 와 같은 규율).
 * 오행 표는 `remedy.ts` 에서 **import** 하고(REMEDY_TABLE·elementRemedies·avoidRemedies),
 * 결의 서술·실물·선물은 `element-lore.ts` 에서 온다. 이 파일은 둘을 **엮기만** 한다.
 *
 * 🔴 «모자란 기운»은 화면의 막대(기운 지도)와 같은 값이어야 한다 — 지도가 「火가 가장 모자라다」고
 *    했는데 처방전이 「土를 채우라」고 하면 사용자는 어느 쪽을 믿을지 모른다. 그래서 lacking 은
 *    타고난 비율(element-profile)의 최저이고, 명식의 용신은 «다를 때만» 한 줄로 따로 말한다(mansikNote).
 */
import type { Element } from '@/lib/domain/shrine/types'
import { EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import { COMPLEMENT_MIN_GAP, highestElement, lowestElement } from '@/lib/domain/shrine/energy-map'
import { avoidRemedies, elementRemedies, REMEDY_TABLE, type RemedyItem } from '@/lib/domain/remedy/remedy'
import { ELEMENT_LORE, HANJA_OF, MOTHER_OF } from './element-lore'

/** 신당 살림 후보 — 카탈로그에서 오행·세기·가격만. */
export interface PrescriptionCatalogItem {
  id: string
  name: string
  element: Element
  energyPower: number
  priceBokchae: number
  emoji: string
  spriteUrl: string | null
}

/** 같은 그룹의 다른 사람 — «사람에게서» 갈래를 세우는 데 쓴다. */
export interface PrescriptionMate {
  targetId: string
  name: string
  strongest: Element
  energy: Record<Element, number>
}

/** 명식(사주 엔진)이 준 용신·희신·기신. 생년월일이 없으면 null. */
export interface MansikHint {
  yongsin: Element | null
  huisin: Element | null
  gisin: Element | null
}

export interface PrescriptionInput {
  targetId: string
  name: string
  /** 타고난 오행 비율(합 100) — 기운 지도의 막대와 같은 값(세력 프로필). */
  energy: Record<Element, number>
  /** 신당 살림·관상·손금을 얹은 기운을 비율로. 없으면 null. */
  energyLive: Record<Element, number> | null
  mansik: MansikHint | null
  catalog: readonly PrescriptionCatalogItem[]
  mates: readonly PrescriptionMate[]
}

export type FillerKind = 'direct' | 'mother' | 'person'

export interface Filler {
  kind: FillerKind
  element: Element
  title: string
  reason: string
  personId?: string
  personName?: string
}

export interface LifeItem {
  label: string
  value: string
  action: string
}

export interface Prescription {
  targetId: string
  name: string
  /** 모자란 기운 — 타고난 비율의 최저(지도와 같은 값). */
  lacking: Element
  /** 넘치는 기운 — 타고난 비율의 최고. */
  strongest: Element
  energy: Record<Element, number>
  energyLive: Record<Element, number> | null
  lore: { lacking: string; gains: string }
  /** 명식의 용신이 lacking 과 다를 때만 — 둘을 나란히 말하는 한 줄. */
  mansikNote: string | null
  /** 명식의 희신이 «낳아 주는 기운»과 다를 때만. */
  sideNote: string | null
  fillers: readonly Filler[]
  /** 같은 기운이 몰리는 사람이 있을 때 — 그 기운을 더 보태지 말라는 한 줄. */
  caution: string | null
  items: {
    shrine: readonly PrescriptionCatalogItem[]
    real: { desk: string; home: string; gifts: readonly string[] }
    life: readonly LifeItem[]
  }
  avoid: { element: Element; items: readonly LifeItem[] }
}

/** 신당 살림은 셋만 — 카드 한 장에 들어가는 수. */
export const SHRINE_PICK = 3

/** 생활 처방으로 고르는 갈래 — 여섯 중 «오늘 몸으로 할 수 있는» 셋. */
export const LIFE_KINDS: readonly RemedyItem['kind'][] = ['direction', 'time', 'body']

function label(el: Element): string {
  return `${EL_LABEL[el]}(${EL_KO[el]})`
}

function toLifeItem(item: RemedyItem): LifeItem {
  return { label: item.label, value: item.value, action: item.action }
}

/**
 * 신당 살림 상위 셋 — 세기 내림차순, 같으면 이름·id 순. 정렬이 흔들리면 같은 사람에게 다른 물건이
 * 나오므로 마지막 키까지 못 박는다.
 */
export function pickShrineItems(
  catalog: readonly PrescriptionCatalogItem[],
  element: Element,
  limit: number = SHRINE_PICK
): PrescriptionCatalogItem[] {
  return catalog
    .filter((item) => item.element === element)
    .slice()
    .sort((a, b) => b.energyPower - a.energyPower || a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id))
    .slice(0, limit)
}

/** 그룹 안에서 그 기운을 가장 넉넉히 든 사람 — 격차가 COMPLEMENT_MIN_GAP 이상일 때만. */
function bestGiver(mates: readonly PrescriptionMate[], element: Element, mine: number): PrescriptionMate | null {
  let best: PrescriptionMate | null = null
  for (const mate of mates) {
    if (mate.strongest !== element) continue
    if (mate.energy[element] - mine < COMPLEMENT_MIN_GAP) continue
    if (best === null || mate.energy[element] > best.energy[element]) best = mate
  }
  return best
}

export function buildPrescription(input: PrescriptionInput): Prescription {
  const lacking = lowestElement(input.energy)
  const strongest = highestElement(input.energy)
  const mother = MOTHER_OF[lacking]
  const lore = ELEMENT_LORE[lacking]
  const mansik = input.mansik

  // 덜어낼 기운 — 명식의 기신이 있으면 그것, 없으면 지금 가장 넘치는 기운.
  const avoidElement: Element = mansik?.gisin && mansik.gisin !== lacking ? mansik.gisin : strongest

  const fillers: Filler[] = [
    {
      kind: 'direct',
      element: lacking,
      title: `${label(lacking)} 기운 그대로`,
      reason: '모자란 것을 그대로 더합니다. 가장 빠르지만, 그 사람 안에 뿌리가 없으면 오래 가지 않습니다.',
    },
    {
      kind: 'mother',
      element: mother,
      title: `${label(mother)} 기운 — ${EL_KO[mother]}生${EL_KO[lacking]}`,
      reason: `${EL_LABEL[mother]} 기운이 ${EL_LABEL[lacking]} 기운을 낳습니다. 낳아 주는 기운은 스스로 자라게 하므로 오래 갑니다.`,
    },
  ]

  const giver = bestGiver(input.mates, lacking, input.energy[lacking])
  if (giver) {
    fillers.push({
      kind: 'person',
      element: lacking,
      title: `${giver.name}님 곁`,
      reason: `물건보다 사람이 큽니다. ${giver.name}님의 넘치는 ${label(lacking)} 기운이 ${input.name}님의 모자란 자리를 메웁니다.`,
      personId: giver.targetId,
      personName: giver.name,
    })
  }

  // 같은 기운이 몰리는 사람 — 그 기운을 더 보태는 물건을 나란히 두지 말라는 한 줄.
  let crowd: PrescriptionMate | null = null
  for (const mate of input.mates) {
    if (mate.strongest !== avoidElement) continue
    if (crowd === null || mate.energy[avoidElement] > crowd.energy[avoidElement]) crowd = mate
  }
  const caution = crowd
    ? `${crowd.name}님과는 ${label(avoidElement)} 기운이 함께 몰립니다. 그 기운을 더 보태는 물건은 나란히 두지 않습니다.`
    : null

  const mansikNote =
    mansik?.yongsin && mansik.yongsin !== lacking
      ? `명식이 채우라 하는 기운은 ${label(mansik.yongsin)}이고, 타고난 오행 비율로는 ${label(lacking)} 자리가 가장 옅습니다. 둘 다 곁에 두어도 됩니다.`
      : null

  const sideNote =
    mansik?.huisin && mansik.huisin !== mother && mansik.huisin !== lacking
      ? `명식의 곁들이는 기운(희신)은 ${label(mansik.huisin)} 입니다.`
      : null

  const hanjaLacking = HANJA_OF[lacking]
  const life = elementRemedies(hanjaLacking, HANJA_OF[mother], `모자란 기운이 ${hanjaLacking}`)
    .filter((item) => LIFE_KINDS.includes(item.kind))
    .map(toLifeItem)

  return {
    targetId: input.targetId,
    name: input.name,
    lacking,
    strongest,
    energy: input.energy,
    energyLive: input.energyLive,
    lore: { lacking: lore.lacking, gains: lore.gains },
    mansikNote,
    sideNote,
    fillers,
    caution,
    items: {
      shrine: pickShrineItems(input.catalog, lacking),
      real: { desk: lore.deskItem, home: REMEDY_TABLE.SPACE[hanjaLacking], gifts: lore.gifts },
      life,
    },
    avoid: { element: avoidElement, items: avoidRemedies(HANJA_OF[avoidElement]).map(toLifeItem) },
  }
}

/** 무료 사용자에게 나가는 맛보기 — ①·② 만. 숨긴 개수는 실제 배열 길이에서 센다(부풀리지 않는다). */
export interface PrescriptionTeaser {
  targetId: string
  name: string
  lacking: Element
  strongest: Element
  energy: Record<Element, number>
  energyLive: Record<Element, number> | null
  lore: { lacking: string; gains: string }
  /** 멤버십이 여는 항목 수 — 채워 주는 기운·신당 살림·실물·생활·덜어낼 것. */
  hiddenCount: number
}

export function prescriptionTeaser(p: Prescription): PrescriptionTeaser {
  const realCount = 2 + p.items.real.gifts.length
  return {
    targetId: p.targetId,
    name: p.name,
    lacking: p.lacking,
    strongest: p.strongest,
    energy: p.energy,
    energyLive: p.energyLive,
    lore: p.lore,
    hiddenCount: p.fillers.length + p.items.shrine.length + realCount + p.items.life.length + p.avoid.items.length,
  }
}

/** 처방전 안의 모든 문자열 — 금지어 검사·스냅샷이 쓴다. */
export function prescriptionTexts(p: Prescription): string[] {
  const out: string[] = [p.lore.lacking, p.lore.gains]
  if (p.mansikNote) out.push(p.mansikNote)
  if (p.sideNote) out.push(p.sideNote)
  if (p.caution) out.push(p.caution)
  for (const f of p.fillers) out.push(f.title, f.reason)
  out.push(p.items.real.desk, p.items.real.home, ...p.items.real.gifts)
  for (const item of [...p.items.life, ...p.avoid.items]) out.push(item.label, item.value, item.action)
  return out
}
