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

/**
 * 부적지 머리에 찍는 인(印) — **한글 한 자**. 표시 전용.
 *
 * 한자(安捨靜解和厄)를 쓰지 않는 이유: 부적 전체를 한글로 기획했다(CEO 지시 2026-07-30).
 * 고른 글자는 전부 **순우리말 어간**이라 한자음이 아니다 — 고(요)·놓(음)·삭(임)·덜(기)·풀(림)·막(음).
 * 한 자인 것은 인장이 좁아서다(테스트가 길이 1을 강제한다).
 */
export const AEKMAK_TAG_MARK: Readonly<Record<AekmakTag, string>> = Object.freeze({
  anxiety: '고',
  regret: '놓',
  anger: '삭',
  worry: '덜',
  resentment: '풀',
  misfortune: '막',
})

/**
 * 부적지 발치에 적는 발원(發願) 낱말 — 인장 한 자의 본말.
 *
 * ⚠️ 효능이 아니라 **바람**이다(표시광고법). "치유·정화·해소" 류를 쓰지 않고
 *    태그의 반대편 상태를 순우리말로만 적는다. 금지 어휘 대조는 테스트가 한다.
 */
export const AEKMAK_TAG_WORD: Readonly<Record<AekmakTag, string>> = Object.freeze({
  anxiety: '고요',
  regret: '놓음',
  anger: '삭임',
  worry: '덜기',
  resentment: '풀림',
  misfortune: '막음',
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
  /** 부적 아래에서 위로 타오르는 전체 길이. 완급(BURN_CURVE)을 담을 만큼은 길어야 한다 */
  total: 3200,
  /** 재·불티 방출 주기(ShrineRoomClient 향로 연기 이미터와 같은 규약) */
  emit: 150,
})

/**
 * 연소 마스크 배율 — CSS `mask-size: 100% 220%` 의 220%.
 *
 * 마스크 텍스처(burn-mask.webp)의 세로 길이가 요소 높이의 몇 배로 늘어나는가이고,
 * 여기서 **경계가 창을 완전히 통과하는지**가 결정된다:
 *   경계(텍스처 세로 중앙 v=0.5)의 요소 좌표 y = 0.5·k·H − (k−1)·H·p   (k=2.2, p=진행도)
 *   p=0 → 1.1H (창 아래 0.1H 여유) · p=1 → −0.1H (창 위 0.1H 여유)
 * 즉 시작에는 한 점도 타지 않았고 끝에는 한 조각도 남지 않는다. 이 여유 0.1H 안에
 * 경계의 들쭉날쭉함(±0.046H)이 들어가야 하므로 두 값은 함께 움직인다.
 * scripts/shrine-assets/ritual-talisman.mjs 의 MASK_SCALE 와 같아야 한다(테스트가 대조).
 */
export const BURN_MASK_SCALE = 2.2

/**
 * 연소 완급(緩急) — 시간(%) → 진행도(%). CSS `ritualBurn`·`ritualChar` 키프레임의 **단일 출처**다.
 *
 * 종이는 등속으로 타지 않는다. 불씨가 닿고 한동안 가장자리만 그을리다(0~20%),
 * 불이 붙으면 급격히 번지고(30~70%), 태울 것이 줄면서 잦아든다(80~100%).
 * 그래서 timing-function 은 `linear` 이고 완급은 **전부 이 표**가 진다 —
 * 그래야 마스크(mask-position)와 잉걸불 층(background-position)이 한 치도 어긋나지 않는다.
 * 곡선 원형: smootherstep(t)^1.18.
 */
export const BURN_CURVE: readonly Readonly<{ t: number; p: number }>[] = Object.freeze(
  (
    [
      { t: 0, p: 0 },
      { t: 10, p: 0.4 },
      { t: 20, p: 3.5 },
      { t: 30, p: 11.8 },
      { t: 40, p: 25.8 },
      { t: 50, p: 44.1 },
      { t: 60, p: 63.7 },
      { t: 70, p: 81.1 },
      { t: 80, p: 93.2 },
      { t: 90, p: 99 },
      { t: 100, p: 100 },
    ] as const
  ).map((s) => Object.freeze({ ...s }))
)

/**
 * 진행 비율(0~1) → 연소 진행도(0~1). BURN_CURVE 를 구간 선형 보간한다.
 * 재·불티 이미터가 **CSS 와 같은 속도로** 따라 올라가려면 같은 표를 봐야 한다
 * (예전엔 CSS 는 ease-in, JS 는 등속이라 불티가 불길을 앞질렀다).
 */
