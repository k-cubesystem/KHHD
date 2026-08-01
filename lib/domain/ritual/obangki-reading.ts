/**
 * 오방기 「삼기(三旗) 점사」 — 전승 그대로의 풀이 층 (CEO 8차: "심오한 풀이를 적용해줘").
 *
 * ─── 왜 세 기인가 (전거) ───────────────────────────────────────
 *
 * 실전 무속에서 오방기는 **한 번 뽑고 끝나지 않는다**. 내린 공수를 확인하거나 처음 공수를
 * 내릴 때 "보통 세 번 정도를 뽑아 길흉을 판단"하고, 그 **조합**으로 읽는다 —
 * 전해지는 예시가 그 문법을 그대로 보여준다:
 *
 *   「적기를 뽑고 백기를 뽑으면 → 칠성(백기) 기도를 하면 재수(적기)가 좋다」
 *
 * 즉 앞의 기는 **무슨 일인가**를, 뒤의 기는 **무엇을 하면 되는가**를 가리킨다.
 * 이 모듈은 그 문법을 세 자리로 정형화한다 — 자리(초기)·뿌리(중기)·향방(말기).
 * 자리·향방의 25쌍이 곧 위 예시의 공수이고, 뿌리가 그 사이를 설명한다.
 *
 * ─── 부정풀이 재차 뽑기 (전거) ──────────────────────────────────
 *
 * 「흑기를 뽑았을 때에는 무당이 주술적으로 잡귀를 쫓은 다음에 다시 뽑게 한다」 —
 * 나쁜 기가 서면 **물리고 다시 뽑는 것**이 전승의 절차다. 첫 자리(초기)에만 적용한다:
 * 판을 정하게 하고 시작한다는 뜻이라 자리에서만 성립하고, 뿌리·향방의 녹기는
 * "묵은 것이 뿌리다 / 물리는 것이 답이다"라는 제 뜻이 있어 물리면 오히려 말이 사라진다.
 *
 * ⚠️ 재차는 **1회로 끊는다**. 전승은 홍기가 나올 때까지 반복하지만, 그러면 녹기가 자리에
 *    영영 서지 못해 색 하나가 죽고 결과도 편향된다. 두 번째도 녹기면 그대로 세운다 —
 *    "거듭 섰으니 오늘은 물리는 일이 먼저다"가 그 자체로 온전한 점사다.
 *
 * ─── 규율 ───────────────────────────────────────────────────
 *
 * 전 함수 순수·결정론(Math.random 금지). 같은 회차 시드면 세 기·문구·흐름이 항상 같다 —
 * SSR·클라 동일 결과이자, 새로고침으로 점괘를 갈아치울 수 없다는 뜻이기도 하다.
 * 문구는 서술 어투만 쓴다(단정·명령·효능 주장 금지 — 금지어 린트가 강제).
 */

import { hashSeed } from './aekmak'
import {
  OBANGKI_COLORS,
  OBANGKI_COLOR_ELEMENT,
  OBANGKI_MATTER_INFO,
  matterLine,
  type ObangkiColor,
  type ObangkiMatter,
} from './obangki'
import type { Element } from '@/lib/domain/shrine/types'

// ─── 세 자리 ──────────────────────────────────────────────────

/** 초기 = 자리(무슨 일인가) · 중기 = 뿌리(어디서 왔는가) · 말기 = 향방(무엇을 하면 되는가). */
export type SamgiSlot = 'seat' | 'root' | 'way'

export const SAMGI_SLOTS: readonly SamgiSlot[] = Object.freeze(['seat', 'root', 'way'] as const)

export interface SamgiSlotInfo {
  /** 기 이름 — 초기·중기·말기 */
  readonly flagName: string
  /** 자리 이름 — 자리·뿌리·향방 */
  readonly title: string
  /** 이 자리가 묻는 것 */
  readonly question: string
}

