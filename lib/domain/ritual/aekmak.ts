/**
 * 액막이(厄막이) 도메인 — 부적 태우기 의식 R-1 (PRD-shrine-rituals-v1 §1).
 *
 * 전 함수 순수(side-effect 0) · 결정론. 시각은 호출자가 epochMs 로 주입한다
 * (SSR·클라 동일 결과 = 하이드레이션 불일치 0 — scene-clock.ts 와 같은 규약).
 *
 * ⚠️ 이 모듈은 **액운 원문을 다루되 절대 밖으로 내보내지 않는다**.
 *    원문은 클라이언트에서 부적 문양(sigil)으로 변환될 뿐이고, 서버로 가는 것은 태그 하나다.
 *    스키마에도 텍스트 컬럼이 없다(supabase/migrations/20260730_shrine_aekmak_logs.sql).
 *
 * ⚠️ 문구는 **의료·심리 효능을 주장하지 않는다**(표시광고법 L-트랙 기준).
 *    "치유"·"정화 효과" 류 금지 — 금지 어휘는 테스트가 강제한다(__tests__/aekmak.test.ts).
 */

// ─── 감정 태그 6종 ────────────────────────────────────────────
//
// DB CHECK 제약(shrine_aekmak_logs.tag)과 **문자열이 같아야 한다**. 통계·월간 회고의 유일한 키다.

export type AekmakTag = 'anxiety' | 'regret' | 'anger' | 'worry' | 'resentment' | 'misfortune'

export const AEKMAK_TAGS: readonly AekmakTag[] = Object.freeze([
  'anxiety',
  'regret',
  'anger',
  'worry',
  'resentment',
  'misfortune',
] as const)

/** 태그 표시명(한국어). 원안 6종 그대로 — 불안·미련·화·걱정·미움·액운. */
export const AEKMAK_TAG_LABEL: Readonly<Record<AekmakTag, string>> = Object.freeze({
  anxiety: '불안',
  regret: '미련',
  anger: '화',
  worry: '걱정',
  resentment: '미움',
  misfortune: '액운',
})

/** 태그 한자 첨자 — 부적지 머리에 찍는 인(印). 표시 전용. */
export const AEKMAK_TAG_SEAL: Readonly<Record<AekmakTag, string>> = Object.freeze({
  anxiety: '安',
  regret: '捨',
  anger: '靜',
  worry: '解',
  resentment: '和',
  misfortune: '厄',
})

/** 서버 입력 검증용 타입 가드 — 액션은 이걸 통과한 값만 DB 로 보낸다. */
export function isAekmakTag(value: unknown): value is AekmakTag {
  return typeof value === 'string' && (AEKMAK_TAGS as readonly string[]).includes(value)
}

// ─── 정책 상수 ────────────────────────────────────────────────

/** 기본 기능 무료 · 하루(KST) 3회. 프리미엄 부적 스킨은 이번 범위 밖(후속). */
export const AEKMAK_DAILY_LIMIT = 3

/** 액운 입력 상한(자). 원문은 저장되지 않으므로 서버가 아니라 **화면**이 지키는 값이다. */
export const AEKMAK_TEXT_MAX = 80

/**
 * 연소 타임라인(ms) — app/shrine-scene.css 의 `ritualBurn`·`ritualChar` 길이와 **같아야 한다**.
 * 어긋나면 재·불티가 불길보다 먼저 끝나거나 늦게까지 남는다. 대조는 테스트가 한다.
 * 국면 전환 자체는 setTimeout 체인이 아니라 CSS animationend 가 몬다(AekmakSheet).
 */
export const BURN_MS = Object.freeze({
  /** 부적 아래에서 위로 타오르는 전체 길이 */
  total: 2400,
  /** 재·불티 방출 주기(ShrineRoomClient 향로 연기 이미터와 같은 규약) */
  emit: 180,
})

/** 법무 고지 — 효능이 아니라 놀이임을 명시한다. 문구 풀 린트 대상 아님(고지 자체가 부정문). */
export const AEKMAK_DISCLAIMER = '재미로 즐기는 전통 의식 놀이입니다. 의학적·심리적 상담을 대신하지 않습니다.'

/** 입력 화면 고지 — 무저장이 이 기능의 약속이라 화면에서 먼저 말한다. */
export const AEKMAK_PRIVACY_NOTICE = '이 글은 저장되지 않습니다 — 태우면 정말 사라집니다.'