export function burnProgress(t: number): number {
  if (!Number.isFinite(t)) return 0
  const tp = Math.min(100, Math.max(0, t * 100))
  for (let i = 1; i < BURN_CURVE.length; i += 1) {
    const a = BURN_CURVE[i - 1]
    const b = BURN_CURVE[i]
    if (tp <= b.t) {
      const span = b.t - a.t
      const k = span <= 0 ? 0 : (tp - a.t) / span
      return (a.p + (b.p - a.p) * k) / 100
    }
  }
  return 1
}

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

// ─── 부적 주문양(呪文樣) — 한글 자모로 그리는 원문의 시각 변환 ──────────────
//
// PRD §1 "원문은 흐릿한 주문양으로 변환 표기". 글자를 그대로 보여주면 화면 캡처·공유에
// 원문이 남는다 — 그래서 **읽을 수 없는 획**으로 바꾼다. 이 변환은 되돌릴 수 없다(해시 기반).
//
// 한자 대신 **한글 자음 자모**를 쓴다(CEO 지시 2026-07-30). 읽히지 않는 근거는 세 겹이다.
//   1) 자모는 원문 해시에서 뽑는다 — 원문 글자와 대응 관계가 없다(FNV-1a 는 단방향).
//   2) **자음만** 쓴다. 모음이 없으면 어떤 음절도 이루지 못한다(한글은 초성+중성이 최소 단위).
//   3) 자모끼리 세로로 겹쳐 쌓고 기울이고, 가로 관통 획이 지나간다 — 낱자 경계 자체가 흐려진다.
// 그래서 "한글의 결"만 남고 글자는 남지 않는다. 부적이 노리는 그림이 정확히 그것이다.

/**
 * 자음 자모 14종의 획 — 0~10 정사각 좌표계. 채우지 않고 **선으로만** 긋는다(붓질).
 * 순서는 사전순(ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ)이고, 첨자가 곧 SigilGlyph.jamo 다.
 */
export const SIGIL_JAMO: readonly string[] = Object.freeze([
  'M1.3 1.5 H8.7 L6.3 8.8', // ㄱ
  'M2.3 1.3 V8.6 H8.8', // ㄴ
  'M8.7 1.5 H2.1 V8.6 H8.7', // ㄷ
  'M2.2 1.4 H8.2 L2.6 4.7 H8.2 V8.6 H2.2', // ㄹ
  'M2.2 1.5 H8.2 V8.6 H2.2 Z', // ㅁ
  'M2.4 1.3 V8.6 H8.1 V1.3 M2.4 5.1 H8.1', // ㅂ
  'M5.1 1.3 L1.8 8.8 M5.1 1.3 L8.5 8.8', // ㅅ
  'M5.1 1.4 C7.4 1.4 8.9 3.1 8.9 5.1 C8.9 7.2 7.4 8.8 5.1 8.8 C2.9 8.8 1.4 7.2 1.4 5.1 C1.4 3.1 2.9 1.4 5.1 1.4 Z', // ㅇ
  'M1.6 1.6 H8.7 M5.1 1.6 L1.8 8.8 M5.1 1.6 L8.5 8.8', // ㅈ
  'M4.1 0.4 L6.2 1.2 M1.6 2.6 H8.7 M5.1 2.6 L1.8 9.0 M5.1 2.6 L8.5 9.0', // ㅊ
  'M1.3 1.5 H8.7 L6.3 8.8 M2.6 4.8 H7.8', // ㅋ
  'M8.7 1.5 H2.1 V8.6 H8.7 M2.6 5.0 H8.1', // ㅌ
  'M1.4 2.4 H8.7 M3.2 2.4 V7.8 M7.0 2.4 V7.8 M1.4 7.8 H8.7', // ㅍ
  'M3.4 0.6 H6.8 M1.4 2.8 H8.7 M5.1 4.2 C6.7 4.2 7.9 5.3 7.9 6.5 C7.9 7.8 6.7 8.9 5.1 8.9 C3.4 8.9 2.3 7.8 2.3 6.5 C2.3 5.3 3.4 4.2 5.1 4.2 Z', // ㅎ
])

/** 주문양 자모 하나. 부적지와 **같은 좌표계**(100×150 = 2:3)로 그린다 — 자모가 찌그러지지 않는다. */
export interface SigilGlyph {
  /** SIGIL_JAMO 첨자 */
  jamo: number
  /** 중심 x (0~100) */
  x: number
  /** 중심 y (0~150) */
  y: number
  /** 한 변 길이 (좌표 단위) */
  size: number
  /** 기울기(deg) */
  tilt: number
  /** 획 굵기 px (non-scaling-stroke — 배율과 무관하게 일정) */
  weight: number
}

