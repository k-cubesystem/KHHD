/**
 * 오방기(五方旗) 점괘 도메인 — 선택장애 해소 의식 R-2 (PRD-shrine-rituals-v1 §2).
 *
 * 전 함수 순수(side-effect 0) · 결정론. 시각·시드는 호출자가 인자로 주입한다
 * (SSR·클라 동일 결과 = 하이드레이션 불일치 0 — aekmak.ts·scene-clock.ts 와 같은 규약).
 *
 * ⚠️ 이 모듈은 **질문 원문·선택지를 서버로 보내지 않는다**.
 *    깃발 배정(어느 깃발 뒤에 어느 선택지가 있는가)은 전부 화면에서 계산된다 — 그래서 시드만 서버가 준다.
 *    로그에 남는 것은 색·질문유형·시각 셋뿐이고, 스키마에도 텍스트 컬럼이 없다
 *    (supabase/migrations/20260730_shrine_obangki_draws.sql).
 *
 * ⚠️ 문구는 **단정 어투로 지시하지 않는다**(표시광고법 L-트랙 기준).
 *    "아껴라" ✗ / "지갑은 잠시 쉬고 싶다 하는구나" ○ — 금지 어휘는 테스트가 강제한다
 *    (__tests__/obangki.test.ts).
 *
 * KST 날짜 판정과 FNV-1a 해시는 액막이(R-1)가 이미 정한 의식 공통 규약이라 그대로 가져다 쓴다.
 * 같은 로직을 한 벌 더 두면 자정 경계·시드 규칙이 두 곳에서 갈릴 수 있다.
 */

import { hashSeed, kstDayKey } from './aekmak'
import type { Element } from '@/lib/domain/shrine/types'

// ─── 오방색 5기 ───────────────────────────────────────────────
//
// DB CHECK 제약(obangki_draws.color)과 **문자열이 같아야 한다**. 로그의 유일한 키다.
// 5색 의미는 CEO 원안 그대로 — 빨강 대길 · 하양 순리 · 노랑 무난 · 파랑 신중 · 초록 멈춤.

export type ObangkiColor = 'red' | 'white' | 'yellow' | 'blue' | 'green'

export const OBANGKI_COLORS: readonly ObangkiColor[] = Object.freeze([
  'red',
  'white',
  'yellow',
  'blue',
  'green',
] as const)

export interface ObangkiColorInfo {
  /** 표시명(한국어) */
  readonly label: string
  /** 깃발 머리 한자 한 자 */
  readonly seal: string
  /** 괘 이름 — 대길·순리·무난·신중·멈춤 */
  readonly verdict: string
  /** 깃발 천 색(설빛온기 톤). 에셋 404 여도 이 색으로 형태가 남는다 */
  readonly hex: string
  /** 펼침 버스트 파티클 색 */
  readonly accent: string
}

export const OBANGKI_COLOR_INFO: Readonly<Record<ObangkiColor, ObangkiColorInfo>> = Object.freeze({
  red: Object.freeze({ label: '홍기', seal: '赤', verdict: '대길', hex: '#B23A32', accent: '#E8836F' }),
  white: Object.freeze({ label: '백기', seal: '白', verdict: '순리', hex: '#D9CFBC', accent: '#F3EADA' }),
  yellow: Object.freeze({ label: '황기', seal: '黃', verdict: '무난', hex: '#C9A24C', accent: '#F0D48A' }),
  blue: Object.freeze({ label: '청기', seal: '靑', verdict: '신중', hex: '#3E5F86', accent: '#8FB4DA' }),
  green: Object.freeze({ label: '녹기', seal: '綠', verdict: '멈춤', hex: '#4A7C59', accent: '#9CCBA6' }),
})

/** 서버 입력 검증용 타입 가드 — 액션은 이걸 통과한 값만 DB 로 보낸다. */
export function isObangkiColor(value: unknown): value is ObangkiColor {
  return typeof value === 'string' && (OBANGKI_COLORS as readonly string[]).includes(value)
}

// ─── 질문 유형 3종 ────────────────────────────────────────────
//
// DB CHECK 제약(obangki_draws.qtype)과 **문자열이 같아야 한다**.
// 유형은 문구의 어미를 가른다 — 고를 때 / 지금 할까 말까 / 쓸까 말까.