// ─── KST 하루 판정 ────────────────────────────────────────────
//
// Intl 미사용 — 런타임 TZ DB 유무와 무관하게 서버·클라가 같은 값을 낸다(scene-clock.ts 와 동일 원리).

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** epochMs → KST 날짜 키 "YYYY-MM-DD". 비유한수는 빈 문자열(어떤 날에도 속하지 않음). */
export function kstDayKey(epochMs: number): string {
  if (!Number.isFinite(epochMs)) return ''
  return new Date(epochMs + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/** epochMs → 그 달(KST) 1일 00:00 KST 의 epochMs. 월간 회고 조회 범위의 하한. */
export function kstMonthStartMs(epochMs: number): number {
  if (!Number.isFinite(epochMs)) return 0
  const shifted = new Date(epochMs + KST_OFFSET_MS)
  const monthStartShifted = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1)
  return monthStartShifted - KST_OFFSET_MS
}

/** 같은 KST 하루에 속한 기록 수. */
export function countBurnsOnDay(burnedAtMs: readonly number[], epochMs: number): number {
  const day = kstDayKey(epochMs)
  if (!day) return 0
  let n = 0
  for (const t of burnedAtMs) if (kstDayKey(t) === day) n += 1
  return n
}

/** 오늘(KST) 남은 태우기 횟수. 0~AEKMAK_DAILY_LIMIT 로 클램프. */
export function remainingBurns(burnedAtMs: readonly number[], epochMs: number): number {
  const used = countBurnsOnDay(burnedAtMs, epochMs)
  return Math.max(0, Math.min(AEKMAK_DAILY_LIMIT, AEKMAK_DAILY_LIMIT - used))
}

/** 같은 KST 달에 속한 기록 수 — "이달 N개의 액을 태웠어요" 재료. */
export function countBurnsThisMonth(burnedAtMs: readonly number[], epochMs: number): number {
  const from = kstMonthStartMs(epochMs)
  const to = from + monthLengthMs(epochMs)
  let n = 0
  for (const t of burnedAtMs) if (Number.isFinite(t) && t >= from && t < to) n += 1
  return n
}

/** 그 달(KST)의 길이(ms). 말일이 28~31 로 달라 상수로 둘 수 없다. */
function monthLengthMs(epochMs: number): number {
  const shifted = new Date(epochMs + KST_OFFSET_MS)
  const y = shifted.getUTCFullYear()
  const m = shifted.getUTCMonth()
  return Date.UTC(y, m + 1, 1) - Date.UTC(y, m, 1)
}

// ─── 결정론 난수 ──────────────────────────────────────────────

/** FNV-1a 32bit — 문자열 → 시드. 같은 입력이면 서버·클라·재렌더 어디서나 같은 값. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** 시드 → 0 이상 max 미만의 정수. max<=0 이면 0. */
function pickIndex(seed: number, max: number): number {
  if (max <= 0) return 0
  return (Math.imul(seed >>> 0, 2654435761) >>> 0) % max
}

// ─── 마무리 문구 (결정론) ─────────────────────────────────────
//
// 규율: 의료·심리 효능 주장 금지. "가벼워졌습니다" 급의 감상까지만 쓴다.
// 태그마다 4변형 — 하루 3회 상한이라 4변형이면 같은 날 같은 문장이 겹칠 확률이 낮다.

const AEKMAK_LINES: Readonly<Record<AekmakTag, readonly string[]>> = Object.freeze({
  anxiety: Object.freeze([
    '재가 되어 흩어졌습니다. 마음이 한결 가벼워졌습니다.',
    '불씨가 다 사그라들었습니다. 오늘 밤은 조금 편히 누우셔도 좋겠습니다.',
    '연기가 위로 올라갔습니다. 붙들고 있던 손을 놓으셨네요.',
    '부적이 다 탔습니다. 여기까지는 두고 가셔도 됩니다.',
  ]),
  regret: Object.freeze([
    '지난 자리가 비었습니다. 이제 앞을 보셔도 좋겠습니다.',
    '재만 남았습니다. 남은 것은 남은 대로 두시지요.',
    '불이 다 지나갔습니다. 되돌아보는 발걸음이 조금 가벼워졌습니다.',
    '부적이 사라졌습니다. 미련도 한 겹 얇아졌습니다.',
  ]),
  anger: Object.freeze([
    '불이 불을 데려갔습니다. 숨이 한 번 고르게 쉬어집니다.',
    '뜨겁던 것이 재가 되었습니다. 잠시 식히고 가시지요.',
    '연기가 걷혔습니다. 목소리를 낮추어도 될 만큼은 되었습니다.',
    '다 태웠습니다. 오늘은 여기서 접으셔도 좋겠습니다.',
  ]),
  worry: Object.freeze([
    '걱정 한 장이 사라졌습니다. 어깨가 조금 내려앉았습니다.',
    '재가 되어 흩어졌습니다. 아직 오지 않은 일은 아직 오지 않았습니다.',
    '불길이 다 지나갔습니다. 오늘 몫만 남았습니다.',
    '부적이 다 탔습니다. 나머지는 내일의 몫으로 미뤄두시지요.',
  ]),
  resentment: Object.freeze([
    '미운 이름이 재가 되었습니다. 마음 한 자리가 비었습니다.',
    '불이 다 지나갔습니다. 굳이 오늘 다시 꺼내지 않으셔도 됩니다.',
    '연기가 위로 흩어졌습니다. 여기까지 가져오신 것으로 충분합니다.',
    '부적이 사라졌습니다. 매듭 하나가 풀린 자리입니다.',
  ]),
  misfortune: Object.freeze([
    '액이 사그라들었습니다. 문 앞이 한결 조용해졌습니다.',
    '재가 되어 흩어졌습니다. 오늘의 액은 여기서 멈춥니다.',
    '불이 액을 데려갔습니다. 이제 옥수 한 잔 올리시지요.',
    '다 탔습니다. 지나갈 것은 지나가게 두시지요.',
  ]),
})

/** 태우기 직후 신위의 한마디. 같은 (태그, 시각)이면 항상 같은 문장. */
export function settleLine(tag: AekmakTag, epochMs: number): string {
  const pool = AEKMAK_LINES[tag]
  const at = Number.isFinite(epochMs) ? Math.floor(epochMs) : 0
  return pool[pickIndex(hashSeed(`${tag}:${at}`), pool.length)]
}

/** 문구 풀 전체(테스트의 금지 어휘 린트 대상). */
export function allSettleLines(): readonly string[] {
  return AEKMAK_TAGS.flatMap((t) => [...AEKMAK_LINES[t]])
}

/** 월간 회고 한 줄. 0건이면 null(빈 문장을 화면에 두지 않는다). */
export function monthlyRecallLine(count: number): string | null {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  if (n <= 0) return null
  return `이달에 ${n}개의 액을 태우셨습니다.`
}

// ─── 부적 문양(sigil) — 원문의 시각 변환 ──────────────────────
//
// PRD §1 "원문은 흐릿한 주문양으로 변환 표기". 글자를 그대로 보여주면 화면 캡처·공유에
// 원문이 남는다 — 그래서 **읽을 수 없는 획**으로 바꾼다. 이 변환은 되돌릴 수 없다(해시 기반).

/** 주문양 한 획. 부적지 위 % 좌표계(0~100)로 그린다. */
export interface SigilStroke {
  /** 세로 위치 % */
  y: number
  /** 가로 중심 % */
  x: number
  /** 획 길이 % */
  len: number
  /** 기울기(deg) */
  tilt: number
  /** 굵기 px */
  weight: number
}

/** 주문양 획 수 상한 — 부적지 세로에 겹치지 않고 들어가는 최대치. */
const SIGIL_MAX_STROKES = 9

/**
 * 액운 원문 → 결정론 주문양. **글자 수·해시만** 쓴다(문자 자체는 좌표로 흘리지 않는다).
 * 빈 문자열이면 획 3개의 기본 문양(부적지가 비어 보이지 않게).
 */
export function sigilStrokes(text: string): SigilStroke[] {
  const trimmed = text.trim()
  const seed = hashSeed(trimmed.length > 0 ? trimmed : '厄')
  const count = Math.max(3, Math.min(SIGIL_MAX_STROKES, 3 + (trimmed.length % (SIGIL_MAX_STROKES - 2))))
  const strokes: SigilStroke[] = []
  let s = seed
  for (let i = 0; i < count; i += 1) {
    // 선형 합동 생성기 — Math.random 을 쓰면 리렌더마다 문양이 바뀐다
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    const a = (s >>> 24) & 0xff
    const b = (s >>> 16) & 0xff
    const c = (s >>> 8) & 0xff
    strokes.push({
      y: Math.round(((i + 0.5) / count) * 78 * 10) / 10 + 11,
      x: 50 + Math.round((((a / 255) * 2 - 1) * 16 + Number.EPSILON) * 10) / 10,
      len: 26 + Math.round(((b / 255) * 34 + Number.EPSILON) * 10) / 10,
      tilt: Math.round((((c / 255) * 2 - 1) * 14 + Number.EPSILON) * 10) / 10,
      weight: 2 + ((a + b) % 3),
    })
  }
  return strokes
}
