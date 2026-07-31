/**
 * 척전(擲錢) 「엽전 세 닢」 — 갈림길을 정하는 의식 R-4.
 *
 * ─── 전거 ────────────────────────────────────────────────────
 *
 * 태종실록 4년(1404) 10월 6일. 새 도읍을 두고 신하들이 송도·무악·한양으로 갈려 결정이 나지 않자,
 * 태종이 종묘에 들어가 향을 올리고 꿇어앉아 이천우에게 **쟁반 위에 동전을 던지게** 했다.
 * 한양 **2길1흉**, 송도 **1길2흉**, 무악 **1길2흉** — 그래서 한양으로 정했다.
 *
 * 곧 「길마다 엽전 세 닢을 던져 길(吉)의 수가 많은 쪽을 고르는 것」이 갈림길의 전통 해법이고,
 * 이 모듈은 그 셈을 그대로 옮긴다.
 *
 * ─── 오방기와 무엇이 다른가 ───────────────────────────────────
 *
 * 오방기는 **한 가지 일**에 신이 답하는 자리다(문복). 척전은 사람이 이미 길을 다 알고 있는데
 * 고르지 못할 때 **하늘에 맡기는** 자리다. 그래서 척전에는 신격도 처방도 없다 —
 * 나온 수를 세어 많은 쪽을 이르는 것이 전부이고, 그 담백함이 이 도구의 쓸모다.
 *
 * ─── 규율 ───────────────────────────────────────────────────
 *
 * 전 함수 순수·결정론(Math.random 금지). 같은 회차 시드면 같은 결과 —
 * 새로고침으로 결과를 갈아치울 수 없다는 뜻이기도 하다(그래야 "정해 준 것"이 된다).
 * 갈림길 **원문은 서버로 가지 않는다** — 남는 것은 갈래 수·고른 자리·시각뿐이다.
 */

import { hashSeed, kstDayKey } from './aekmak'

// ─── 정책 ────────────────────────────────────────────────────

/**
 * 하루(KST) 던지기 상한. **복채를 물리지 않는다** —
 * 점심 메뉴를 고르는 자리에 값을 붙이면 도구가 아니라 판매가 된다.
 * 상한이 있는 이유는 과금이 아니라 기록 폭주를 막기 위해서다.
 */
export const CHULJEON_DAILY_LIMIT = 10

/** 갈림길 수 — 태종의 세 갈래(송도·무악·한양)가 전거의 상한 근거다. 넷까지 허용한다. */
export const CHULJEON_WAY_MIN = 2
export const CHULJEON_WAY_MAX = 4

/** 갈림길 한 줄의 길이 상한(자). 원문은 저장되지 않으므로 **화면**이 지키는 값이다. */
export const CHULJEON_WAY_TEXT_MAX = 14

/** 길마다 던지는 엽전 수 — 실록의 셈 그대로 셋이다. */
export const CHULJEON_COINS = 3

/** 동수가 나왔을 때 다시 던지는 최대 횟수. 전승은 "결정이 날 때까지"지만 무한은 곤란하다. */
export const CHULJEON_MAX_ROUNDS = 3

export const CHULJEON_DISCLAIMER = '재미로 보는 전통 놀이 점괘입니다 — 중요한 결정의 근거로 삼지 마세요'

/** 화면 고지 — 무저장이 이 기능의 약속이라 입력 옆에서 먼저 말한다. */
export const CHULJEON_PRIVACY_NOTICE = '갈림길에 적으신 말은 저장되지 않습니다 — 남는 것은 갈래 수뿐입니다.'

/**
 * 연출 타임라인(ms) — app/shrine-scene.css 의 같은 이름 키프레임 길이와 **같아야 한다**.
 * 대조는 테스트가 한다. 국면 전환은 setTimeout 체인이 아니라 animationend 가 몬다.
 */
export const CHULJEON_MS = Object.freeze({
  /** 엽전 한 닢이 쟁반에 떨어져 구르는 구간 — .chuljeon-coin */
  coin: 720,
  /** 정해진 길에 도장이 찍히는 구간 — .chuljeon-seal */
  seal: 620,
})

/** 엽전 한 닢 사이의 간격(ms). coin 보다 짧아 셋이 이어져 떨어진다. */
export const CHULJEON_COIN_STEP_MS = 180
/** 갈래 사이의 간격(ms). 한 길의 세 닢이 다 구른 뒤 다음 길로 넘어간다. */
export const CHULJEON_WAY_STEP_MS = 640

// ─── 엽전 ────────────────────────────────────────────────────

/**
 * 엽전의 면 — 글자면(字)이 길(吉), 등면(背)이 흉(凶).
 * 상평통보의 앞면에 글자가 있고 뒷면이 민면인 것을 그대로 쓴다.
 */