export const SAMGI_SLOT_INFO: Readonly<Record<SamgiSlot, SamgiSlotInfo>> = Object.freeze({
  seat: Object.freeze({ flagName: '초기(初旗)', title: '자리', question: '지금 무슨 일인가' }),
  root: Object.freeze({ flagName: '중기(中旗)', title: '뿌리', question: '어디서 비롯되었는가' }),
  way: Object.freeze({ flagName: '말기(末旗)', title: '향방', question: '어디로 가는가' }),
})

// ─── 뽑기 ────────────────────────────────────────────────────

/**
 * 세 자리는 **각기 독립으로** 뽑는다 — 같은 색이 거듭 설 수 있어야 겹기(重旗)가 성립한다.
 * 자리마다 소금이 다르므로 한 자리의 결과로 다른 자리를 유추할 수 없다.
 */
function elect(seed: number, salt: string): ObangkiColor {
  const h = hashSeed(`samgi|${salt}|${seed >>> 0}`)
  return OBANGKI_COLORS[(Math.imul(h >>> 0, 2654435761) >>> 0) % OBANGKI_COLORS.length]
}

export interface SamgiDraw {
  readonly seat: ObangkiColor
  readonly root: ObangkiColor
  readonly way: ObangkiColor
  /**
   * 부정풀이로 **물린** 첫 기. 녹기가 자리에 섰을 때만 값이 있고, 그 경우 seat 는 재차 뽑은 결과다.
   * 화면은 이 값으로 정화 연출을 켠다 — 무엇을 물렸는지 보여주는 것까지가 의식이다.
   */
  readonly purified: ObangkiColor | null
}

/** 한 회차의 세 기. 서버·화면이 같은 회차 시드로 각각 불러도 결과가 같다. */
export function drawSamgi(roundSeed: number): SamgiDraw {
  const first = elect(roundSeed, 'seat')
  const purified = first === 'green' ? first : null
  return Object.freeze({
    seat: purified ? elect(roundSeed, 'seat-again') : first,
    root: elect(roundSeed, 'root'),
    way: elect(roundSeed, 'way'),
    purified,
  })
}

/** 자리별 색을 뽑아 순서대로 — 화면이 세 번의 뽑힘을 차례로 연출할 때 쓴다. */
export function samgiOrder(draw: SamgiDraw): readonly { slot: SamgiSlot; color: ObangkiColor }[] {
  return Object.freeze([
    { slot: 'seat' as SamgiSlot, color: draw.seat },
    { slot: 'root' as SamgiSlot, color: draw.root },
    { slot: 'way' as SamgiSlot, color: draw.way },
  ])
}

// ─── 자리별 한 줄 ─────────────────────────────────────────────

const SEAT_LINES: Readonly<Record<ObangkiColor, string>> = Object.freeze({
  red: '자리에 홍기가 섰다 — 바라는 기운이 이 일을 감싸고 있구나.',
  white: '자리에 백기가 섰다 — 위에서 지켜보는 손길이 이 일에 닿아 있구나.',
  yellow: '자리에 황기가 섰다 — 집안 쪽 결이 이 일에 얹혀 있구나.',
  blue: '자리에 청기가 섰다 — 터와 액의 기운이 걸려 있는 자리구나.',
  green: '자리에 녹기가 섰다 — 묵은 것이 앞을 가린 자리구나.',
})

const ROOT_LINES: Readonly<Record<ObangkiColor, string>> = Object.freeze({
  red: '뿌리에 홍기가 섰다 — 바라던 마음이 이미 크게 자라 있던 자리다.',
  white: '뿌리에 백기가 섰다 — 명(命)이 걸린 데서 비롯된 일이구나.',
  yellow: '뿌리에 황기가 섰다 — 집안 쪽에서 흘러온 결이구나.',
  blue: '뿌리에 청기가 섰다 — 터와 사람 사이에서 비롯된 일이구나.',
  green: '뿌리에 녹기가 섰다 — 오래 두었던 것이 아직 돌고 있구나.',
})