export type ObangkiQType = 'choice' | 'timing' | 'money'

export const OBANGKI_QTYPES: readonly ObangkiQType[] = Object.freeze(['choice', 'timing', 'money'] as const)

export const OBANGKI_QTYPE_LABEL: Readonly<Record<ObangkiQType, string>> = Object.freeze({
  choice: '무엇을 고를까',
  timing: '지금 할까 말까',
  money: '쓸까 말까',
})

/** 유형별 입력 안내 — 화면 플레이스홀더. */
export const OBANGKI_QTYPE_HINT: Readonly<Record<ObangkiQType, string>> = Object.freeze({
  choice: '짜장면 / 짬뽕',
  timing: '오늘 보낸다 / 내일 보낸다',
  money: '산다 / 안 산다',
})

export function isObangkiQType(value: unknown): value is ObangkiQType {
  return typeof value === 'string' && (OBANGKI_QTYPES as readonly string[]).includes(value)
}

// ─── 정책 상수 ────────────────────────────────────────────────

/** 하루(KST) 무료 뽑기. 이후는 복채. */
export const OBANGKI_DAILY_FREE = 3

/**
 * 무료 소진 후 1회 값 — **wallets.balance 단위(1 = 1만냥)**.
 * shaman-chat 의 PURCHASE_COST 와 같은 단위다. 차감은 lib/services/bokchae.ts 의
 * spendBokchae 만 쓴다(공개 액션에서 지갑을 직접 만지지 않는다).
 */
export const OBANGKI_EXTRA_COST = 1

/** 선택지 개수 범위 — 5기에 배정하므로 5를 넘으면 빈 깃발이 없어져 뽑는 재미가 사라진다. */
export const OBANGKI_OPTION_MIN = 2
export const OBANGKI_OPTION_MAX = 4

/** 선택지 한 개의 길이 상한(자). 원문은 저장되지 않으므로 **화면**이 지키는 값이다. */
export const OBANGKI_OPTION_TEXT_MAX = 14

/** 법무 고지 — 효능이 아니라 놀이임을 명시한다(PRD §2 확정 문구). */
export const OBANGKI_DISCLAIMER = '재미로 보는 전통 놀이 점괘입니다 — 중요한 결정의 근거로 삼지 마세요'

/** 화면 고지 — 무저장이 이 기능의 약속이라 입력 옆에서 먼저 말한다. */
export const OBANGKI_PRIVACY_NOTICE = '질문과 선택지는 저장되지 않습니다 — 남는 것은 깃발 색뿐입니다.'

/**
 * 연출 타임라인(ms) — app/shrine-scene.css 의 같은 이름 키프레임 길이와 **같아야 한다**.
 * 어긋나면 방울이 셔플보다 늦게 끝나거나 펼침이 말풍선보다 빨리 끝난다. 대조는 테스트가 한다.
 * 국면 전환 자체는 setTimeout 체인이 아니라 CSS animationend 가 몬다(ObangkiSheet).
 */
export const OBANGKI_MS = Object.freeze({
  /** 칠성방울 — 셔플과 겹쳐 울린다 */
  bell: 700,
  /** 5기 교차 셔플 */
  shuffle: 1100,
  /** 위로 쓸어 뽑기 — 깃발이 솟는 구간 */
  pull: 550,
  /** 펼침(scaleY + rotate) */
  unfurl: 900,
})

/** 뽑기로 인정할 최소 위쪽 이동(px). ARCH §4 의 임계값. */
export const OBANGKI_DRAG_THRESHOLD = 40

// ─── 결정론 시드 ──────────────────────────────────────────────
//
// 시드 = userId + KST 날짜 + 회차(seq). 같은 셋이면 셔플·배정·문구가 항상 같다.
//
// ⚠️ 뿌리(dailySeed)는 **서버가 만들어 내려보낸다**. 화면이 userId 문자열을 들고 있을 이유가 없고,
//    공유 카드·DOM 스냅샷에 계정 식별자가 섞이는 길도 그만큼 줄어든다.

/** 오늘치 시드의 뿌리 — userId + KST 날짜. */
export function dailySeed(userId: string, dateKey: string): number {
  return hashSeed(`obangki|${userId}|${dateKey}`)
}