export type CoinFace = 'gil' | 'hyung'

/** 선형 합동 생성기 한 걸음 — Math.random 을 쓰면 리렌더마다 결과가 뒤바뀐다. */
function step(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0
}

/**
 * 한 길에 던진 엽전 세 닢. 같은 (시드, 회차, 길)이면 항상 같은 면이다.
 *
 * 닢마다 소금이 다르므로 한 닢의 결과로 다른 닢을 유추할 수 없다 —
 * 셋이 한 해시에서 나오면 "글자면 둘이면 셋째는 늘 등면" 같은 결이 생긴다.
 */
export function throwCoins(roundSeed: number, wayIndex: number): CoinFace[] {
  const out: CoinFace[] = []
  for (let i = 0; i < CHULJEON_COINS; i += 1) {
    const h = hashSeed(`chuljeon|${roundSeed >>> 0}|${wayIndex}|${i}`)
    out.push((step(h) >>> 8) % 2 === 0 ? 'gil' : 'hyung')
  }
  return out
}

/** 길(吉)의 수 — 0~3. 실록의 "2길1흉"이 이 값 2다. */
export function countGil(faces: readonly CoinFace[]): number {
  let n = 0
  for (const f of faces) if (f === 'gil') n += 1
  return n
}

/** 괘 이름 — 3길 순길 · 2길 길 · 1길 흉 · 0길 순흉. 실록의 표기법(N길M흉)과 같은 눈금이다. */
export const CHULJEON_TALLY_LABEL: Readonly<Record<number, string>> = Object.freeze({
  0: '순흉',
  1: '흉',
  2: '길',
  3: '순길',
})

/** "2길 1흉" 표기 — 실록이 쓴 그대로. */
export function tallyText(gil: number): string {
  return `${gil}길 ${CHULJEON_COINS - gil}흉`
}

// ─── 한 판 ───────────────────────────────────────────────────

/** 한 길의 결과. */
export interface WayThrow {
  readonly index: number
  readonly faces: readonly CoinFace[]
  readonly gil: number
}

/** 한 라운드 — 이 라운드에 던진 길들과 그 결과. */
export interface ChuljeonRound {
  /** 1부터. 2 이상이면 동수라 다시 던진 판이다 */
  readonly round: number
  /** 이 판에 던진 길의 원래 인덱스들(동수 재차면 동수였던 길만 남는다) */
  readonly throws: readonly WayThrow[]
}

export interface ChuljeonResult {
  readonly rounds: readonly ChuljeonRound[]
  /** 정해진 길의 인덱스. 끝내 동수면 null */
  readonly picked: number | null
  /** 정해진 길의 길(吉) 수 */
  readonly gil: number | null
  /** 동수로 다시 던진 적이 있는가 */
  readonly retied: boolean
}

/**
 * 갈림길을 정한다 — 길마다 엽전 세 닢을 던져 길(吉)이 가장 많은 쪽을 고른다.
 *
 * 동수면 **동수인 길만** 다시 던진다(전거의 "결정이 나지 않자 다시"). 라운드는 최대 3회이고,
 * 그래도 갈리지 않으면 picked=null 이다 — 억지로 하나를 고르느니 "오늘은 정해지지 않았다"고
 * 말하는 편이 옳다. 라운드마다 시드에 소금을 더해 같은 판이 반복되지 않게 한다.
 */
export function castChuljeon(roundSeed: number, wayCount: number): ChuljeonResult {
  const n = Number.isFinite(wayCount) ? Math.floor(wayCount) : 0
  const ways = Math.max(CHULJEON_WAY_MIN, Math.min(CHULJEON_WAY_MAX, n))
  const rounds: ChuljeonRound[] = []
  let candidates = Array.from({ length: ways }, (_, i) => i)

  for (let r = 1; r <= CHULJEON_MAX_ROUNDS; r += 1) {
    const seed = r === 1 ? roundSeed : hashSeed(`again|${roundSeed >>> 0}|${r}`)
    const throws: WayThrow[] = candidates.map((index) => {
      const faces = throwCoins(seed, index)
      return { index, faces, gil: countGil(faces) }
    })
    rounds.push({ round: r, throws })

    const best = Math.max(...throws.map((t) => t.gil))
    const top = throws.filter((t) => t.gil === best)
    if (top.length === 1) {
      return Object.freeze({ rounds, picked: top[0].index, gil: top[0].gil, retied: r > 1 })
    }
    candidates = top.map((t) => t.index)
  }

  return Object.freeze({ rounds, picked: null, gil: null, retied: true })
}

// ─── 문구 ────────────────────────────────────────────────────
//
// 규율: 지시·단정 금지. 재촉·확언과 금전 지시는 테스트가 막는다.
// 척전은 신이 말하는 자리가 아니라 **셈이 말하는 자리**라 어투도 담백하다.