const WAY_LINES: Readonly<Record<ObangkiColor, string>> = Object.freeze({
  red: '향방은 홍기다 — 청하는 자리로 가면 될 일이다.',
  white: '향방은 백기다 — 명을 밝히는 쪽으로 길이 나 있구나.',
  yellow: '향방은 황기다 — 뿌리를 먼저 돌보라는 뜻이구나.',
  blue: '향방은 청기다 — 터와 액을 다스리는 쪽이구나.',
  green: '향방은 녹기다 — 물리고 비우는 것이 답인 자리구나.',
})

export function slotLine(slot: SamgiSlot, color: ObangkiColor): string {
  if (slot === 'seat') return SEAT_LINES[color]
  if (slot === 'root') return ROOT_LINES[color]
  return WAY_LINES[color]
}

// ─── 공수 25쌍 — 자리 × 향방 ──────────────────────────────────
//
// 전거의 문법 그대로다: 앞 기가 **무슨 일인가**, 뒤 기가 **무엇을 하면 되는가**.
// 「적기 뽑고 백기 뽑으면 → 칠성 기도를 하면 재수가 좋다」가 여기서는 red×white 한 칸이다.

const GONGSU: Readonly<Record<ObangkiColor, Readonly<Record<ObangkiColor, string>>>> = Object.freeze({
  red: Object.freeze({
    red: '이 일에 산신의 기운이 얹혀 있고 향방도 한 빛이구나 — 청하던 자리에서 다시 청하면 될 일이다.',
    white: '산신의 기운이 일을 감쌌으나 답은 칠성에 있구나 — 명을 먼저 밝히면 뒤가 따라 열리겠다.',
    yellow: '바라는 기운이 앞서는데 조상이 손을 내미는구나 — 뿌리를 먼저 대접하면 앞이 트이겠다.',
    blue: '산신의 기운이 섰으나 신장이 앞에 나서는구나 — 터와 액을 먼저 다스릴 일이다.',
    green: '바라는 마음은 큰데 앞에 묵은 것이 끼어 있구나 — 먼저 물리고 나서야 길이 보이겠다.',
  }),
  white: Object.freeze({
    red: '위에서 지켜보는 손길이 닿아 있고 향방은 산신이구나 — 청하는 자리로 가면 기운이 함께 서겠다.',
    white: '칠성의 빛이 거듭 이 일을 비추는구나 — 밝히던 것을 그대로 이어가면 될 일이다.',
    yellow: '명을 밝히는 기운이 섰는데 조상이 답하는구나 — 뿌리를 살피면 위아래가 함께 편해지겠다.',
    blue: '지켜보는 손길이 있으나 신장이 나서는구나 — 사람보다 터를 먼저 보라는 뜻이겠다.',
    green: '밝은 기운 앞에 묵은 것이 서 있구나 — 물리고 나면 저절로 환해지겠다.',
  }),
  yellow: Object.freeze({
    red: '집안 쪽 기운이 얹혀 있고 향방은 산신이구나 — 뿌리가 풀리면 바라던 것도 따라오겠다.',
    white: '조상의 결이 도는데 칠성이 답하는구나 — 명을 밝히는 정성이 뿌리까지 닿겠다.',
    yellow: '조상의 기운이 거듭 서는구나 — 뿌리 쪽을 오래 미뤄 둔 일이다.',
    blue: '집안 쪽 결이 도는데 신장이 나서는구나 — 사람이 아니라 터에서 온 일이겠다.',
    green: '뿌리 쪽에 묵은 것이 도는구나 — 먼저 물려야 집안이 편안해지겠다.',
  }),
  blue: Object.freeze({
    red: '터와 액의 기운이 걸려 있으나 산신이 길을 여는구나 — 청하는 쪽으로 방향을 돌리면 풀리겠다.',
    white: '걸림이 있는 자리에 칠성이 답하는구나 — 명을 밝히면 그늘이 옅어지겠다.',
    yellow: '걸림의 뿌리가 집안에 닿아 있구나 — 조상을 대접하면 가라앉겠다.',
    blue: '신장이 거듭 서는구나 — 터와 액을 정면으로 다스릴 일이다.',
    green: '걸림 밑에 묵은 것이 깔려 있구나 — 물리는 것이 첫 걸음이겠다.',
  }),
  green: Object.freeze({
    red: '묵은 기운으로 시작했으나 산신이 문을 여는구나 — 물리고 나면 바라던 자리가 서겠다.',
    white: '묵은 기운 위로 칠성이 빛을 내리는구나 — 밝히는 정성이 그늘을 걷겠다.',
    yellow: '묵은 기운의 뿌리가 집안에 있구나 — 조상을 대접하면 자리가 정해지겠다.',
    blue: '묵은 기운에 신장이 나서는구나 — 터를 다스리면 함께 걷히겠다.',
    green: '묵은 기운이 거듭 서는구나 — 오늘은 물리는 일 하나만으로 족하겠다.',
  }),
})