/** 회차 시드 — 같은 (뿌리, seq)면 항상 같은 값. seq 는 그날의 뽑기 순번(0부터). */
export function drawSeed(base: number, seq: number): number {
  const s = Number.isFinite(seq) ? Math.max(0, Math.floor(seq)) : 0
  return hashSeed(`${base >>> 0}|${s}`)
}

/** 선형 합동 생성기 한 걸음 — Math.random 을 쓰면 리렌더마다 깃발이 뒤바뀐다. */
function step(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0
}

/** 시드 → 0 이상 max 미만의 정수. max<=0 이면 0. */
function pickIndex(seed: number, max: number): number {
  if (max <= 0) return 0
  return (Math.imul(seed >>> 0, 2654435761) >>> 0) % max
}

/** 결정론 Fisher-Yates — 원본을 건드리지 않고 새 배열을 만든다. */
function shuffled<T>(source: readonly T[], seed: number): T[] {
  const out = [...source]
  let s = step(seed)
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = pickIndex(s, i + 1)
    const t = out[i]
    out[i] = out[j]
    out[j] = t
    s = step(s)
  }
  return out
}

// ─── 셔플 · 배정 ──────────────────────────────────────────────

/**
 * 5기의 진열 순서 — 같은 시드면 항상 같은 배열이고, 언제나 5색이 하나씩 들어 있다.
 * "빨강=짬뽕" 같은 하드코딩이 성립하지 않으므로(선택지가 자유 입력) 색은 **톤**만 정하고
 * 답은 아래 배정이 정한다 — PRD §2 의 구조 그대로다.
 */
export function shuffleFlags(seed: number): ObangkiColor[] {
  return shuffled(OBANGKI_COLORS, seed)
}

/**
 * 깃발 5기 뒤에 선택지를 배정한 결과 — 값은 options 배열의 인덱스다.
 *
 * 선택지가 2~4개라 5기에 고르게 흩는다(2개면 3:2, 3개면 2:2:1, 4개면 2:1:1:1).
 * 같은 선택지가 한쪽에 몰리면 "뽑기"가 아니라 "정해진 답"이 된다.
 * 선택지가 없으면 빈 배열 — 화면이 배정 없이 색만 보여준다.
 */
export function assignOptions(optionCount: number, seed: number): number[] {
  const n = Number.isFinite(optionCount) ? Math.floor(optionCount) : 0
  if (n <= 0) return []
  const capped = Math.min(n, OBANGKI_COLORS.length)
  // 0,1,2,…,0,1,… 로 5칸을 채운 뒤 통째로 섞는다 — 개수 균형이 구성 단계에서 이미 보장된다
  const slots: number[] = []
  for (let i = 0; i < OBANGKI_COLORS.length; i += 1) slots.push(i % capped)
  return shuffled(slots, step(seed))
}

/** 한 번의 뽑기가 확정한 것 — 색·괘·(있다면) 배정된 선택지 인덱스. */
export interface ObangkiDraw {
  color: ObangkiColor
  /** 진열 순서에서의 자리(0~4) */
  flagIndex: number
  /** 배정된 선택지 인덱스. 선택지를 안 적었으면 null */
  optionIndex: number | null
}

/**
 * 진열·배정을 한 번에 확정한다. 화면은 이 결과를 들고 깃발을 그리고, 뽑힌 자리만 펼친다.
 * flagIndex 는 사용자가 고른 자리라 인자로 받는다(그 선택만이 유일한 비결정 입력이다).
 */
export function resolveDraw(seed: number, optionCount: number, flagIndex: number): ObangkiDraw {
  const flags = shuffleFlags(seed)
  const slots = assignOptions(optionCount, seed)
  const idx = Number.isFinite(flagIndex) ? Math.min(flags.length - 1, Math.max(0, Math.floor(flagIndex))) : 0
  return {
    color: flags[idx],
    flagIndex: idx,
    optionIndex: slots.length > idx ? slots[idx] : null,
  }
}

// ─── 문구 풀 (색 5 × 유형 3 × 변형 8 = 120) ───────────────────
//
// 규율: 지시·단정 금지. 재촉·확언("반드시"·"무조건"·"보장")과 금전 지시("사라"·"팔아라"·"투자")는
//       테스트가 막는다. 신위는 **본 것을 말할 뿐** 시키지 않는다.

