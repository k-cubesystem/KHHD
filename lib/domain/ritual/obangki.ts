/**
 * 오방기(五方旗) 점괘 도메인 — 문복(問卜) 의식 R-2 (PRD-shrine-rituals-v1 §2 / PLAN-obangki-samgi-v1).
 *
 * 전 함수 순수(side-effect 0) · 결정론. 시각·시드는 호출자가 인자로 주입한다
 * (SSR·클라 동일 결과 = 하이드레이션 불일치 0 — aekmak.ts·scene-clock.ts 와 같은 규약).
 *
 * ⚠️ 이 모듈은 **아뢰는 말을 서버로 보내지 않는다**.
 *    화면이 받는 것은 시드뿐이고, 아뢴 말은 state 에만 살다 사라진다.
 *    로그에 남는 것은 색·문복 갈래·시각 셋뿐이고, 스키마에도 텍스트 컬럼이 없다
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

// ─── 오방색 5기 = 오방신장(五方神將) ──────────────────────────
//
// DB CHECK 제약(obangki_draws.color)과 **문자열이 같아야 한다**. 로그의 유일한 키다.
//
// ⚠️ 2026-07-31 8차: 임의로 정했던 괘(대길·순리·무난·신중·멈춤)를 **전승 그대로**로 바꿨다.
//    오방기는 색에 길흉이 붙은 제비가 아니라 **다섯 신장이 각자 맡은 것**이 있고,
//    뽑힌 색은 "얼마나 좋은가"가 아니라 **"어느 신이 답했는가"**를 가리킨다:
//
//      동 청기 — 동방청제신장 · 신장  — 우환(憂患) · 터와 액
//      남 홍기 — 남방적제신장 · 산신  — 재수(財數) · 바라는 것
//      중 황기 — 중앙황제신장 · 조상  — 조상(祖上) · 집안의 뿌리
//      서 백기 — 서방백제신장 · 칠성  — 명복(命福) · 몸과 명
//      북 흑기 — 북방흑제신장 · 영산  — 부정(不淨) · 묵은 것
//
//    ⚠️ 북방은 본디 흑기이나 1970년대 이후 흑·청이 불길하다 하여 색을 바꿔 쓰는 관행이 생겼고,
//       지금 무구(巫具)는 녹기가 그 자리에 선다. 우리도 녹기를 쓰되 방위·오행(北·水)은 흑기의 것을 잇는다.
//       뜻도 "죽음(死)"이 아니라 **부정(不淨) — 물려야 할 묵은 것**으로 잡았다.
//       전승이 흑을 녹으로 바꾼 이유가 그 무거움이었고, 애초에 오방기에는 **물리고 다시 뽑는 절차**가
//       딸려 있어(obangki-reading.ts 부정풀이) "돌이킬 수 없는 괘"라는 것이 성립하지 않는다.
//
//    ⚠️ 길흉 배정은 스승·지역마다 다르다는 것이 전승 자체의 특징이다. 우리는 한 갈래로 고정한다 —
//       홍·백은 길, 청·황은 반흉반길, 녹은 흉. 섞어 쓰면 같은 색이 화면마다 다른 말을 하게 된다.

export type ObangkiColor = 'red' | 'white' | 'yellow' | 'blue' | 'green'

export const OBANGKI_COLORS: readonly ObangkiColor[] = Object.freeze([
  'red',
  'white',
  'yellow',
  'blue',
  'green',
] as const)

/** 길흉 — 길(吉) · 반흉반길(半凶半吉) · 흉(凶). */
export type ObangkiFortune = 'gil' | 'ban' | 'hyung'

export interface ObangkiColorInfo {
  /** 표시명(한국어) */
  readonly label: string
  /** 깃발 머리 한자 한 자 */
  readonly seal: string
  /** 소관(所管) — 이 신장이 맡은 것. 재수·명복·조상·우환·부정 */
  readonly verdict: string
  /** 오방신장 명호 */
  readonly general: string
  /** 모시는 갈래 — 산신·칠성·조상·신장·영산 */
  readonly deity: string
  /** 갈래를 우리말로 한 줄 */
  readonly gloss: string
  /** 방위 */
  readonly direction: string
  readonly fortune: ObangkiFortune
  /** 깃발 천 색(설빛온기 톤). 에셋 404 여도 이 색으로 형태가 남는다 */
  readonly hex: string
  /** 펼침 버스트 파티클 색 */
  readonly accent: string
}