/**
 * 자리 × 향방 한 문장 — 삼기 점사의 본문이다.
 *
 * 갈래를 주면 앞에 말머리를 붙인다. 자리 기가 **주제**를 정하지 않는다는 것이 8차b 의 요지다 —
 * 무슨 일인지는 사용자가 이미 아뢨고, 기는 **그 일에 어느 신이 작용하는가**를 말한다.
 */
export function gongsuLine(seat: ObangkiColor, way: ObangkiColor, matter?: ObangkiMatter): string {
  const body = GONGSU[seat][way]
  return matter ? `${OBANGKI_MATTER_INFO[matter].label}의 일이다 — ${body}` : body
}

// ─── 오행 흐름 — 세 기가 이루는 결 ────────────────────────────

/**
 * 겹기 = 같은 기 거듭 · 순류 = 상생 연쇄 · 역류 = 거꾸로 흐름 · 일충 = 한 군데 상극 · 쌍충 = 두 군데 상극.
 *
 * ⚠️ 다섯 결은 **빠짐없이 나뉘고 겹치지 않는다**. 오행에서 서로 다른 두 기운은 반드시 生 아니면 剋이고,
 *    生을 낳는 기운은 하나뿐이라 이웃 두 쌍이 모두 生이면 연쇄(순류·역류)일 수밖에 없다.
 *    그래서 "생도 극도 아닌 흩어짐" 같은 자리는 성립하지 않는다 —
 *    처음에 그런 결(산기)을 두었다가 표본 3,000회에서 단 한 번도 나오지 않아 죽은 분기임을 알았다.
 *    남은 갈래는 상극이 **몇 군데인가**이고, 그것이 곧 얼마나 팽팽한가다.
 */
export type SamgiFlow = 'jungi' | 'sunryu' | 'yeokryu' | 'chung' | 'ssangchung'

const SAENG: Readonly<Record<Element, Element>> = Object.freeze({
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
})
const GEUK: Readonly<Record<Element, Element>> = Object.freeze({
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
})

/**
 * 판정 순서가 곧 우선순위다 — 겹기가 먼저다.
 * 같은 기가 거듭 선 것은 오행 관계보다 먼저 눈에 들어오는 사건이라 그렇다(신장이 두 번 말한 것).
 */
export function samgiFlow(draw: SamgiDraw): SamgiFlow {
  const [a, b, c] = [draw.seat, draw.root, draw.way].map((x) => OBANGKI_COLOR_ELEMENT[x])
  if (draw.seat === draw.root || draw.root === draw.way || draw.seat === draw.way) return 'jungi'
  if (SAENG[a] === b && SAENG[b] === c) return 'sunryu'
  if (SAENG[c] === b && SAENG[b] === a) return 'yeokryu'
  const clashes = (GEUK[a] === b || GEUK[b] === a ? 1 : 0) + (GEUK[b] === c || GEUK[c] === b ? 1 : 0)
  return clashes >= 2 ? 'ssangchung' : 'chung'
}