const OBANGKI_LINES: Readonly<Record<ObangkiColor, Readonly<Record<ObangkiQType, readonly string[]>>>> = Object.freeze({
  red: Object.freeze({
    choice: Object.freeze([
      '홍기가 먼저 섰구나. 마음이 이미 기울어 있던 쪽이다.',
      '붉은 기운이 환하다. 오늘은 손이 가는 대로 두어도 좋겠구나.',
      '기가 앞장선다. 망설임이 길어질 자리는 아니로구나.',
      '불빛이 이쪽을 비춘다. 눈이 먼저 간 것이 답이었구나.',
      '홍기가 바람을 탄다. 고른 것이 마음을 가볍게 하겠구나.',
      '붉은 천이 활짝 폈다. 오늘 이 자리에 온기가 있구나.',
      '기폭이 힘차다. 이쪽 길이 오늘은 넓어 보이는구나.',
      '홍기가 열렸다. 고민한 만큼 이미 답을 알고 있었구나.',
    ]),
    timing: Object.freeze([
      '홍기가 먼저 섰구나. 지금이 물러설 때는 아니로구나.',
      '붉은 기운이 앞으로 뻗는다. 발을 떼기 좋은 날이구나.',
      '기가 활짝 폈다. 미뤄둔 것이 오늘 가벼워지겠구나.',
      '불빛이 길을 비춘다. 늦출 이유가 보이지 않는구나.',
      '홍기가 바람을 탄다. 오늘 움직임에 결이 있구나.',
      '붉은 천이 높이 올랐다. 때가 이쪽으로 기울어 있구나.',
      '기폭이 앞장선다. 마음먹은 날이 오늘이었구나.',
      '홍기가 열렸다. 기다림보다 걸음이 어울리는 날이구나.',
    ]),
    money: Object.freeze([
      '홍기가 먼저 섰구나. 지갑이 오늘은 너그러운 얼굴이구나.',
      '붉은 기운이 환하다. 손에 쥔 것이 아깝지 않을 자리로구나.',
      '기가 활짝 폈다. 오래 눈에 밟히던 것이었구나.',
      '불빛이 이쪽을 비춘다. 오늘의 씀씀이는 무겁지 않겠구나.',
      '홍기가 바람을 탄다. 값보다 마음이 큰 물건이로구나.',
      '붉은 천이 높이 올랐다. 오늘은 셈이 순하게 풀리겠구나.',
      '기폭이 힘차다. 미뤄둔 것을 오늘 들여도 자리가 있겠구나.',
      '홍기가 열렸다. 마음이 먼저 값을 치른 뒤였구나.',
    ]),
  }),
  white: Object.freeze({
    choice: Object.freeze([
      '백기가 섰구나. 순리대로 흘러가는 쪽에 손이 닿았구나.',
      '흰 천이 조용히 폈다. 억지 없는 자리로구나.',
      '기가 곧게 선다. 애써 고르지 않아도 될 일이었구나.',
      '백기가 바람에 눕는다. 흐르는 대로 두어도 어긋나지 않겠구나.',
      '흰빛이 맑다. 둘 중 어느 쪽이든 큰 탈은 없어 보이는구나.',
      '기폭이 담담하다. 오늘은 결이 순한 쪽이 어울리는구나.',
      '백기가 열렸다. 순서를 지키면 저절로 풀릴 일이구나.',
      '흰 천이 가만하다. 마음을 크게 쓰지 않아도 될 자리로구나.',
    ]),
    timing: Object.freeze([
      '백기가 섰구나. 순서가 오면 저절로 그때가 되겠구나.',
      '흰 천이 조용히 폈다. 서두르지 않아도 흐름은 이어지는구나.',
      '기가 곧게 선다. 오늘 아니어도 길은 닫히지 않는구나.',
      '백기가 바람에 눕는다. 물이 가는 쪽으로 가도 되는 날이구나.',
      '흰빛이 맑다. 억지로 당기지 않으면 순하게 오겠구나.',
      '기폭이 담담하다. 때가 스스로 자리를 잡는 중이구나.',
      '백기가 열렸다. 흐름을 거스를 일이 아니로구나.',
      '흰 천이 가만하다. 오늘의 몫만 하면 되는 날이구나.',
    ]),
    money: Object.freeze([
      '백기가 섰구나. 셈이 순리대로 맞아떨어지는 자리구나.',
      '흰 천이 조용히 폈다. 지갑이 놀랄 일은 없어 보이는구나.',
      '기가 곧게 선다. 오늘은 있는 만큼이 알맞은 날이구나.',
      '백기가 바람에 눕는다. 흐름대로 두어도 축나지 않겠구나.',
      '흰빛이 맑다. 크게 얻지도 잃지도 않을 자리로구나.',
      '기폭이 담담하다. 값이 제 자리를 찾아가는 중이구나.',
      '백기가 열렸다. 순서만 지키면 무리가 없겠구나.',
      '흰 천이 가만하다. 오늘의 셈은 조용히 지나가겠구나.',
    ]),
  }),
  yellow: Object.freeze({
    choice: Object.freeze([
      '황기가 섰구나. 어느 쪽이든 무난히 지나갈 자리구나.',
      '누런 천이 가운데서 폈다. 크게 갈릴 일이 아니로구나.',
      '기가 한가운데 선다. 고민한 값에 비해 차이가 작겠구나.',
      '황빛이 은은하다. 둘 다 나쁘지 않아 망설였던 것이구나.',
      '기폭이 느긋하다. 오늘은 고른 쪽이 답이 되는 날이구나.',
      '황기가 바람을 살짝 탄다. 결이 크게 다르지 않구나.',
      '누런 천이 열렸다. 어느 손을 펴도 크게 어긋나지 않겠구나.',
      '기가 가만히 선다. 마음 편한 쪽으로 두어도 되겠구나.',
    ]),
    timing: Object.freeze([
      '황기가 섰구나. 오늘이든 다음이든 무던히 흘러가겠구나.',
      '누런 천이 가운데서 폈다. 서둘 일도 미룰 일도 아니구나.',
      '기가 한가운데 선다. 때가 크게 좋지도 나쁘지도 않구나.',
      '황빛이 은은하다. 어느 날에 해도 결은 비슷하겠구나.',
      '기폭이 느긋하다. 마음이 편한 날을 골라도 되는구나.',
      '황기가 바람을 살짝 탄다. 흐름이 잔잔한 시기로구나.',
      '누런 천이 열렸다. 오늘 하면 오늘의 몫이 있을 뿐이구나.',
      '기가 가만히 선다. 조급함만 덜면 무난한 자리구나.',
    ]),
    money: Object.freeze([
      '황기가 섰구나. 지갑이 크게 흔들릴 자리는 아니구나.',
      '누런 천이 가운데서 폈다. 셈이 무던하게 맞아가는구나.',
      '기가 한가운데 선다. 오늘의 씀씀이는 평범하겠구나.',
      '황빛이 은은하다. 큰 이야기가 될 값은 아니로구나.',
      '기폭이 느긋하다. 서둘러 셈하지 않아도 되는 날이구나.',
      '황기가 바람을 살짝 탄다. 오르내림이 잔잔한 자리구나.',
      '누런 천이 열렸다. 들이든 아니든 표가 크게 나지 않겠구나.',
      '기가 가만히 선다. 오늘은 마음이 정하는 값이로구나.',
    ]),
  }),
  blue: Object.freeze({
    choice: Object.freeze([
      '청기가 섰구나. 한 번 더 들여다볼 구석이 남아 있구나.',
      '푸른 천이 천천히 폈다. 서둘러 고를 자리는 아니로구나.',
      '기가 낮게 흔들린다. 아직 보이지 않은 면이 있는 듯하구나.',
      '청빛이 깊다. 오늘은 눈을 한 번 더 뜨는 편이 낫겠구나.',
      '기폭이 무겁다. 마음이 반쯤만 기울어 있구나.',
      '청기가 바람을 재고 있다. 결정을 하루 뒤에 두어도 늦지 않구나.',
      '푸른 천이 열렸다. 물어볼 곳이 한 군데 남아 있구나.',
      '기가 조심스럽다. 조건을 다시 읽어보라는 자리구나.',
    ]),
    timing: Object.freeze([
      '청기가 섰구나. 지금은 발끝만 담글 때로구나.',
      '푸른 천이 천천히 폈다. 조금 더 두고 보아도 좋겠구나.',
      '기가 낮게 흔들린다. 때가 아직 여물지 않았구나.',
      '청빛이 깊다. 서두른 걸음이 되돌아올 자리구나.',
      '기폭이 무겁다. 오늘보다 다음이 순해 보이는구나.',
      '청기가 바람을 재고 있다. 하루쯤 재워두어도 상하지 않겠구나.',
      '푸른 천이 열렸다. 준비가 한 뼘 모자란 자리로구나.',
      '기가 조심스럽다. 한 박자 늦추면 길이 넓어지겠구나.',
    ]),
    money: Object.freeze([
      '청기가 섰구나. 지갑은 잠시 쉬고 싶다 하는구나.',
      '푸른 천이 천천히 폈다. 값을 한 번 더 견주어 볼 자리구나.',
      '기가 낮게 흔들린다. 오늘 셈에 빠진 항목이 있는 듯하구나.',
      '청빛이 깊다. 서둘러 치른 값이 눈에 밟히기 쉬운 날이구나.',
      '기폭이 무겁다. 장바구니에 하루 더 두어도 상하지 않겠구나.',
      '청기가 바람을 재고 있다. 급한 값일수록 천천히 보라는구나.',
      '푸른 천이 열렸다. 같은 물건이 다른 자리에도 있겠구나.',
      '기가 조심스럽다. 오늘은 셈을 다시 세어보는 날이구나.',
    ]),
  }),
  green: Object.freeze({
    choice: Object.freeze([
      '녹기가 섰구나. 오늘은 고르지 않는 것도 답이 되는구나.',
      '푸른 잎빛 천이 폈다. 손을 거두어도 되는 자리로구나.',
      '기가 제자리에 멈춘다. 둘 다 아닐 수도 있겠구나.',
      '녹빛이 짙다. 고르기 전에 물음을 다시 보라는구나.',
      '기폭이 움직이지 않는다. 오늘 정하지 않아도 될 일이구나.',
      '녹기가 가만히 선다. 셋째 길이 아직 남아 있구나.',
      '잎빛 천이 열렸다. 여기서 멈추면 잃을 것이 없구나.',
      '기가 자리를 지킨다. 마음이 아직 어느 쪽도 아니로구나.',
    ]),
    timing: Object.freeze([
      '녹기가 섰구나. 오늘은 그대로 두는 편이 낫겠구나.',
      '푸른 잎빛 천이 폈다. 걸음을 멈추어도 되는 날이구나.',
      '기가 제자리에 멈춘다. 지금은 때가 아니로구나.',
      '녹빛이 짙다. 서두르면 되돌아올 자리구나.',
      '기폭이 움직이지 않는다. 손을 놓고 지켜보라는구나.',
      '녹기가 가만히 선다. 오늘의 일은 오늘 두어도 되는구나.',
      '잎빛 천이 열렸다. 멈춤도 하나의 걸음이구나.',
      '기가 자리를 지킨다. 다음 자리에서 다시 물어도 늦지 않구나.',
    ]),
    money: Object.freeze([
      '녹기가 섰구나. 지갑은 오늘 문을 닫고 싶다 하는구나.',
      '푸른 잎빛 천이 폈다. 손을 거두면 남는 자리로구나.',
      '기가 제자리에 멈춘다. 오늘 치를 값은 아닌 듯하구나.',
      '녹빛이 짙다. 필요보다 마음이 앞선 자리구나.',
      '기폭이 움직이지 않는다. 장바구니를 그대로 두어도 좋겠구나.',
      '녹기가 가만히 선다. 오늘 아낀 것이 내일의 여유가 되겠구나.',
      '잎빛 천이 열렸다. 멈추면 잃을 것이 없는 자리구나.',
      '기가 자리를 지킨다. 지갑이 조금 더 쉬고 싶다 하는구나.',
    ]),
  }),
})

