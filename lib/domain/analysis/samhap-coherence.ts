/**
 * 삼재 정합도(三才整合度) — 종합사주풀이 v2 「삼재교차법」의 결정론 스코어.
 *
 * 命(일간·용신) × 相(관상 오행형) × 宅(풍수 지배오행)의 상생상극을 계산해
 * 0~100 정합도와 판정 근거를 만든다. AI 호출 전에 코드가 계산하고, 결과는
 * 프롬프트 주입(서술 근거)과 리포트 점수(ScoreRing)에 동시에 쓰인다.
 *
 * 순수 함수 — 단위테스트 대상. PLAN-samhap-synthesis-v2.md §4.
 */

export type Element5 = '木' | '火' | '土' | '金' | '水'

const ELEMENTS: readonly Element5[] = ['木', '火', '土', '金', '水'] as const

/** 상생 순환: 木→火→土→金→水→木 */
const SHENG_NEXT: Record<Element5, Element5> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
/** 상극: 木剋土, 土剋水, 水剋火, 火剋金, 金剋木 */
const KE: Record<Element5, Element5> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

const HANGUL_TO_EL: Record<string, Element5> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

/**
 * 잡다한 표기(木 / 목 / 목형 / 목(木) / wood)를 오행 한 글자로 정규화.
 * 판정 불가면 null — 호출부는 해당 축을 계산에서 제외한다.
 */
export function normalizeElement(input: unknown): Element5 | null {
  if (typeof input !== 'string' || !input.trim()) return null
  const s = input.trim()
  for (const el of ELEMENTS) if (s.includes(el)) return el
  for (const [ko, el] of Object.entries(HANGUL_TO_EL)) if (s.startsWith(ko)) return el
  const lower = s.toLowerCase()
  const en: Record<string, Element5> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }
  for (const [k, el] of Object.entries(en)) if (lower.includes(k)) return el
  return null
}

export type ElementRelation = 'same' | 'generates' | 'generated_by' | 'controls' | 'controlled_by'

/** a 가 b 에 대해 갖는 관계 (a생b = generates, a극b = controls). */
export function elementRelation(a: Element5, b: Element5): ElementRelation {
  if (a === b) return 'same'
  if (SHENG_NEXT[a] === b) return 'generates'
  if (SHENG_NEXT[b] === a) return 'generated_by'
  if (KE[a] === b) return 'controls'
  return 'controlled_by'
}

const RELATION_LABEL: Record<ElementRelation, string> = {
  same: '같은 기운(비화)',
  generates: '생(生)하여 북돋움',
  generated_by: '생을 받아 기댐',
  controls: '극(剋)하여 거스름',
  controlled_by: '극을 받아 눌림',
}

export interface CoherencePart {
  /** UI·프롬프트 표기용 축 이름 (예: "관상 오행형 × 용신") */
  label: string
  /** 비교된 두 오행 (예: "火形 ↔ 木") */
  pair: string
  relation: ElementRelation
  relationLabel: string
  delta: number
}

export type CoherenceGrade = '합' | '반합' | '충'

export interface SamhapCoherence {
  /** 15~98. score 로 그대로 노출된다. */
  score: number
  grade: CoherenceGrade
  parts: CoherencePart[]
  /** 프롬프트 주입용 요약 문장 (판정 근거 나열) */
  narrative: string
}

export interface CoherenceInput {
  /** 일간 오행 (예: '木') */
  dayElement: unknown
  /** 용신 오행 — 엔진 finalYongsin (예: '火'). 없으면 일간 기준만 계산 */
  yongsinElement?: unknown
  /** 관상 오행형 — FACE result personalityType (예: '목형') */
  faceForm?: unknown
  /** 풍수 지배 오행 — FENGSHUI result dominantElement */
  fengshuiElement?: unknown
}

/** (형 → 기준) 관계별 가산점. PLAN §4 표와 1:1. */
function deltaVsYongsin(rel: ElementRelation): number {
  switch (rel) {
    case 'same':
      return 16
    case 'generates':
      return 12
    case 'generated_by':
      return 5
    case 'controls':
      return -12
    case 'controlled_by':
      return -5
  }
}

function deltaVsDay(rel: ElementRelation): number {
  switch (rel) {
    case 'same':
      return 8
    case 'generates':
      return 5
    case 'generated_by':
      return 3
    case 'controls':
      return -8
    case 'controlled_by':
      return -4
  }
}

function deltaFengshui(rel: ElementRelation): number {
  switch (rel) {
    case 'same':
      return 10
    case 'generates':
      return 7
    case 'generated_by':
      return 3
    case 'controls':
      return -10
    case 'controlled_by':
      return -4
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * 삼재 정합도 계산. 관상 오행형을 정규화할 수 없으면 null —
 * 호출부는 기존 점수(관상·손금 평균)로 폴백하고 프롬프트에 미확인을 고지한다.
 */
export function computeSamhapCoherence(input: CoherenceInput): SamhapCoherence | null {
  const day = normalizeElement(input.dayElement)
  const face = normalizeElement(input.faceForm)
  if (!day || !face) return null

  const yongsin = normalizeElement(input.yongsinElement)
  const fengshui = normalizeElement(input.fengshuiElement)

  const parts: CoherencePart[] = []
  let score = 60

  if (yongsin) {
    const rel = elementRelation(face, yongsin)
    const delta = deltaVsYongsin(rel)
    score += delta
    parts.push({
      label: '관상 오행형 × 용신',
      pair: `${face}形 ↔ ${yongsin}`,
      relation: rel,
      relationLabel: RELATION_LABEL[rel],
      delta,
    })
  }

  {
    const rel = elementRelation(face, day)
    const delta = deltaVsDay(rel)
    score += delta
    parts.push({
      label: '관상 오행형 × 일간',
      pair: `${face}形 ↔ ${day}`,
      relation: rel,
      relationLabel: RELATION_LABEL[rel],
      delta,
    })
  }

  if (fengshui && yongsin) {
    const rel = elementRelation(fengshui, yongsin)
    const delta = deltaFengshui(rel)
    score += delta
    parts.push({
      label: '풍수 지배오행 × 용신',
      pair: `${fengshui} ↔ ${yongsin}`,
      relation: rel,
      relationLabel: RELATION_LABEL[rel],
      delta,
    })
  }

  score = clamp(Math.round(score), 15, 98)
  const grade: CoherenceGrade = score >= 85 ? '합' : score >= 65 ? '반합' : '충'

  const narrative =
    `삼재 정합도 ${score}점(${grade}). ` +
    parts.map((p) => `${p.label}: ${p.pair} — ${p.relationLabel}(${p.delta > 0 ? '+' : ''}${p.delta})`).join(' / ')

  return { score, grade, parts, narrative }
}