export interface SamgiFlowInfo {
  /** 결 이름 — 화면 배지 */
  readonly label: string
  /** 한 줄 풀이 */
  readonly line: string
}

export const SAMGI_FLOW_INFO: Readonly<Record<SamgiFlow, SamgiFlowInfo>> = Object.freeze({
  jungi: Object.freeze({
    label: '겹기(重旗)',
    line: '같은 기가 거듭 섰구나 — 한 말을 두 번 하는 것은 그만큼 무겁다는 뜻이다.',
  }),
  sunryu: Object.freeze({
    label: '순류(順流)',
    line: '세 기가 상생으로 이어졌구나 — 막힘 없이 흐르는 결이다.',
  }),
  yeokryu: Object.freeze({
    label: '역류(逆流)',
    line: '기운이 뒤로 흐르는 결이구나 — 서두르면 왔던 자리로 되돌아가겠다.',
  }),
  chung: Object.freeze({
    label: '일충(一沖)',
    line: '한 자리에서 기와 기가 부딪는구나 — 거기 한 번 걸리고 나서야 풀릴 결이다.',
  }),
  ssangchung: Object.freeze({
    label: '쌍충(雙沖)',
    line: '두 자리가 잇달아 부딪는구나 — 한꺼번에 풀 자리가 아니니 순서를 나누어 볼 결이다.',
  }),
})

// ─── 응기(應期) — 언제 응하는가 ───────────────────────────────
//
// 향방 기의 방위가 곧 시기다. 오방은 방위이면서 계절이기도 하다는 오행의 기본 문법을 그대로 쓴다.

export interface EunggiInfo {
  readonly season: string
  readonly months: string
}

export const EUNGGI: Readonly<Record<ObangkiColor, EunggiInfo>> = Object.freeze({
  blue: Object.freeze({ season: '봄', months: '인·묘월' }),
  red: Object.freeze({ season: '여름', months: '사·오월' }),
  yellow: Object.freeze({ season: '환절', months: '진·술·축·미월' }),
  white: Object.freeze({ season: '가을', months: '신·유월' }),
  green: Object.freeze({ season: '겨울', months: '해·자월' }),
})

/** 응기 한 줄 — 향방 기가 가리키는 때. */
export function eunggiLine(way: ObangkiColor): string {
  const { season, months } = EUNGGI[way]
  return `응기는 ${season}이다 — ${months}께 결이 드러나겠구나.`
}

// ─── 왕쇠(旺衰) — 명식의 오행 분포와 견준다 ────────────────────
//
// user_energy_profile 의 base_* 다섯 값이 그 사람 명식의 오행 분포다. 향방 기의 오행이
// 그 안에서 **가장 넘치는 것**인지 **가장 비어 있는 것**인지를 본다 — 같은 홍기라도
// 화(火)가 넘치는 명식과 화가 비어 있는 명식에 전혀 다르게 서기 때문이다.

export type Wangswe = 'taegwa' | 'bulgeup' | null

/** 오행 분포. 값은 명식에서 센 개수(음수·비유한 값은 0으로 본다). */
export type ElementSpread = Readonly<Record<Element, number>>

const ELEMENTS: readonly Element[] = Object.freeze(['wood', 'fire', 'earth', 'metal', 'water'] as const)

/**
 * 향방 기의 오행이 명식에서 태과(유일한 최대)인가 불급(유일한 최소)인가.
 * **유일할 때만** 판정한다 — 최대가 둘이면 "가장 넘친다"고 말할 근거가 없다.
 */
export function wangswe(way: ObangkiColor, spread: ElementSpread | null): Wangswe {
  if (!spread) return null
  const values = ELEMENTS.map((e) => (Number.isFinite(spread[e]) ? Math.max(0, spread[e]) : 0))
  const target = values[ELEMENTS.indexOf(OBANGKI_COLOR_ELEMENT[way])]
  const max = Math.max(...values)
  const min = Math.min(...values)
  if (max === min) return null
  if (target === max && values.filter((v) => v === max).length === 1) return 'taegwa'
  if (target === min && values.filter((v) => v === min).length === 1) return 'bulgeup'
  return null
}

