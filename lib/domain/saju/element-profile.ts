/**
 * 오행 세력 프로필 — 「타고난 기운」의 정본 (CEO 2026-09-11 「가족 전체 균형·오행 그래프 점수가 현실적으로 안 맞아」).
 *
 * 전에는 여덟 글자(천간 넷·지지 넷 본기)를 **낱개로 세어** 20+개수×15 로 막대를 세웠다. 그러면
 *   · 지지 속에 숨은 기운(지장간 — 丑 안의 癸·辛, 寅 안의 丙·戊 …)이 통째로 빠지고
 *   · 월지(계절의 기운, 득령)가 년지·시지와 같은 무게가 되며
 *   · 개수 0 → 20, 4 → 80 처럼 값이 계단으로 뛰어 «점수가 현실과 안 맞는» 그래프가 나왔다.
 *
 * 여기서는 명리의 세력 계산 방식대로 **자리마다 무게를 달리 주고, 지지는 지장간 일수 비율로 나눠** 다섯 오행의
 * 비율(합 100%)을 낸다. 결정론·순수 함수 — 같은 명식이면 같은 비율.
 */
import { GAN_WUXING, type SajuData } from './saju'
import { JIJANGGAN } from '@/lib/saju-engine/jijanggan'
import { ELEMENTS } from '@/lib/domain/shrine/energy'
import type { Element } from '@/lib/domain/shrine/types'

const ELEMENT_OF_HANJA: Record<string, Element> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' }

/**
 * 자리 무게. 월지가 가장 무겁다(得令 — 계절이 기운을 정한다), 일지가 그다음(得地 — 내 몸이 앉은 자리).
 * 천간은 드러난 기운이라 하나씩. 합이 9.5 — 비율로만 쓰므로 절대값은 중요치 않다.
 */
export const PILLAR_WEIGHT = {
  yearGan: 1,
  monthGan: 1,
  dayGan: 1,
  hourGan: 1,
  yearZhi: 1,
  monthZhi: 2,
  dayZhi: 1.5,
  hourZhi: 1,
} as const

/** 비율(%) → 막대 높이. 균형(20%)이 50, 40% 이상이면 가득. 신당 살림 계산(0~100)과 같은 자로 맞춘다. */
export const SHARE_TO_BAR = 2.5
export const BAR_MIN = 5
export const BAR_MAX = 100

export interface ElementProfile {
  /** 다섯 오행 비율 — 정수, 합 100. */
  share: Record<Element, number>
  /** 막대 높이(5~100) — share × 2.5. */
  bar: Record<Element, number>
  strongest: Element
  weakest: Element
  /** 월지 본기 오행 — 계절이 주는 기운. */
  monthCommand: Element | null
  /** 일간 오행. */
  dayMaster: Element | null
}

function addGan(weight: Record<Element, number>, gan: string, w: number): void {
  const el = ELEMENT_OF_HANJA[GAN_WUXING[gan] ?? '']
  if (el) weight[el] += w
}

/** 지지 하나의 무게를 지장간 일수 비율로 나눠 더한다. 표에 없는 지지는 무시한다. */
function addZhi(weight: Record<Element, number>, zhi: string, w: number): void {
  const entry = JIJANGGAN[zhi]
  if (!entry) return
  const total = entry.yeogiDays + entry.junggiDays + entry.bongiDays
  if (total <= 0) return
  const parts: Array<[string | null, number]> = [
    [entry.yeogi, entry.yeogiDays],
    [entry.junggi, entry.junggiDays],
    [entry.bongi, entry.bongiDays],
  ]
  for (const [gan, days] of parts) if (gan && days > 0) addGan(weight, gan, (w * days) / total)
}

/** 실수 비율 → 정수(합 100). 가장 큰 나머지부터 올린다 — 합이 99·101 이 되지 않게. */
export function roundShares(raw: Record<Element, number>): Record<Element, number> {
  const total = ELEMENTS.reduce((s, el) => s + raw[el], 0)
  const out: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  if (total <= 0) return { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 }
  const exact = ELEMENTS.map((el) => ({ el, v: (raw[el] / total) * 100 }))
  let used = 0
  for (const { el, v } of exact) {
    out[el] = Math.floor(v)
    used += out[el]
  }
  const rest = exact
    .map(({ el, v }) => ({ el, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || ELEMENTS.indexOf(a.el) - ELEMENTS.indexOf(b.el))
  for (let i = 0; i < 100 - used; i++) out[rest[i % rest.length].el] += 1
  return out
}

export function shareToBar(share: number): number {
  return Math.max(BAR_MIN, Math.min(BAR_MAX, Math.round(share * SHARE_TO_BAR)))
}

export function computeElementProfile(saju: Pick<SajuData, 'pillars'>): ElementProfile {
  const weight: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  const { year, month, day, hour } = saju.pillars
  addGan(weight, year.gan, PILLAR_WEIGHT.yearGan)
  addGan(weight, month.gan, PILLAR_WEIGHT.monthGan)
  addGan(weight, day.gan, PILLAR_WEIGHT.dayGan)
  addGan(weight, hour.gan, PILLAR_WEIGHT.hourGan)
  addZhi(weight, year.zhi, PILLAR_WEIGHT.yearZhi)
  addZhi(weight, month.zhi, PILLAR_WEIGHT.monthZhi)
  addZhi(weight, day.zhi, PILLAR_WEIGHT.dayZhi)
  addZhi(weight, hour.zhi, PILLAR_WEIGHT.hourZhi)

  const share = roundShares(weight)
  const bar: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const el of ELEMENTS) bar[el] = shareToBar(share[el])

  let strongest: Element = ELEMENTS[0]
  let weakest: Element = ELEMENTS[0]
  for (const el of ELEMENTS) {
    if (share[el] > share[strongest]) strongest = el
    if (share[el] < share[weakest]) weakest = el
  }

  const monthBongi = JIJANGGAN[month.zhi]?.bongi
  return {
    share,
    bar,
    strongest,
    weakest,
    monthCommand: monthBongi ? (ELEMENT_OF_HANJA[GAN_WUXING[monthBongi] ?? ''] ?? null) : null,
    dayMaster: ELEMENT_OF_HANJA[GAN_WUXING[day.gan] ?? ''] ?? null,
  }
}

/** 살림·보정을 얹은 0~100 기운을 비율(합 100)로 — 「타고난 비율」과 같은 자로 나란히 두기 위해. */
export function energyToShare(energy: Record<Element, number>): Record<Element, number> {
  return roundShares(energy)
}