export const OBANGKI_COLOR_INFO: Readonly<Record<ObangkiColor, ObangkiColorInfo>> = Object.freeze({
  red: Object.freeze({
    label: '홍기',
    seal: '赤',
    verdict: '재수',
    general: '남방적제신장',
    deity: '산신',
    gloss: '바라는 것과 재수를 맡는 갈래',
    direction: '남(南)',
    fortune: 'gil' as ObangkiFortune,
    hex: '#B23A32',
    accent: '#E8836F',
  }),
  white: Object.freeze({
    label: '백기',
    seal: '白',
    verdict: '명복',
    general: '서방백제신장',
    deity: '칠성',
    gloss: '명(命)과 복을 밝히는 갈래',
    direction: '서(西)',
    fortune: 'gil' as ObangkiFortune,
    hex: '#D9CFBC',
    accent: '#F3EADA',
  }),
  yellow: Object.freeze({
    label: '황기',
    seal: '黃',
    verdict: '조상',
    general: '중앙황제신장',
    deity: '조상',
    gloss: '집안의 뿌리를 맡는 갈래',
    direction: '중앙(中央)',
    fortune: 'ban' as ObangkiFortune,
    hex: '#C9A24C',
    accent: '#F0D48A',
  }),
  blue: Object.freeze({
    label: '청기',
    seal: '靑',
    verdict: '우환',
    general: '동방청제신장',
    deity: '신장',
    gloss: '터와 액을 다스리는 갈래',
    direction: '동(東)',
    fortune: 'ban' as ObangkiFortune,
    hex: '#3E5F86',
    accent: '#8FB4DA',
  }),
  green: Object.freeze({
    label: '녹기',
    seal: '綠',
    verdict: '부정',
    general: '북방흑제신장',
    deity: '영산',
    gloss: '묵은 것이 도는 자리',
    direction: '북(北)',
    fortune: 'hyung' as ObangkiFortune,
    hex: '#4A7C59',
    accent: '#9CCBA6',
  }),
})

/** 서버 입력 검증용 타입 가드 — 액션은 이걸 통과한 값만 DB 로 보낸다. */
export function isObangkiColor(value: unknown): value is ObangkiColor {
  return typeof value === 'string' && (OBANGKI_COLORS as readonly string[]).includes(value)
}

// ─── 문복(問卜) 갈래 7종 ─────────────────────────────────────
//
// DB CHECK 제약(obangki_draws.qtype)과 **문자열이 같아야 한다**.
//
// ⚠️ 2026-08-01 8차b: 「무엇을 고를까 / 지금 할까 말까 / 쓸까 말까」를 폐지하고 전통 문복 갈래로 바꿨다.
//    전승에서 오방기는 **선택지에 깃발을 배정하는 제비가 아니다** — 내린 공수를 확인하거나 처음
//    공수를 내릴 때 쓰는 도구이고, 묻는 것은 언제나 **한 가지 일(件)**이다.
//    갈림길마다 깃발을 배정하던 구조는 서양식 제비뽑기였지 오방기가 아니었다.
//
//    갈래는 "무슨 일로 왔는가"이고, 뽑힌 기는 "그 일에 어느 신이 작용하는가"다 —
//    둘은 겹치지 않는다. 혼사를 여쭈었는데 자리에 황기가 서면 "집안 쪽이 걸려 있다"가 된다.

export type ObangkiMatter = 'sinsu' | 'jaesu' | 'gwanjae' | 'honsa' | 'teo' | 'mom' | 'jason'

export const OBANGKI_MATTERS: readonly ObangkiMatter[] = Object.freeze([
  'sinsu',
  'jaesu',
  'gwanjae',
  'honsa',
  'teo',
  'mom',
  'jason',
] as const)

export interface ObangkiMatterInfo {
  /** 갈래 이름 */
  readonly label: string
  /** 한자 */
  readonly hanja: string
  /** 무엇을 다루는 갈래인가 — 칩 아래 한 줄 */
  readonly gloss: string
  /** 신께 아뢰는 말머리 — 고축문에 그대로 들어간다 */
  readonly plea: string
  /** 아뢰는 말 입력 안내 */
  readonly hint: string
}