const WANGSWE_LINES: Readonly<Record<'taegwa' | 'bulgeup', string>> = Object.freeze({
  taegwa: '그대 명식에 이미 넘치는 기운이 또 섰구나 — 더 채우기보다 덜어내는 쪽이 순하겠다.',
  bulgeup: '그대 명식에서 가장 비어 있던 자리를 이 기가 채우는구나 — 오래 기다린 기운이다.',
})

export function wangsweLine(w: Wangswe): string | null {
  return w ? WANGSWE_LINES[w] : null
}

// ─── 처방(處方) — 전승의 해법을 신당의 의식으로 ────────────────
//
// 전승은 기마다 할 일이 정해져 있다: 적=산신제·재수굿 / 백=칠성기도·명굿 / 황=조상대우·천도 /
// 청=신장축원·터 다스림 / 녹=부정풀이. 그 갈래를 신당에 이미 있는 의식으로 잇는다.
// ⚠️ 잇는 것은 **무료로 할 수 있는 정성**이 우선이다 — 점괘가 결제로 이어지면 점사가 아니라 판매가 된다.

export interface SamgiRemedy {
  /** 전승의 이름 */
  readonly rite: string
  /** 신당에서 할 일 */
  readonly action: string
  readonly href: string
}

export const SAMGI_REMEDY: Readonly<Record<ObangkiColor, SamgiRemedy>> = Object.freeze({
  red: Object.freeze({ rite: '산신제·재수굿', action: '백일기도를 올린다', href: '/protected/shrine/baekil' }),
  white: Object.freeze({ rite: '칠성기도·명굿', action: '오늘의 기도를 올린다', href: '/protected/shrine' }),
  yellow: Object.freeze({ rite: '조상 대접', action: '가족 신당을 돌본다', href: '/protected/family' }),
  blue: Object.freeze({ rite: '신장 축원', action: '액막이 부적을 태운다', href: '/protected/shrine' }),
  green: Object.freeze({ rite: '부정풀이', action: '액막이 부적을 태운다', href: '/protected/shrine' }),
})

// ─── 한 회차의 완성된 점사 ────────────────────────────────────

export interface SamgiReading {
  readonly draw: SamgiDraw
  /** 자리·뿌리·향방 세 줄 */
  readonly slotLines: readonly { slot: SamgiSlot; color: ObangkiColor; line: string }[]
  /** 본문 — 자리 × 향방 공수 */
  readonly gongsu: string
  readonly flow: SamgiFlow
  readonly flowInfo: SamgiFlowInfo
  readonly eunggi: string
  /** 명식 분포가 없으면 null */
  readonly wangswe: string | null
  readonly remedy: SamgiRemedy
  /** 부정을 물렸다면 그 한 줄 */
  readonly purifyLine: string | null
  /** 아뢴 일에 대한 신당지기 맺음말 — 색과 무관하게 갈래만 본다 */
  readonly closing: string
}

const PURIFY_LINE = '첫 기에 녹기가 섰기에 부정을 물리고 다시 뽑았다 — 전승이 이르는 대로다.'

/** 회차 시드 하나로 점사 전체를 확정한다. 서버·화면 어디서 불러도 같은 결과다. */
export function readSamgi(roundSeed: number, spread: ElementSpread | null, matter: ObangkiMatter): SamgiReading {
  const draw = drawSamgi(roundSeed)
  const flow = samgiFlow(draw)
  return Object.freeze({
    draw,
    slotLines: samgiOrder(draw).map(({ slot, color }) => ({ slot, color, line: slotLine(slot, color) })),
    gongsu: gongsuLine(draw.seat, draw.way, matter),
    flow,
    flowInfo: SAMGI_FLOW_INFO[flow],
    eunggi: eunggiLine(draw.way),
    wangswe: wangsweLine(wangswe(draw.way, spread)),
    remedy: SAMGI_REMEDY[draw.way],
    purifyLine: draw.purified ? PURIFY_LINE : null,
    closing: matterLine(matter, roundSeed),
  })
}

