/**
 * 개운(開運) 처방 — **엔진이 정하고 AI 는 설명만 한다.**
 *
 * ## 왜 이 파일이 생겼나
 * 처방은 우리 상품에서 사용자가 **실제로 손에 쥐고 나가는 유일한 것**이다. 그런데 지금까지
 * 그 자리는 AI 가 매번 지어내고 있었다(종합사주 `REMEDY_1~3`, 테마 `actions`). 그러면 세 가지가
 * 무너진다 —
 *   ① 같은 사주에 다른 처방이 나온다(어제는 동쪽, 오늘은 서쪽).
 *   ② 근거를 댈 수 없다. 「왜 파란색인가」에 답이 없으면 그건 조언이 아니라 장식이다.
 *   ③ 무료와 유료의 차이를 «분량»으로밖에 못 만든다.
 *
 * 그래서 처방을 **용신·십성·신살에서 파생하는 순수 함수**로 옮겼다. 판정(L2)이 결정론이라
 * 서술(L3)을 믿을 수 있게 된 것과 같은 구조다(테마 마스터 §5-1).
 *
 * ## 🔴 오행 표의 단일 출처
 * 색·방위 표는 `woon-calculator.ts` 와 `yongsin-advanced.ts` 두 곳에 **이미 중복돼 있었다.**
 * 세 번째 사본을 만들지 않기 위해, 앞으로 처방에 쓰는 표는 이 파일이 정본이다. 기존 두 곳은
 * 각자 다른 용도(세운 요약·용신 한 줄)라 당장 건드리지 않되, 처방을 확장할 때는 여기만 고친다.
 *
 * ## 🔴 의료·재무 조언이 아니다
 * 「먹으면 낫는다」·「이 색이 돈을 부른다」는 효과 단정이다(표시광고법 §9-1). 처방은 «기운의
 * 결을 채우는 생활»로만 쓰고, 문안에 효과 보장을 넣지 않는다 — 테스트가 금지어를 막는다.
 */
import type { SajuContext } from '@/lib/saju-engine/context-builder'

/** 오행 다섯. 엔진이 한자로 돌려주므로 한자를 키로 쓴다. */
export type Element = '木' | '火' | '土' | '金' | '水'

const ELEMENTS: readonly Element[] = ['木', '火', '土', '金', '水']

export function isElement(value: string): value is Element {
  return (ELEMENTS as readonly string[]).includes(value)
}

/** 처방의 갈래 — 화면이 이 값으로 묶어 그린다. */
export type RemedyKind = 'color' | 'direction' | 'time' | 'season' | 'space' | 'body' | 'habit' | 'word' | 'relation'

export interface RemedyItem {
  readonly kind: RemedyKind
  /** 화면 소제목 — 「곁에 두는 색」 */
  readonly label: string
  /** 처방 본체 — 「짙은 남색·검정」 */
  readonly value: string
  /** 🔴 왜 이 처방인가. 엔진 값에서 그대로 파생한 사실이어야 한다(지어낸 근거 금지). */
  readonly basis: string
  /** 오늘 할 수 있는 한 가지. 「~하세요」가 아니라 «무엇을 하는지»로 쓴다. */
  readonly action: string
}

export interface RemedySet {
  /** 채워야 할 기운. */
  readonly yongsin: Element
  /** 곁들이면 좋은 기운. */
  readonly huisin: Element
  /** 과하면 눌리는 기운. */
  readonly gisin: Element
  /** 채우는 처방 — 유료는 전량, 무료는 맛보기 한 가지만 나간다. */
  readonly items: readonly RemedyItem[]
  /** 덜어내는 처방. */
  readonly avoid: readonly RemedyItem[]
}

// ===================== 오행 파생 표 (정본) =====================

const COLOR: Record<Element, string> = {
  木: '초록·청록',
  火: '붉은색·주황',
  土: '노랑·황토',
  金: '흰색·은색',
  水: '검정·짙은 남색',
}

const DIRECTION: Record<Element, string> = {
  木: '동쪽',
  火: '남쪽',
  土: '남서쪽·북동쪽',
  金: '서쪽',
  水: '북쪽',
}

/** 하루 중 그 기운이 도는 시간대(십이지 시). 「이때 하면 잘 된다」가 아니라 «몸이 붙는 시간»이다. */
const HOUR_BAND: Record<Element, string> = {
  木: '새벽 5시~오전 7시',
  火: '오전 11시~오후 1시',
  土: '오후 1시~3시',
  金: '오후 5시~7시',
  水: '밤 11시~새벽 1시',
}

const SEASON: Record<Element, string> = {
  木: '봄(2~4월)',
  火: '여름(5~7월)',
  土: '환절기(3·6·9·12월)',
  金: '가을(8~10월)',
  水: '겨울(11~1월)',
}