const PICK_LINES: Readonly<Record<number, readonly string[]>> = Object.freeze({
  3: Object.freeze([
    '세 닢이 모두 글자면으로 누웠다 — 이 길이 유난히 환하구나.',
    '엽전 셋이 한목소리를 냈다 — 망설일 자리가 아니었구나.',
    '순길이다 — 쟁반 위에서 이미 답이 나 있었구나.',
  ]),
  2: Object.freeze([
    '두 닢이 글자면으로 누웠다 — 한양을 정한 셈과 같은 수구나.',
    '길이 하나 앞섰다 — 크게 기울지는 않았으나 이쪽이구나.',
    '두 닢이 이쪽을 가리킨다 — 나머지 하나는 다음을 위해 남겨 두었구나.',
  ]),
  1: Object.freeze([
    '한 닢만 글자면이나 다른 길은 그마저도 없었다 — 그중에서는 이쪽이구나.',
    '오늘은 어느 길도 환하지 않다 — 그래도 굳이 고르자면 이쪽이구나.',
    '한 닢이 앞섰을 뿐이다 — 가볍게 딛고 가면 될 자리구나.',
  ]),
  0: Object.freeze([
    '글자면이 하나도 서지 않았다 — 오늘은 어느 길도 서두르지 않는 편이 낫겠구나.',
    '세 닢이 모두 등을 보였다 — 고르기보다 미루는 것이 답인 날도 있구나.',
    '쟁반이 조용하다 — 오늘의 셈은 여기까지구나.',
  ]),
})

/** 정해진 길에 붙는 한마디. 같은 (길 수, 시드)면 항상 같은 문장. */
export function pickLine(gil: number, seed: number): string {
  const pool = PICK_LINES[Math.max(0, Math.min(CHULJEON_COINS, gil))]
  return pool[(Math.imul(hashSeed(`pick|${gil}|${seed >>> 0}`) >>> 0, 2654435761) >>> 0) % pool.length]
}

/** 끝내 갈리지 않았을 때. */
export const CHULJEON_UNDECIDED_LINE =
  '세 번을 던졌으나 수가 나란하다 — 하늘도 아직 고르지 않았으니 오늘은 그대 마음에 맡기는구나.'

/** 동수로 다시 던졌을 때 앞에 붙는 줄. */
export const CHULJEON_RETIE_LINE = '수가 나란하여 그 길들만 다시 던졌다 — 결정이 나지 않으면 다시 던지는 것이 법도다.'

/** 전거 한 줄 — 결과 아래에 놓아 이 셈이 어디서 왔는지 밝힌다. */
export const CHULJEON_ORIGIN_LINE =
  '태종 4년, 새 도읍을 두고 뜻이 갈리자 종묘에서 엽전을 던져 한양(2길1흉)으로 정했다 — 그 셈이다.'

/** 문구 풀 전체(테스트의 금지 어휘 린트 대상). */
export function allChuljeonLines(): readonly string[] {
  return [
    ...[0, 1, 2, 3].flatMap((g) => [...PICK_LINES[g]]),
    CHULJEON_UNDECIDED_LINE,
    CHULJEON_RETIE_LINE,
    CHULJEON_ORIGIN_LINE,
  ]
}

// ─── 시드 · 하루 판정 ────────────────────────────────────────

/** 오늘치 시드의 뿌리 — userId + KST 날짜. 서버가 만들어 내려보낸다(오방기와 같은 규약). */
export function dailySeed(userId: string, dateKey: string): number {
  return hashSeed(`chuljeon|${userId}|${dateKey}`)
}

/** 회차 시드 — 같은 (뿌리, seq)면 항상 같은 값. seq 는 그날의 던진 순번(0부터). */
export function throwSeed(base: number, seq: number): number {
  const s = Number.isFinite(seq) ? Math.max(0, Math.floor(seq)) : 0
  return hashSeed(`${base >>> 0}|${s}`)
}

/** 같은 KST 하루에 속한 던지기 수. */
export function countThrowsOnDay(thrownAtMs: readonly number[], epochMs: number): number {
  const day = kstDayKey(epochMs)
  if (!day) return 0
  let n = 0
  for (const t of thrownAtMs) if (kstDayKey(t) === day) n += 1
  return n
}

/** 오늘(KST) 남은 던지기. 0~CHULJEON_DAILY_LIMIT 로 클램프. */
export function remainingThrows(thrownAtMs: readonly number[], epochMs: number): number {
  const used = countThrowsOnDay(thrownAtMs, epochMs)
  return Math.max(0, Math.min(CHULJEON_DAILY_LIMIT, CHULJEON_DAILY_LIMIT - used))
}