/** 문구 풀 전체(금지 어휘 린트 대상). */
export function allReadingLines(): readonly string[] {
  return [
    ...OBANGKI_COLORS.map((c) => SEAT_LINES[c]),
    ...OBANGKI_COLORS.map((c) => ROOT_LINES[c]),
    ...OBANGKI_COLORS.map((c) => WAY_LINES[c]),
    ...OBANGKI_COLORS.flatMap((s) => OBANGKI_COLORS.map((w) => GONGSU[s][w])),
    ...(Object.keys(SAMGI_FLOW_INFO) as SamgiFlow[]).map((f) => SAMGI_FLOW_INFO[f].line),
    ...OBANGKI_COLORS.map((c) => eunggiLine(c)),
    WANGSWE_LINES.taegwa,
    WANGSWE_LINES.bulgeup,
    PURIFY_LINE,
  ]
}

// ─── 쉬운 말 층 (CEO 8차c: "너무 어렵다 — 이해하기 편하면서도 깊이 있게") ──────
//
// 깊이를 덜어내는 것이 아니라 **순서를 바꾼다**. 결론과 쉬운 말이 앞에 서고,
// 신장 명호·오행 원리·공수 원문 같은 층은 뒤에서 펼쳐 본다.
// 전문 용어는 지우지 않는다 — 지우면 얕아진다. 대신 **쉬운 말을 먼저, 한자를 곁에** 둔다.

/** 자리 이름을 물음말로 — 초기/중기/말기 대신 지금/어디서/어떻게. */
export const SAMGI_SLOT_PLAIN: Readonly<Record<SamgiSlot, string>> = Object.freeze({
  seat: '지금',
  root: '어디서',
  way: '어떻게',
})

/** 흐름 이름을 쉬운 말로 — 순류/역류/일충/쌍충/겹기의 뜻만 남긴다. */
export const SAMGI_FLOW_PLAIN: Readonly<Record<SamgiFlow, string>> = Object.freeze({
  jungi: '같은 말이 거듭됩니다',
  sunryu: '막힘없이 흐릅니다',
  yeokryu: '기운이 뒤로 돕니다',
  chung: '한 군데 걸립니다',
  ssangchung: '두 군데 걸립니다',
})

/**
 * 결론 한 줄 — 두루마리 맨 위에 선다.
 * 향방 기 하나만 보고 만든다(결론은 향방이 쥐고 있다). 한자도 신격도 쓰지 않는다.
 */
const HEADLINE: Readonly<Record<ObangkiColor, string>> = Object.freeze({
  red: '청하고 나서면 되는 자리입니다',
  white: '몸과 마음을 먼저 밝힐 자리입니다',
  yellow: '집안 쪽을 먼저 돌볼 자리입니다',
  blue: '걸린 것을 먼저 다스릴 자리입니다',
  green: '묵은 것을 먼저 물릴 자리입니다',
})

export function headline(way: ObangkiColor): string {
  return HEADLINE[way]
}

// ─── 명식 층 — 일간(日干) 대비 육친(六親) ────────────────────
//
// CEO 8차c: "내 사주와 오행을 사용해서 같이 해석해줘. 내 명식에 있는 데이터를 사용해서."
//
// 용신·오행 분포만으로는 "그 기운이 **나에게** 무엇인가"를 말할 수 없다. 명리에서 그 자리를
// 맡는 것이 육친(六親)이고, 기준은 **일간(日干) — 태어난 날의 천간**, 곧 명식에서 나 자신이다.
// 오행 다섯 관계가 곧 육친 다섯이라 눈금이 하나도 늘지 않으면서 뜻은 훨씬 구체적이 된다:
// "이 기운은 그대에게 재성(財星) — 다루고 거두는 자리"처럼.