/** 집·사무실에서 손댈 자리. 돈이 들지 않는 것만 고른다. */
const SPACE: Record<Element, string> = {
  木: '동쪽 창가에 화분 하나',
  火: '남쪽 자리에 밝은 조명',
  土: '방 한가운데를 비우고 바닥을 드러내기',
  金: '서쪽 선반을 정리하고 금속 물건 하나',
  水: '북쪽에 어두운 색 소품, 물컵을 책상에',
}

/** 몸의 결. 🔴 효능이 아니라 «자주 먹는 결»로 쓴다. */
const BODY: Record<Element, string> = {
  木: '푸른 잎채소와 신맛, 아침 산책',
  火: '붉은 채소와 쓴맛, 땀이 나는 운동',
  土: '뿌리채소와 단맛, 규칙적인 식사 시간',
  金: '흰 음식과 매운맛, 깊게 쉬는 호흡',
  水: '검은 음식과 짠맛, 충분한 수면',
}

/**
 * 곁에 두면 힘이 되는 사람의 결 — 용신 오행을 **사람의 성정**으로 옮긴 것.
 *
 * 🔴 «어떤 사람을 만나라»가 아니라 «어떤 결이 나를 채우는가»다. 사람을 고르라는 말로 쓰면
 *    그 순간 상대를 평가하는 상품이 된다(채용절차법·명예훼손 인접 영역, 마스터 §9-2).
 */
const RELATION: Record<Element, string> = {
  木: '먼저 시작하고 벌여 놓는 사람 곁에서 숨이 트입니다',
  火: '말이 밝고 자리를 데우는 사람이 곁에 있으면 좋습니다',
  土: '약속을 지키고 기다려 주는 사람에게서 힘을 얻습니다',
  金: '맺고 끊는 것이 분명한 사람 곁에서 정리가 됩니다',
  水: '말을 아끼고 깊이 듣는 사람에게서 숨을 돌립니다',
}

/** 기신 쪽 — 덜어낼 것. 「금지」가 아니라 «과하지 않게»의 결로 쓴다. */
const AVOID_HINT: Record<Element, string> = {
  木: '초록 일색의 공간, 계획만 늘리는 습관',
  火: '붉은 조명 아래 오래 머무는 것, 밤늦은 흥분',
  土: '쌓아두는 습관, 정리 못 한 물건 더미',
  金: '차가운 금속 소음, 지나친 잣대',
  水: '어두운 방에 오래 있기, 밤을 새우는 일',
}

// ===================== 십성·신살 파생 (사람마다 갈리는 자리) =====================

/** 십성 다섯 무리 — 표시용 우리말 이름을 함께 둔다. 화면·프롬프트가 같은 말을 쓰게 하는 자리다. */
const SIPSEONG_GROUPS = [
  { key: 'gwan', plain: '책임을 맡는 결', members: ['정관', '편관'] },
  { key: 'siksang', plain: '만들어 내는 결', members: ['식신', '상관'] },
  { key: 'bigyeop', plain: '함께 가는 결', members: ['비견', '겁재'] },
  { key: 'jaeseong', plain: '벌이고 거두는 결', members: ['정재', '편재'] },
  { key: 'inseong', plain: '받아들이는 결', members: ['정인', '편인'] },
] as const

type SipseongGroup = (typeof SIPSEONG_GROUPS)[number]
type SipseongGroupKey = SipseongGroup['key']

/**
 * 무리별 «많을 때» 처방 — 그 기운이 과하면 생기는 버릇을 덜어내는 행동.
 *
 * 🔴 성격을 고치라는 말이 아니다. 기운이 몰린 자리에 **구조를 하나 놓는** 처방이다
 *    (「덜 예민해지세요」는 실행할 수 없고 「안 할 일을 한 줄 적으세요」는 오늘 할 수 있다).
 */
const HABIT_BY_GROUP: Record<SipseongGroupKey, { label: string; value: string; action: string }> = {
  gwan: {
    label: '경계를 문장으로',
    value: '할 일 목록 맨 위에 «오늘 안 할 일» 한 줄',
    action: '오늘 하지 않을 일 하나를 적어 눈에 보이는 곳에 둡니다.',
  },
  siksang: {
    label: '말을 하루 묵히기',
    value: '떠오른 말은 적어두고 다음 날 보내기',
    action: '지금 보내려던 메시지를 초안으로 두고 내일 다시 읽습니다.',
  },
  bigyeop: {
    label: '돈과 자리를 나누기',
    value: '함께 쓰는 돈·계정을 각자 몫으로 분리',
    action: '같이 쓰는 지출 하나를 정해 몫과 주기를 문서로 적습니다.',
  },
  jaeseong: {
    label: '벌인 일을 셋으로 자르기',
    value: '진행 중인 일을 세 개까지만 남기기',
    action: '벌여 둔 일을 적어 놓고 이번 주에 손대지 않을 것을 고릅니다.',
  },
  inseong: {
    label: '배우기 전에 하나 하기',
    value: '자료를 더 모으기 전에 작은 실행 하나',
    action: '오늘 배운 것 중 가장 작은 하나를 삼십 분 안에 해봅니다.',
  },
}