/** 변형 수 — 색·유형마다 이만큼 있어야 한다(테스트가 고정). */
export const OBANGKI_VARIANTS = 8

/** 뽑기 직후 신위의 한마디. 같은 (색, 유형, 시드)면 항상 같은 문장. */
export function obangkiLine(color: ObangkiColor, qtype: ObangkiQType, seed: number): string {
  const pool = OBANGKI_LINES[color][qtype]
  return pool[pickIndex(step(seed >>> 0), pool.length)]
}

/** 문구 풀 전체(테스트의 금지 어휘 린트 대상). */
export function allObangkiLines(): readonly string[] {
  return OBANGKI_COLORS.flatMap((c) => OBANGKI_QTYPES.flatMap((q) => [...OBANGKI_LINES[c][q]]))
}

/** 배정된 선택지를 곁들인 한 줄 — 선택지가 없으면 괘 이름만. 화면 자막용. */
export function verdictLine(color: ObangkiColor, option: string | null): string {
  const { label, verdict } = OBANGKI_COLOR_INFO[color]
  const trimmed = (option ?? '').trim()
  return trimmed.length > 0 ? `${label} · ${verdict} — ${trimmed}` : `${label} · ${verdict}`
}

// ─── 하루 판정 ────────────────────────────────────────────────
//
// KST 경계는 액막이와 같은 규약(kstDayKey). 무료분만 세고, 복채로 뽑은 것도 같은 로그에 남는다 —
// 그래서 "남은 무료"는 오늘 총 횟수에서 빼는 것이 아니라 **무료 상한과 총 횟수의 차**다.