export type Yukchin = 'bigyeop' | 'siksang' | 'jaeseong' | 'gwanseong' | 'inseong'

export interface YukchinInfo {
  /** 이름 */
  readonly label: string
  readonly hanja: string
  /** 쉬운 말 한 줄 — 이것이 화면의 본문이다 */
  readonly plain: string
  /** 한 걸음 더 — 접힌 층에서 펼친다 */
  readonly detail: string
}

export const YUKCHIN_INFO: Readonly<Record<Yukchin, YukchinInfo>> = Object.freeze({
  bigyeop: Object.freeze({
    label: '비겁',
    hanja: '比劫',
    plain: '나와 같은 편의 기운입니다 — 함께 가는 사람이자 겨루는 사람입니다.',
    detail:
      '일간과 같은 오행이다. 힘을 보태 주기도 하고 몫을 나눠 갖기도 하는 자리라, 혼자보다 여럿이 되는 일에서 뚜렷해진다.',
  }),
  siksang: Object.freeze({
    label: '식상',
    hanja: '食傷',
    plain: '내가 내놓는 기운입니다 — 말·솜씨·베풂이 나가는 자리입니다.',
    detail:
      '일간이 생(生)하는 오행이다. 안에 있던 것이 밖으로 나가는 결이라 쏟은 만큼 모양을 갖추고, 지나치면 기운이 새기도 한다.',
  }),
  jaeseong: Object.freeze({
    label: '재성',
    hanja: '財星',
    plain: '내가 다루는 기운입니다 — 거두고 셈하는 자리입니다.',
    detail:
      '일간이 극(剋)하는 오행이다. 손에 쥘 수 있는 것을 뜻하되 쥐려면 힘이 있어야 하는 자리라, 몸과 뜻이 여물었을 때 제 값을 한다.',
  }),
  gwanseong: Object.freeze({
    label: '관성',
    hanja: '官星',
    plain: '나를 누르는 기운입니다 — 자리·규율·맡은 일이 걸린 곳입니다.',
    detail:
      '일간을 극(剋)하는 오행이다. 눌린다고 나쁜 것만은 아니다 — 틀이 있어야 모양이 잡히는 자리라 감당할 만하면 그것이 곧 자리가 된다.',
  }),
  inseong: Object.freeze({
    label: '인성',
    hanja: '印星',
    plain: '나를 돕는 기운입니다 — 배움·문서·손윗사람의 손길입니다.',
    detail: '일간을 생(生)하는 오행이다. 받는 자리라 편안하되 기대기만 하면 걸음이 늦어지는 결도 함께 있다.',
  }),
})

/**
 * 뽑힌 색이 **그 사람에게** 무엇인가 — 일간 오행 기준 육친 판정.
 * 기준이 용신(필요한 기운)이 아니라 **일간(나 자신)**이라는 것이 sajuRelation 과의 차이다.
 */
export function yukchin(color: ObangkiColor, dayElement: Element): Yukchin {
  const el = OBANGKI_COLOR_ELEMENT[color]
  if (el === dayElement) return 'bigyeop'
  if (SAENG[dayElement] === el) return 'siksang'
  if (GEUK[dayElement] === el) return 'jaeseong'
  if (GEUK[el] === dayElement) return 'gwanseong'
  return 'inseong'
}

/** 문구 풀 전체(금지 어휘 린트 대상) — 쉬운 말 층까지. */
export function allPlainLines(): readonly string[] {
  return [
    ...OBANGKI_COLORS.map((c) => HEADLINE[c]),
    ...(Object.keys(SAMGI_FLOW_PLAIN) as SamgiFlow[]).map((f) => SAMGI_FLOW_PLAIN[f]),
    ...(Object.keys(YUKCHIN_INFO) as Yukchin[]).flatMap((y) => [YUKCHIN_INFO[y].plain, YUKCHIN_INFO[y].detail]),
  ]
}