/** 신살 — 약점이 아니라 **쓰는 법**으로 뒤집는다(마스터 프롬프트 「신살 스킬트리」 규율 승계). */
const SINSAL_WORD: Record<string, { label: string; value: string; action: string }> = {
  역마살: {
    label: '자리를 옮겨 일하기',
    value: '같은 일을 다른 장소에서',
    action: '오늘 한 가지 일은 집이 아닌 곳에서 마칩니다.',
  },
  화개살: {
    label: '혼자 있는 시간을 일정에',
    value: '아무도 만나지 않는 한 시간',
    action: '이번 주 달력에 혼자 있는 시간 한 칸을 먼저 넣습니다.',
  },
  도화살: {
    label: '사람 앞에 서는 자리',
    value: '보이는 자리에서 말하기',
    action: '이번 주에 사람들 앞에서 말할 기회를 하나 만듭니다.',
  },
  천을귀인: {
    label: '도움을 먼저 청하기',
    value: '혼자 끌지 않고 한 사람에게 묻기',
    action: '막힌 일 하나를 정해 오늘 한 사람에게 묻습니다.',
  },
  귀문관살: {
    label: '직감을 적어 두기',
    value: '떠오른 예감을 기록으로',
    action: '오늘 스친 예감을 한 줄로 적고 날짜를 붙입니다.',
  },
  문창귀인: {
    label: '글로 정리하기',
    value: '생각을 문장으로 옮기기',
    action: '고민 하나를 열 줄로 적어 봅니다.',
  },
}

// ===================== 파생 =====================

function elementOf(value: string | undefined, fallback: Element): Element {
  return value && isElement(value) ? value : fallback
}

/** 십성 무리별 개수 — 가장 몰린 무리가 습관 처방을 정한다. */
function dominantGroup(distribution: Record<string, number>): SipseongGroup {
  let best: SipseongGroup = SIPSEONG_GROUPS[0]
  let bestCount = -1

  for (const group of SIPSEONG_GROUPS) {
    const count = group.members.reduce((sum, name) => sum + (distribution[name] ?? 0), 0)
    // 동수면 선언 순서가 이긴다 — 정렬이 흔들리면 같은 사주에 다른 처방이 나온다.
    if (count > bestCount) {
      best = group
      bestCount = count
    }
  }
  return best
}

/**
 * 처방 한 벌을 짓는다. **순수 함수** — 같은 사주는 언제 불러도 같은 처방이다.
 *
 * 🔴 `new Date()` 를 읽지 않는다. 「이달의 처방」 같은 시점 의존 항목을 넣고 싶어지는 자리지만,
 *    그러면 어제 본 처방과 오늘 본 처방이 달라져 사용자가 무엇을 믿을지 모르게 된다.
 */