/** 같은 KST 하루에 속한 뽑기 수. */
export function countDrawsOnDay(drawnAtMs: readonly number[], epochMs: number): number {
  const day = kstDayKey(epochMs)
  if (!day) return 0
  let n = 0
  for (const t of drawnAtMs) if (kstDayKey(t) === day) n += 1
  return n
}

/** 오늘(KST) 남은 무료 뽑기. 0~OBANGKI_DAILY_FREE 로 클램프. */
export function remainingFreeDraws(drawnAtMs: readonly number[], epochMs: number): number {
  const used = countDrawsOnDay(drawnAtMs, epochMs)
  return Math.max(0, Math.min(OBANGKI_DAILY_FREE, OBANGKI_DAILY_FREE - used))
}

/** 이번 뽑기가 복채를 무는가. */
export function isPaidDraw(todayCount: number): boolean {
  const n = Number.isFinite(todayCount) ? Math.max(0, Math.floor(todayCount)) : 0
  return n >= OBANGKI_DAILY_FREE
}

// ─── 자동 선출 (CEO 7차: "내가 고르는 게 아니라 랜덤으로 나오게") ───────────

/**
 * 이번 회차에 **저절로 나오는** 깃발 자리(0~4).
 *
 * 사용자 선택을 폐지했으므로 어느 기가 나오는지는 회차 시드가 정한다 — 같은 (userId, 날짜, seq)는
 * 항상 같은 자리다(Math.random 금지 규율 그대로). 진열(shuffleFlags)과 다른 소금을 쓰는 이유:
 * 같은 시드를 그대로 쓰면 선출이 진열 순서와 상관을 갖게 되고, 소금 하나로 두 결정이 독립이 된다.
 *
 * ⚠️ 이 함수가 서버 색 확정의 근거다: 서버 액션이 같은 시드로 이 함수를 불러 색을 스스로 계산하고,
 * 클라이언트는 그 색을 **보여줄 뿐**이다 — "시드 역산으로 미리 안다"는 감사 A3 P1 은 선택권이
 * 사라지면서 함께 소멸한다(알아도 할 수 있는 것이 없다).
 */