export const OBANGKI_MATTER_INFO: Readonly<Record<ObangkiMatter, ObangkiMatterInfo>> = Object.freeze({
  sinsu: Object.freeze({
    label: '신수',
    hanja: '身數',
    gloss: '올 한 해 내 운수',
    plea: '신수를 여쭈옵니다',
    hint: '올해가 어떻게 흘러가겠는지',
  }),
  jaesu: Object.freeze({
    label: '재수',
    hanja: '財數',
    gloss: '돈·벌이·거래',
    plea: '재수를 여쭈옵니다',
    hint: '벌이가 어떻게 되겠는지',
  }),
  gwanjae: Object.freeze({
    label: '관재',
    hanja: '官災',
    gloss: '시비·구설·송사',
    plea: '관재를 여쭈옵니다',
    hint: '얽힌 시비가 어찌 풀리겠는지',
  }),
  honsa: Object.freeze({
    label: '혼사',
    hanja: '婚事',
    gloss: '인연·혼인',
    plea: '혼사를 여쭈옵니다',
    hint: '이 인연이 어디로 가겠는지',
  }),
  teo: Object.freeze({
    label: '터',
    hanja: '基',
    gloss: '집·이사·자리',
    plea: '터를 여쭈옵니다',
    hint: '옮길 자리가 어떠하겠는지',
  }),
  mom: Object.freeze({
    label: '몸',
    hanja: '身',
    gloss: '건강·기력',
    plea: '몸을 여쭈옵니다',
    hint: '몸이 어찌 되겠는지',
  }),
  jason: Object.freeze({
    label: '자손',
    hanja: '子孫',
    gloss: '자식·집안 사람',
    plea: '자손을 여쭈옵니다',
    hint: '집안 사람 일이 어찌 되겠는지',
  }),
})

export function isObangkiMatter(value: unknown): value is ObangkiMatter {
  return typeof value === 'string' && (OBANGKI_MATTERS as readonly string[]).includes(value)
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

/**
 * 아뢰는 말 한 줄의 길이 상한(자). 원문은 저장되지 않으므로 **화면**이 지키는 값이다.
 * 한 번에 한 가지 일만 아뢰는 것이 전승이라, 길이 제한이 곧 "여러 건을 몰아 묻지 않게" 하는 장치다.
 */
export const OBANGKI_PLEA_TEXT_MAX = 40

/** 법무 고지 — 효능이 아니라 놀이임을 명시한다(PRD §2 확정 문구). */
export const OBANGKI_DISCLAIMER = '재미로 보는 전통 놀이 점괘입니다 — 중요한 결정의 근거로 삼지 마세요'

/** 화면 고지 — 무저장이 이 기능의 약속이라 입력 옆에서 먼저 말한다. */
export const OBANGKI_PRIVACY_NOTICE = '아뢰는 말은 저장되지 않습니다 — 남는 것은 갈래와 깃발 색뿐입니다.'

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
  /** 삼기 한 기가 앞으로 나오는 구간 — .obangki-samgi */
  samgi: 620,
  /** 부정풀이 — 물린 기가 흩어지는 구간. .obangki-purified */
  purify: 920,
  /** 펼침(scaleX + rotate) */
  unfurl: 900,
})

/**
 * 삼기가 한 기씩 나오는 **간격**(ms). 이것만은 CSS 길이가 아니라 지연 계산값이라
 * OBANGKI_MS 밖에 둔다 — samgi(620)보다 짧아 연출이 조금 겹치고, 그래야 셋이 끊기지 않는다.
 * 화면이 이 값으로 --ob-delay 를 만든다(같은 값을 TSX 에 또 적으면 두 곳이 갈린다).
 */
export const OBANGKI_SAMGI_STEP_MS = 460

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
 * 삼기는 이 진열에서 자리를 빌리지 않고 **앞줄에 따로 선다**(색이 겹칠 수 있어서다) —
 * 여기 5기는 "말려 있던 다섯"을 보여 주는 배경이다.
 */
export function shuffleFlags(seed: number): ObangkiColor[] {
  return shuffled(OBANGKI_COLORS, seed)
}

// ─── 신당지기 맺음말 (갈래 7 × 변형 4 = 28) ──────────────────
//
// 색이 하는 말은 삼기 두루마리(자리·뿌리·향방 15문 + 공수 25쌍)가 이미 다 한다.
// 여기 남는 것은 **아뢴 일 자체에 대한 맺음말** 하나다 — 색과 무관하게 갈래만 본다.
// (8차b 이전의 색×유형 120문은 삼기 층과 말이 겹쳐 폐지했다. 같은 자리를 두 번 말하면 풀이가 흐려진다.)
//
// 규율: 지시·단정 금지. 재촉·확언("반드시"·"무조건"·"보장")과 금전 지시("사라"·"팔아라")는
//       테스트가 막는다. 신위는 **본 것을 말할 뿐** 시키지 않는다.

