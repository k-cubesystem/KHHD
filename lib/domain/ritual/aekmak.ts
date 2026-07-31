/**
 * 액막이(厄막이) 도메인 — 부적 태우기 의식 R-1 (PRD-shrine-rituals-v1 §1).
 *
 * 전 함수 순수(side-effect 0) · 결정론. 시각은 호출자가 epochMs 로 주입한다
 * (SSR·클라 동일 결과 = 하이드레이션 불일치 0 — scene-clock.ts 와 같은 규약).
 *
 * ⚠️ 이 모듈은 **액운 원문을 다루되 절대 밖으로 내보내지 않는다**.
 *    원문은 클라이언트 화면에서 부적 세로쓰기 본문(writPlan)으로 그려질 뿐이고, 서버로 가는 것은
 *    태그 하나다. 스키마에도 텍스트 컬럼이 없다(supabase/migrations/20260730_shrine_aekmak_logs.sql).
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

// ─── 부적 본문(writ) — 원문이 읽히는 세로쓰기 한글로 앉는다 ──────────────
//
// CEO 7차 지시(2026-07-31): "액막이 부적에 한글로 써지면 좋겠다" — **읽히는** 한글이다.
// 종전의 자모 겹침 주문양(읽힘 방지)은 어제 지시의 오독이었으므로 여기서 대체한다.
//
// ⚠️ 프라이버시 원칙은 그대로다. "원문 무저장"은 서버·DB 에 안 남긴다는 것이지 화면에 못
//    그린다는 것이 아니다. 이 계획(WritPlan)은 순수 함수의 산출물로 **화면에서만** 쓰이고,
//    서버 액션·GA 라벨·로그·공유 문구 어디에도 실리지 않는다(테스트가 소스를 대조한다).
//
// 배치는 전통 세로쓰기다: 오른쪽 열부터 위→아래로 읽는다. 열 수·글자 크기는 원문 길이의
// 결정론 함수다 — 80자(AEKMAK_TEXT_MAX)까지 본문 영역에 들어가는 것을 테스트가 불변식으로 잡는다.

/**
 * 부적 본문 좌표(px) — AekmakSheet 의 부적 무대 STAGE(186×279)와 같은 좌표계.
 * top 은 머리 인장(top 5.5%≈15px + 34px) 아래, bottom 은 발치 발원 낱말 위에서 끊는다.
 * 무대 크기가 어긋나면 계산이 통째로 틀어지므로 STAGE 와의 일치는 테스트가 소스로 대조한다.
 */
export const WRIT_BOX = Object.freeze({
  w: 186,
  h: 279,
  /** 본문 상단 — 인장(≈49px) 아래 여백 포함 */
  top: 56,
  /** 본문 하단 — 발원 낱말(≈253px~) 위 여백 포함 */
  bottom: 247,
  /** 최대 열 수 — 부적 폭에서 붓글씨 열이 성립하는 상한 */
  maxCols: 3,
})

/** 열 갈림 문턱(자) — n ≤ single 이면 1열, n ≤ double 이면 2열, 그 위는 3열. */
export const WRIT_COL_LIMIT = Object.freeze({ single: 12, double: 34 })

/**
 * 글자 크기 규칙. advance/line 은 CSS(.ritual-writ-col)의 letter-spacing(0.12em)·
 * line-height(1.6)와 **같아야 한다** — 어긋나면 "들어간다" 계산과 실제 렌더가 갈린다(테스트가 대조).
 */
export const WRIT_FONT = Object.freeze({
  /** 글자 크기 상한(px) — 인장(21px)보다 본문이 커지면 위계가 뒤집힌다 */
  max: 20,
  /** 하한(px) — 80자·3열(열 27자)일 때 정확히 이 값에 닿는다. 고DPR 모바일에서 판독 가능선 */
  min: 6,
  /** 글자 전진폭 배수 = 1 + letter-spacing(em). 세로쓰기 한글 한 자는 1em 을 차지한다 */
  advance: 1.12,
  /** 열 전진폭 배수 = line-height. 열 수 × line × fontPx 가 가로 점유폭이다 */
  line: 1.6,
})