export function electIndex(seed: number): number {
  return pickIndex(hashSeed(`elect|${seed >>> 0}`), OBANGKI_COLORS.length)
}

// ─── 사주 해석 층 (CEO 7차: "해석은 그 사람 사주 데이터 기반") ──────────────

/** 오방색 ↔ 오행 — 전승 그대로: 청=木·홍=火·황=土·백=金, 흑(北·水)은 현대 무속 관행대로 녹이 대신한다. */
export const OBANGKI_COLOR_ELEMENT: Readonly<Record<ObangkiColor, Element>> = Object.freeze({
  blue: 'wood',
  red: 'fire',
  yellow: 'earth',
  white: 'metal',
  green: 'water',
})

/** 상생 고리 — 木生火 火生土 土生金 金生水 水生木 */
const SAENG: Readonly<Record<Element, Element>> = Object.freeze({
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
})
/** 상극 고리 — 木剋土 土剋水 水剋火 火剋金 金剋木 */
const GEUK: Readonly<Record<Element, Element>> = Object.freeze({
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
})

/**
 * 뽑힌 색의 오행과 사용자 용신(用神)의 관계 5종.
 * 생입 = 색이 용신을 살린다(가장 반가운 괘) · 비화 = 같은 기운 · 설기 = 용신이 힘을 내어준다 ·
 * 제압 = 용신이 색을 다스린다(주도권) · 극입 = 색이 용신을 누른다(느긋하게 갈 자리).
 */