const MATTER_LINES: Readonly<Record<ObangkiMatter, readonly string[]>> = Object.freeze({
  sinsu: Object.freeze([
    '한 해의 결은 하루로 뒤집히지 않는다 — 오늘 본 것을 마음 한켠에 두고 지내면 되겠구나.',
    '운수를 여쭙는 자리는 앞을 정하는 자리가 아니라 앞을 아는 자리구나.',
    '한 해가 통째로 좋거나 나쁜 법은 없다 — 오르내림 가운데 어디쯤인지를 본 것이다.',
    '올해의 결을 알았으니 서두를 일도 겁낼 일도 조금은 덜하겠구나.',
  ]),
  jaesu: Object.freeze([
    '재물은 부르는 대로 오지 않고 길이 난 대로 온다 — 오늘 본 길이 그 길이다.',
    '벌이의 일은 셈보다 때가 먼저인 법이구나.',
    '드는 것과 나는 것이 함께 도는 자리다 — 한쪽만 보면 결이 어긋난다.',
    '재수를 여쭈었으니 오늘은 셈보다 마음을 먼저 고르는 편이 낫겠구나.',
  ]),
  gwanjae: Object.freeze([
    '얽힌 일은 힘으로 푸는 것이 아니라 순서로 푸는 것이구나.',
    '시비가 도는 자리에서는 말수가 곧 방패다.',
    '관재는 이기고 지는 일이 아니라 길고 짧음의 일이더구나.',
    '오늘 본 결을 알고 있으면 부딪는 자리에서 한 박자 늦출 수 있겠구나.',
  ]),
  honsa: Object.freeze([
    '인연의 일은 혼자 정하는 것이 아니라 둘이 같이 걸어야 보이는 것이구나.',
    '맺어질 것은 맺어지고 흩어질 것은 흩어진다 — 그 사이가 지금 자리다.',
    '혼사는 사람만의 일이 아니라 두 집안의 결이 함께 도는 일이더구나.',
    '오늘 본 것은 사람의 마음이 아니라 그 마음이 놓인 자리다.',
  ]),
  teo: Object.freeze([
    '터는 사람을 담는 그릇이라 그릇이 맞아야 편안한 법이구나.',
    '자리를 옮기는 일에는 방위와 때가 함께 따라붙는다.',
    '살던 자리를 떠나는 일은 두고 가는 것도 함께 보아야 하는 일이더구나.',
    '터의 일을 여쭈었으니 오늘 본 방위를 마음에 두고 살피면 되겠구나.',
  ]),
  mom: Object.freeze([
    '몸의 일은 신께 여쭙되 의원에게도 함께 물어야 하는 것이다.',
    '기력이 도는 결을 본 것이지 병을 본 것은 아니니 그리 알고 있거라 하는구나.',
    '몸은 마음을 따라 눕고 마음은 몸을 따라 흐리는 법이구나.',
    '오늘 본 것은 몸이 놓인 자리다 — 살피는 마음이 곧 첫 걸음이겠구나.',
  ]),
  jason: Object.freeze([
    '집안 사람의 일은 내 뜻대로 되는 일이 아니라 함께 기다리는 일이구나.',
    '자손의 결은 뿌리에서 올라오는 것이라 위를 먼저 살피는 법이더구나.',
    '지켜보는 것도 돌보는 것의 하나겠구나.',
    '오늘 본 것은 그 사람의 앞이 아니라 그대와 그 사람 사이의 결이다.',
  ]),
})

/** 갈래별 변형 수 — 갈래마다 이만큼 있어야 한다(테스트가 고정). */
export const OBANGKI_MATTER_VARIANTS = 4

/** 삼기 풀이 끝의 맺음말. 같은 (갈래, 시드)면 항상 같은 문장. */
export function matterLine(matter: ObangkiMatter, seed: number): string {
  const pool = MATTER_LINES[matter]
  return pool[pickIndex(hashSeed(`matter|${matter}|${seed >>> 0}`), pool.length)]
}

/** 문구 풀 전체(테스트의 금지 어휘 린트 대상). */
export function allMatterLines(): readonly string[] {
  return OBANGKI_MATTERS.flatMap((m) => [...MATTER_LINES[m]])
}

/**
 * 고축(告祝) — 신원을 아뢰는 말. 전승에서 점사는 "어디 사는 몇 년생 아무개가 아뢰옵니다"로 연다.
 *
 * ⚠️ 순수 함수다. 이름·생년은 **서버로 다시 보내지 않는다** — 앱이 이미 아는 값을 화면에서 문장으로
 *    엮을 뿐이고, 기록에 남는 것은 여전히 갈래·색·시각 셋뿐이다.
 */
export function gochukLine(name: string | null, birthYear: number | null, matter: ObangkiMatter): string {
  const who = (name ?? '').trim()
  const born = Number.isFinite(birthYear) && (birthYear ?? 0) > 0 ? `${birthYear}년생 ` : ''
  const subject = who.length > 0 ? `${born}${who}가` : '이 몸이'
  return `${subject} 오방신장 앞에 ${OBANGKI_MATTER_INFO[matter].plea}.`
}

/** 공유 자막 — 향방 기 한 줄. 아뢴 말은 절대 담지 않는다(무저장 원칙과 같은 규율). */
export function verdictLine(color: ObangkiColor): string {
  const { label, verdict } = OBANGKI_COLOR_INFO[color]
  return `${label} · ${verdict}`
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