/** 부적 본문 계획 — **화면 전용**. 이 타입의 값은 어떤 경로로도 서버에 보내지 않는다. */
export interface WritPlan {
  /** 읽는 순서의 열들 — vertical-rl(row-reverse)이 columns[0]을 맨 오른쪽에 세운다 */
  columns: readonly string[]
  /** 글자 크기(px) — WRIT_BOX(186×279) 기준 */
  fontPx: number
  /** 본문 출처 — 사용자가 쓴 원문인가, 빈 원문의 태그 발원문 폴백인가 */
  source: 'user' | 'fallback'
}

/** 받침 유무로 을/를을 가른다 — 폴백 발원문이 어색한 조사를 달지 않게. 한글 밖 글자는 '을'. */
function eulReul(word: string): '을' | '를' {
  const code = word.charCodeAt(word.length - 1)
  if (code < 0xac00 || code > 0xd7a3) return '을'
  return (code - 0xac00) % 28 > 0 ? '을' : '를'
}

/**
 * 빈 원문의 폴백 본문 — 태그의 표시명·발원 낱말(AEKMAK_TAG_WORD 계열)로 두 열을 짓는다.
 * "여기 두고 · 빕니다"는 효능이 아니라 **바람**이다(표시광고법 — 금지 어휘 대조는 테스트가 한다).
 */
export function writFallbackColumns(tag: AekmakTag | null): readonly [string, string] {
  if (!tag) return Object.freeze(['마음에 걸린 것을', '여기 두고 갑니다'] as [string, string])
  const label = AEKMAK_TAG_LABEL[tag]
  const word = AEKMAK_TAG_WORD[tag]
  return Object.freeze([`${label}${eulReul(label)} 여기 두고`, `${word}${eulReul(word)} 빕니다`] as [string, string])
}

/** 최장 열 글자 수 → 글자 크기(px). 0.5px 단위 **내림** — 올림하면 fit 불변식이 깨질 수 있다. */
function writFontPx(maxColChars: number): number {
  const boxH = WRIT_BOX.bottom - WRIT_BOX.top
  const raw = boxH / (Math.max(1, maxColChars) * WRIT_FONT.advance)
  const stepped = Math.floor(raw * 2) / 2
  return Math.min(WRIT_FONT.max, Math.max(WRIT_FONT.min, stepped))
}

/**
 * 액운 원문 → 세로쓰기 본문 계획(결정론). 규칙:
 *  1) 공백·개행을 홑 공백으로 접고 80자(AEKMAK_TEXT_MAX)에서 자른다 — UI 상한의 도메인 짝.
 *  2) 열 수는 길이 문턱(WRIT_COL_LIMIT)으로, 분배는 코드포인트 고른 나눔(앞열부터 +1)으로.
 *     한국어 조판은 음절 단위 개행이 정법이라 어절 중간 갈림을 허용한다 — 규칙이 단순해야 결정론이 산다.
 *  3) 열 머리·꼬리의 공백은 걷는다(열이 떠 보인다). 글자는 하나도 잃지 않는다.
 *  4) 글자 크기는 최장 열이 본문 높이에 들어가는 최대값(0.5px 내림, min~max 클램프).
 * 빈 원문이면 태그 발원문(writFallbackColumns)으로 선다 — 부적이 비어 보이지 않게.
 */
export function writPlan(text: string, tag: AekmakTag | null): WritPlan {
  const body = text.replace(/\s+/g, ' ').trim()
  if (body.length === 0) {
    const columns = writFallbackColumns(tag)
    const m = Math.max(...columns.map((c) => [...c].length))
    return { columns, fontPx: writFontPx(m), source: 'fallback' }
  }
  // 코드포인트 단위 — UTF-16 짝(이모지)을 반 토막 내지 않는다
  const chars = [...body].slice(0, AEKMAK_TEXT_MAX)
  const n = chars.length
  const colCount = n <= WRIT_COL_LIMIT.single ? 1 : n <= WRIT_COL_LIMIT.double ? 2 : WRIT_BOX.maxCols
  const base = Math.floor(n / colCount)
  const extra = n % colCount
  const columns: string[] = []
  let idx = 0
  for (let c = 0; c < colCount; c += 1) {
    const take = base + (c < extra ? 1 : 0)
    columns.push(
      chars
        .slice(idx, idx + take)
        .join('')
        .trim()
    )
    idx += take
  }
  const filled = columns.filter((c) => c.length > 0)
  const m = Math.max(...filled.map((c) => [...c].length))
  return { columns: filled, fontPx: writFontPx(m), source: 'user' }
}