export function buildRemedySet(ctx: SajuContext): RemedySet {
  const advanced = ctx.analysis.advancedYongsin
  const yongsin = elementOf(advanced?.finalYongsin, '土')
  const huisin = elementOf(advanced?.huisin, yongsin)
  const gisin = elementOf(advanced?.gisin, '金')

  const { sipseong, sinsal } = ctx.analysis
  const group = dominantGroup(sipseong.distribution)
  const habit = HABIT_BY_GROUP[group.key]

  // 신살은 여럿일 수 있다 — 표에 있는 것 중 **첫 번째**만 쓴다(선언 순서 고정 = 결정론).
  const sinsalHit = Object.keys(SINSAL_WORD).find((name) => sinsal.some((item) => item.name === name))

  const yongsinBasis = `채워야 할 기운이 ${yongsin}${advanced?.priority ? ` (${advanced.priority})` : ''}`

  const items: RemedyItem[] = [
    {
      kind: 'color',
      label: '곁에 두는 색',
      value: `${COLOR[yongsin]} — 곁들이면 ${COLOR[huisin]}`,
      basis: `${yongsinBasis} · 곁드는 기운은 ${huisin}`,
      action: `오늘 입는 옷이나 가방 중 하나를 ${COLOR[yongsin]} 쪽으로 고릅니다.`,
    },
    {
      kind: 'direction',
      label: '앉는 방향',
      value: `${DIRECTION[yongsin]}을 보고 앉기`,
      basis: `${yongsin} 기운이 도는 방위`,
      action: `책상 의자를 돌려 ${DIRECTION[yongsin]}을 보고 앉아 봅니다.`,
    },
    {
      kind: 'time',
      label: '몸이 붙는 시간',
      value: HOUR_BAND[yongsin],
      basis: `${yongsin} 기운이 도는 시간대`,
      action: `가장 중요한 일 하나를 ${HOUR_BAND[yongsin]} 사이에 둡니다.`,
    },
    {
      kind: 'season',
      label: '흐름이 트이는 철',
      value: SEASON[yongsin],
      basis: `${yongsin} 기운이 짙어지는 계절`,
      action: `크게 벌일 일이 있다면 ${SEASON[yongsin]}에 시작을 겹칩니다.`,
    },
    {
      kind: 'space',
      label: '집에서 손댈 자리',
      value: SPACE[yongsin],
      basis: `${DIRECTION[yongsin]}이 ${yongsin} 기운의 자리`,
      action: '오늘 그 자리 한 곳만 손봅니다. 돈은 들이지 않습니다.',
    },
    {
      kind: 'body',
      label: '몸을 고르는 결',
      value: BODY[yongsin],
      basis: `${yongsin} 기운과 같은 결의 음식·움직임`,
      action: '이번 주 장을 볼 때 그 결의 재료를 하나 담습니다.',
    },
    {
      kind: 'habit',
      label: habit.label,
      value: habit.value,
      basis: `${group.plain}이 명식에서 가장 두껍다`,
      action: habit.action,
    },
    {
      kind: 'relation',
      label: '곁에 두면 힘이 되는 결',
      value: RELATION[yongsin],
      basis: `${yongsin} 기운을 사람의 성정으로 옮긴 것 — 사람을 고르라는 말이 아니다`,
      action: '이번 주에 그런 결의 사람 한 명과 짧게라도 이야기를 나눕니다.',
    },
  ]

  if (sinsalHit) {
    const word = SINSAL_WORD[sinsalHit]
    items.push({
      kind: 'word',
      label: word.label,
      value: word.value,
      basis: `${sinsalHit} — 눌러 둘 것이 아니라 쓰면 힘이 되는 결`,
      action: word.action,
    })
  }

  const avoid: RemedyItem[] = [
    {
      kind: 'color',
      label: '과하지 않게',
      value: `${COLOR[gisin]} 일색`,
      basis: `${gisin} 기운은 지금 더 채우지 않아도 되는 쪽`,
      action: `방 안에서 ${COLOR[gisin]} 물건이 몰려 있는 곳을 하나 덜어냅니다.`,
    },
    {
      kind: 'habit',
      label: '덜어낼 버릇',
      value: AVOID_HINT[gisin],
      basis: `${gisin} 기운이 짙어지는 생활`,
      action: '그중 하나를 이번 주에 한 번만 건너뜁니다.',
    },
  ]

  return { yongsin, huisin, gisin, items, avoid }
}

/**
 * 무료 풀이가 내보내는 맛보기 — **한 가지만** 준다.
 *
 * 🔴 「무료에도 좋은 것이 있다」와 「유료에는 더 있다」를 동시에 만족해야 한다. 그래서 맛보기는
 *    가장 손쉬운 색 하나로 고정하고(오늘 당장 해볼 수 있다), 나머지 개수를 **사실 그대로** 알린다.
 *    개수를 부풀리면 그 순간 표시광고법 문제가 된다 — 그래서 숫자는 배열 길이에서 나온다.
 */
export function remedyTeaser(set: RemedySet): { readonly preview: RemedyItem; readonly hiddenCount: number } {
  const preview = set.items.find((item) => item.kind === 'color') ?? set.items[0]
  const hiddenCount = set.items.length - 1 + set.avoid.length

  return { preview, hiddenCount }
}

/** 프롬프트에 싣는 처방 블록. AI 는 이 값을 **설명**할 뿐 새로 만들지 않는다. */
export function remedyPromptBlock(set: RemedySet): string {
  const line = (item: RemedyItem) => `- [${item.label}] ${item.value} (근거: ${item.basis} / 행동: ${item.action})`

  return [
    '[개운 처방 — 엔진이 이미 정한 값이다. 새로 만들지 말고 이 항목을 사람의 말로 풀어 쓰라]',
    `채울 기운 ${set.yongsin} · 곁들일 기운 ${set.huisin} · 지금 더 채우지 않아도 되는 기운 ${set.gisin}`,
    ...set.items.map(line),
    '[덜어낼 것]',
    ...set.avoid.map(line),
  ].join('\n')
}