export type SajuRelation = 'saengip' | 'bihwa' | 'seolgi' | 'jeap' | 'geukip'

export function sajuRelation(color: ObangkiColor, yongsin: Element): SajuRelation {
  const el = OBANGKI_COLOR_ELEMENT[color]
  if (el === yongsin) return 'bihwa'
  if (SAENG[el] === yongsin) return 'saengip'
  if (SAENG[yongsin] === el) return 'seolgi'
  if (GEUK[yongsin] === el) return 'jeap'
  return 'geukip'
}

/**
 * 관계별 문구 풀 — 기본 층(색×유형 120문) **위에 얹는 한 문장**이다. AI 0원·즉답 결정론 유지.
 * 규율은 기본 풀과 동일: 서술 어미(-구나/-이다/-네)만, 단정·명령·효능 주장 금지(금지어 린트 대상).
 */
const SAJU_LINES: Readonly<Record<SajuRelation, readonly string[]>> = Object.freeze({
  saengip: Object.freeze([
    '이 빛깔은 그대의 용신을 살리는 기운이구나 — 오늘의 걸음에 순풍이 실리겠다.',
    '그대에게 필요한 기운을 이 기가 곧장 데워 주는구나.',
    '용신이 반기는 빛이다 — 마음이 기우는 쪽에 힘이 실리겠구나.',
  ]),
  bihwa: Object.freeze([
    '그대의 용신과 같은 기운이 나왔구나 — 낯익은 힘이라 다루기 쉽겠다.',
    '같은 결의 기운이 어깨를 나란히 하는구나 — 서두르지 않아도 되겠다.',
    '용신과 한 빛깔이다 — 지금 하던 결을 그대로 이어가도 좋겠구나.',
  ]),
  seolgi: Object.freeze([
    '용신이 제 힘을 내어 이 빛을 밝히는구나 — 베푼 만큼 돌아오는 자리다.',
    '기운이 밖으로 흐르는 괘다 — 쏟은 정성이 모양을 갖추겠구나.',
    '내어주며 여는 자리구나 — 무리하지 않는 선에서 움직여 보거라 하는 뜻이다.',
  ]),
  jeap: Object.freeze([
    '그대의 용신이 이 기운을 다스리는구나 — 주도권이 그대 손에 있다.',
    '용신이 고삐를 쥔 괘다 — 조건을 그대가 정해도 되겠구나.',
    '그대가 판을 이끄는 형국이다 — 차분히 몫을 챙기면 되겠구나.',
  ]),
  geukip: Object.freeze([
    '이 기운이 용신을 살짝 누르는구나 — 오늘은 느긋하게 한 걸음 늦춰도 좋겠다.',
    '맞바람이 조금 있는 괘다 — 급한 마음만 내려놓으면 탈이 없겠구나.',
    '기운이 팽팽한 자리구나 — 오늘은 지키는 쪽이 이기는 날이겠다.',
  ]),
})

/** 사주 층 한 문장 — 같은 (색, 용신, 시드)는 항상 같은 문장. 용신이 없으면 호출하지 않는다. */
export function sajuLine(color: ObangkiColor, yongsin: Element, seed: number): string {
  const pool = SAJU_LINES[sajuRelation(color, yongsin)]
  return pool[pickIndex(hashSeed(`saju|${color}|${yongsin}|${seed >>> 0}`), pool.length)]
}

/** 문구 풀 전체(금지 어휘 린트 대상). */
export function allSajuLines(): readonly string[] {
  return (Object.keys(SAJU_LINES) as SajuRelation[]).flatMap((r) => [...SAJU_LINES[r]])
}