/** 주묵 방울 — 붓을 털었을 때 튄 자국. 부적의 "손으로 그린 티". */
export interface SigilDot {
  x: number
  y: number
  r: number
}

/** 부적 한 장의 주문양 전체. */
export interface SigilPlan {
  /** 세로로 쌓이는 자모 다발 */
  glyphs: SigilGlyph[]
  /** 기둥 획의 가로 위치 (0~100) — 부적을 관통하는 세로 한 획 */
  spineX: number
  /** 가로 관통 획들의 세로 위치 (0~150) */
  bars: number[]
  /** 튄 주묵 방울 */
  dots: SigilDot[]
}

/**
 * 자모 수 상·하한 — 부적지 세로에 겹쳐 쌓이는 범위.
 * 적으면(4~6) 낱자가 커져 "휘갈긴 낙서"가 되고, 많으면 기둥이 빽빽한 주문 열로 읽힌다.
 * 부적은 후자다.
 */
const SIGIL_MIN_GLYPHS = 7
const SIGIL_MAX_GLYPHS = 10
/** 자모 다발이 앉는 세로 구간(좌표 단위). 머리 인장(위)·발원 낱말(아래) 자리를 비워 둔다. */
const SIGIL_TOP = 32
const SIGIL_BOTTOM = 122

/**
 * 액운 원문 → 결정론 주문양. **글자 수·해시만** 쓴다(문자 자체는 좌표로 흘리지 않는다).
 * 빈 문자열이면 기본 문양('액' 시드)이 선다 — 부적지가 비어 보이지 않게.
 */
export function sigilPlan(text: string): SigilPlan {
  const trimmed = text.trim()
  const seed = hashSeed(trimmed.length > 0 ? trimmed : '액')
  const span = SIGIL_MAX_GLYPHS - SIGIL_MIN_GLYPHS + 1
  const count = SIGIL_MIN_GLYPHS + (trimmed.length % span)
  const glyphs: SigilGlyph[] = []
  const bars: number[] = []
  // 선형 합동 생성기 — Math.random 을 쓰면 리렌더마다 문양이 바뀐다
  let s = seed
  const next = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s
  }
  const r1 = (): number => next() / 0x100000000

  const pitch = (SIGIL_BOTTOM - SIGIL_TOP) / count
  for (let i = 0; i < count; i += 1) {
    const a = r1()
    const b = r1()
    const c = r1()
    glyphs.push({
      jamo: Math.floor(r1() * SIGIL_JAMO.length) % SIGIL_JAMO.length,
      x: round1(50 + (a * 2 - 1) * 9),
      // 세로 흔들림은 pitch 의 ±12% 까지만 — 더 주면 최소 크기 두 자가 나란히 왔을 때
      // 간격(최대 1.24·pitch)이 반지름 합(최소 1.3·pitch)을 넘어 **겹침이 끊긴다**
      y: round1(SIGIL_TOP + pitch * (i + 0.5) + (b * 2 - 1) * pitch * 0.12),
      // 자모끼리 세로로 30% 남짓 겹치도록 pitch 보다 크게 잡는다 — 낱자 경계를 뭉갠다.
      // 겹치지 않으면 "자음 목록"으로 읽혀 부적이 아니라 학습표가 된다.
      size: round1(pitch * (1.3 + c * 0.55)),
      tilt: round1((r1() * 2 - 1) * 17),
      weight: 1.6 + Math.floor(r1() * 3) * 0.35,
    })
  }
  // 가로 관통 획 2~3줄 — 자모 사이를 지나며 낱자 경계를 한 번 더 흐린다
  const barCount = 2 + (next() % 2)
  for (let i = 0; i < barCount; i += 1) {
    bars.push(round1(SIGIL_TOP + ((i + 0.7) / barCount) * (SIGIL_BOTTOM - SIGIL_TOP) + (r1() * 2 - 1) * 6))
  }
  // 튄 주묵 방울 3~5개 — 기둥 옆 여백에만 앉힌다
  const dotCount = 3 + (next() % 3)
  const dots: SigilDot[] = []
  for (let i = 0; i < dotCount; i += 1) {
    const side = next() % 2 === 0 ? -1 : 1
    dots.push({
      x: round1(50 + side * (16 + r1() * 11)),
      y: round1(SIGIL_TOP + r1() * (SIGIL_BOTTOM - SIGIL_TOP)),
      r: round1(0.55 + r1() * 1.05),
    })
  }
  return { glyphs, spineX: round1(50 + (r1() * 2 - 1) * 5), bars, dots }
}

function round1(v: number): number {
  return Math.round((v + Number.EPSILON) * 10) / 10
}
