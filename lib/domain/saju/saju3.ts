/**
 * 「3초 사주」 — 비로그인 공개 도구의 판정 규칙. **순수 함수만**(만세력·DB·AI 없음).
 *
 * 왜 이 모듈이 따로 있나: `/ilgan`(일간 한 글자 + 상)은 «무슨 말인지 모르겠다»로 반려됐다.
 * 사람이 궁금한 건 「내 일간이 뭐냐」가 아니라 **「나는 어떤 사람이고, 돈·인연·때는 어떠냐」**다.
 * 그래서 만세력 결과를 **한 줄 칭호 + 돈/인연/때 세 줄**로 옮긴다.
 *
 * 🔴 화면에 「일간」·한자·전문용어를 쓰지 않는다. 이 파일이 그 번역의 단일 출처다.
 * 🔴 세계관: 사주는 «어떻게 살아라»가 아니라 **지금 방향을 보는 나침반**이다. 어미는 «~편이야»로
 *    가능성을 말하고 단정하지 않는다(표시광고법 + 브랜드 원칙).
 * 🔴 클라이언트에서도 import 한다 — server-only 모듈을 끌어오지 말 것.
 */

export type Element = '木' | '火' | '土' | '金' | '水'

/** 화면에 나가는 우리말 이름. 한자는 절대 노출하지 않는다. */
export const ELEMENT_KO: Record<Element, string> = {
  木: '나무',
  火: '불',
  土: '흙',
  金: '쇠',
  水: '물',
}

export const ELEMENTS: Element[] = ['木', '火', '土', '金', '水']

/** X 가 낳는 것 (목생화 …) */
const SHENG: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
/** X 가 이기는 것 (목극토 …) */
const KE: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

function keyWhere(map: Record<Element, Element>, value: Element): Element {
  return ELEMENTS.find((e) => map[e] === value) as Element
}

/** 나를 기준으로 한 다섯 자리. 십성을 우리말 개념으로만 쓴다(화면엔 이 이름도 안 나간다). */
export interface Roles {
  /** 나와 같은 것 — 나를 세우는 힘 */
  sibling: Element
  /** 나를 낳아주는 것 — 배움·기댈 곳 */
  resource: Element
  /** 내가 낳는 것 — 표현·결과물 */
  output: Element
  /** 내가 다루는 것 — 돈 */
  wealth: Element
  /** 나를 누르는 것 — 책임·압박 */
  officer: Element
}

export function rolesOf(me: Element): Roles {
  return {
    sibling: me,
    resource: keyWhere(SHENG, me),
    output: SHENG[me],
    wealth: KE[me],
    officer: keyWhere(KE, me),
  }
}

export type RoleKey = keyof Roles

/**
 * 동점일 때의 우선순위. **밖으로 드러나는 자리부터** 고른다 — 사람이 «내 얘기»라고 느끼는 건
 * 안에 쌓인 것보다 밖에서 부딪치는 쪽이라서. 순서를 바꾸면 판정이 통째로 달라지므로 테스트로 고정한다.
 */
const ROLE_PRIORITY: RoleKey[] = ['officer', 'wealth', 'output', 'resource', 'sibling']

export type TypeSlug =
  | 'anchor'
  | 'tempered'
  | 'roller'
  | 'gate'
  | 'builder'
  | 'giver'
  | 'late-bloom'
  | 'learner'
  | 'solo'
  | 'crew'

export interface TypeInfo {
  readonly slug: TypeSlug
  /** 한 줄 칭호 — 공유 카드의 주인공 */
  readonly title: string
  /** 칭호를 풀어주는 한 구절 */
  readonly tagline: string
}

/** 열 가지 유형 = 가장 두드러진 자리(5) × 나를 세우는 힘의 많고 적음(2). */
const TYPES: Record<RoleKey, { strong: TypeInfo; weak: TypeInfo }> = {
  officer: {
    strong: {
      slug: 'anchor',
      title: '책임지고 버티는 형',
      tagline: '맡으면 끝까지 가는 사람. 대신 혼자 다 지고 가려는 게 버릇이야',
    },
    weak: {
      slug: 'tempered',
      title: '눌린 만큼 단단해지는 형',
      tagline: '지금은 눌리는 자리에 있지만, 그 압력이 결국 날을 만드는 쪽이야',
    },
  },
  wealth: {
    strong: {
      slug: 'roller',
      title: '손에 쥐면 굴리는 형',
      tagline: '가만두질 못하는 사람. 굴려서 키우는 재주가 있어',
    },
    weak: {
      slug: 'gate',
      title: '문이 여러 개인 형',
      tagline: '들어오는 길도 많고 나가는 길도 많아. 문 하나만 잠가도 확 달라져',
    },
  },
  output: {
    strong: {
      slug: 'builder',
      title: '일 벌이면서 크는 형',
      tagline: '가만있으면 좀이 쑤시는 사람. 벌인 만큼 실제로 커지는 쪽이야',
    },
    weak: {
      slug: 'giver',
      title: '퍼주면서 배우는 형',
      tagline: '먼저 주고 나중에 챙기는 사람. 내 몫을 남겨두는 연습만 하면 돼',
    },
  },
  resource: {
    strong: {
      slug: 'late-bloom',
      title: '늦게 피는 대기만성형',
      tagline: '지금 안 보이는 건 없어서가 아니라 아직 안 꺼냈기 때문이야',
    },
    weak: {
      slug: 'learner',
      title: '배우면서 자리 잡는 형',
      tagline: '남의 것을 내 것으로 바꾸는 데 능해. 시작이 늦어도 따라잡는 쪽',
    },
  },
  sibling: {
    strong: {
      slug: 'solo',
      title: '혼자서도 끝내는 형',
      tagline: '남한테 맡기느니 내가 하고 마는 사람. 그래서 잘 지치기도 해',
    },
    weak: {
      slug: 'crew',
      title: '사람 속에서 크는 형',
      tagline: '혼자보다 같이일 때 훨씬 잘하는 사람. 붙을 자리를 고르는 게 관건이야',
    },
  },
}

/** 돈 — 내가 다루는 자리가 몇 개인가. «많으면 부자»가 아니라는 게 이 줄의 핵심이다. */
const MONEY: readonly string[] = [
  '돈 자리가 비어 있는 편이야. 한 방보다 꾸준한 쪽이 맞고, 목돈은 작정하고 묶어야 남아',
  '들어오고 나가는 게 조용한 편이야. 크게 안 새는 대신 크게 안 불어',
  '버는 재주는 있는 편이야. 문제는 버는 속도가 아니라 나가는 속도고',
  '들어오는 문이 많은 편이야. 문이 많으면 나가는 문도 많아서, 하나는 아예 안 보이게 잠가둬야 해',
]

function moneyLine(wealthCount: number): string {
  return MONEY[Math.min(wealthCount, MONEY.length - 1)]
}

/** 인연 — 배우자 자리(일지)가 나에게 어떤 자리인가. */
const LOVE: Record<RoleKey, string> = {
  sibling: '편한 사람한테 마음이 열리는 편이야. 오래 본 사이가 어느 날 다르게 보이기도 해',
  resource: '나를 돌봐주는 쪽에 끌리는 편이야. 기대는 게 나쁜 게 아니라 그게 네 자리야',
  output: '내가 먼저 챙기고 먼저 주는 편이야. 주다 지치지만 않으면 오래가는 쪽',
  wealth: '끌리면 먼저 다가가는 편이야. 속도가 빠른 만큼 식는 것도 빠르니 한 박자만 늦춰봐',
  officer: '먼저 다가가기보다 알아봐 주는 사람한테 열리는 편이야. 그래서 늦게 시작되는 편이고',
}

/** 때 — 나를 세우는 힘이 얼마나 되나. 언제 판이 커지는가. */
const TIMING = {
  early: '일찍부터 밀어붙일 힘이 있는 편이야. 30대 중반 전에 판을 한번 벌이게 되는 쪽',
  mid: '쌓은 만큼 나오는 편이야. 앞당기려고 서두르면 오히려 한 바퀴 돌아가게 돼',
  late: '늦게 트이는 편이야. 30대 후반부터 판이 커지는 쪽이라, 지금은 쌓는 구간이고',
} as const

export interface Saju3Input {
  /** 일간의 오행 — 나 자신 */
  me: Element
  /** 여덟 글자의 오행 분포 (합 8) */
  elements: Record<Element, number>
  /** 일지의 오행 — 배우자 자리 */
  spouseSeat: Element
}

export interface Saju3Result {
  type: TypeInfo
  /** 화면의 오행 5칸 — 우리말 이름과 개수 */
  bars: Array<{ element: Element; ko: string; count: number }>
  /** 가장 많은 것 / 하나도 없는 것 (없으면 null) */
  most: { element: Element; ko: string; count: number }
  missing: Array<{ element: Element; ko: string }>
  lines: { money: string; love: string; timing: string }
}

/** 나를 세우는 힘(같은 것 + 낳아주는 것). 8칸 중 4 이상이면 «센 쪽». */
export function supportCount(input: Saju3Input): number {
  const r = rolesOf(input.me)
  return (input.elements[r.sibling] ?? 0) + (input.elements[r.resource] ?? 0)
}

/** 다섯 자리 중 가장 두드러진 것. 동점은 ROLE_PRIORITY 로 깬다(결정론). */
export function dominantRole(input: Saju3Input): RoleKey {
  const r = rolesOf(input.me)
  let best: RoleKey = ROLE_PRIORITY[0]
  let bestCount = -1
  for (const key of ROLE_PRIORITY) {
    const count = input.elements[r[key]] ?? 0
    if (count > bestCount) {
      best = key
      bestCount = count
    }
  }
  return best
}

export function buildSaju3(input: Saju3Input): Saju3Result {
  const roles = rolesOf(input.me)
  const support = supportCount(input)
  const role = dominantRole(input)
  const type = TYPES[role][support >= 4 ? 'strong' : 'weak']

  const bars = ELEMENTS.map((element) => ({
    element,
    ko: ELEMENT_KO[element],
    count: input.elements[element] ?? 0,
  }))
  const most = [...bars].sort(
    (a, b) => b.count - a.count || ELEMENTS.indexOf(a.element) - ELEMENTS.indexOf(b.element)
  )[0]
  const missing = bars.filter((b) => b.count === 0).map((b) => ({ element: b.element, ko: b.ko }))

  const spouseRole = (Object.keys(roles) as RoleKey[]).find((k) => roles[k] === input.spouseSeat) ?? 'sibling'

  return {
    type,
    bars,
    most,
    missing,
    lines: {
      money: moneyLine(input.elements[roles.wealth] ?? 0),
      love: LOVE[spouseRole],
      timing: support >= 5 ? TIMING.early : support >= 3 ? TIMING.mid : TIMING.late,
    },
  }
}

// ─────────────────────────────────────────────────────────────
// 아이 버전 — 「우리 아이 결정적 시기」
// ─────────────────────────────────────────────────────────────

/**
 * 공부 글자 = 나를 낳아주는 자리(배움이 들어오는 자리).
 * 결정적 시기 = 그 글자가 대운으로 들어오는 첫 구간. 대운은 10년 단위라 «몇 살 무렵»으로만 말한다.
 */
export interface ChildInput {
  me: Element
  elements: Record<Element, number>
  /** 대운 구간 — 시작 나이와 그 구간 천간의 오행 */
  daeun: Array<{ age: number; element: Element }>
  /** 지금 나이(만). 이미 지나간 구간을 «앞으로 온다»고 말하지 않기 위해 필요하다. */
  currentAge: number
}

/**
 * 학령기 하한. 🔴 첫 대운은 0살에서 시작하기도 하는데, 그걸 그대로 집으면
 * «0살 무렵부터 불이 켜져» 같은 쓸모없는 말이 나간다(2026-08-21 실측으로 발견).
 */
const SCHOOL_AGE = 7

/** 학창 시절의 끝. 이 뒤에 오는 구간은 «성적으로 안 터진다»가 아니라 «다른 데 걸어라»로 말한다. */
const SCHOOL_YEARS_END = 20

export interface ChildResult {
  /** 공부 글자 개수 */
  studyCount: number
  studyLine: string
  /** 결정적 시기 — 못 찾으면 null */
  decisive: { fromAge: number; toAge: number; now: boolean } | null
  /** 카드 맨 위 한 줄 */
  headline: string
  decisiveLine: string
  temperLine: string
}

const STUDY: readonly string[] = [
  '공부 글자가 비어 있는 편이야. 책상보다 몸으로 익히는 쪽이라, 앉히는 것보다 시켜보는 게 빨라',
  '공부 글자가 하나 있는 편이야. 몰아치기보다 조금씩 오래가 맞는 아이야',
  '공부 글자가 넉넉한 편이야. 시키지 않아도 파고드는 쪽이라, 방향만 잡아주면 돼',
  '공부 글자가 많은 편이야. 재능이 아니라 «생각이 많다»는 뜻이기도 해서, 결정은 도와줘야 해',
]

export function buildChildReading(input: ChildInput): ChildResult {
  const roles = rolesOf(input.me)
  const studyCount = input.elements[roles.resource] ?? 0
  const support = (input.elements[roles.sibling] ?? 0) + studyCount

  // 배움이 들어오거나(인성) 표현이 터지는(식상) 구간을 «불이 켜지는 때»로 본다.
  // 🔴 학령기 이전과 이미 끝난 구간은 뺀다 — 부모가 «지금부터 뭘 하면 되나»를 물었기 때문이다.
  const hit =
    input.daeun.find(
      (d) =>
        (d.element === roles.resource || d.element === roles.output) &&
        d.age + 9 >= Math.max(input.currentAge, SCHOOL_AGE) &&
        d.age + 9 >= SCHOOL_AGE
    ) ?? null

  const from = hit ? Math.max(hit.age, SCHOOL_AGE) : 0
  const to = hit ? hit.age + 9 : 0
  const now = hit ? input.currentAge >= hit.age : false

  return {
    studyCount,
    studyLine: STUDY[Math.min(studyCount, STUDY.length - 1)],
    decisive: hit ? { fromAge: from, toAge: to, now } : null,
    headline: !hit
      ? '아직 뚜렷한 전환점은 안 잡혀'
      : now
        ? `지금이 바로 그 구간이야 (${to}살까지)`
        : from > SCHOOL_YEARS_END
          ? '학창 시절엔 크게 안 와'
          : `${from}살 무렵부터 불이 켜져`,
    decisiveLine: !hit
      ? '지금 보이는 흐름 안에는 크게 바뀌는 구간이 안 잡혀. 급하게 몰지 말고 지금 결을 지켜주는 게 나아'
      : now
        ? `${to}살까지가 불이 켜져 있는 구간이야. 이때 밀어주면 들어간 만큼 나오는 편이고`
        : from > SCHOOL_YEARS_END
          ? // 🔴 «성적으로 안 터진다»를 나쁜 소식이 아니라 «다른 데 걸어라»로 말한다. 지도는 겁주는 도구가 아니다.
            `크게 트이는 건 ${from}살 무렵이야. 학창 시절 성적으로 판가름 나는 아이가 아니라는 뜻이고, 그래서 이 시기엔 등수보다 뭘 좋아하는지를 남겨주는 게 훨씬 남아`
          : `${from}살 무렵부터 ${to}살까지가 불이 켜지는 구간이야. 그 전에 태워버리면 정작 그때 힘이 없어`,
    temperLine:
      support >= 4
        ? '고집이 있는 편이야. 밀면 더 버티니까, 정하게 두고 책임지게 하는 쪽이 훨씬 잘 먹혀'
        : '주변을 많이 타는 편이야. 누구랑 앉느냐가 성적보다 먼저인 아이야',
  }
}

/** 만 나이. 아이 판정에서 «지금이 그 구간인가»를 가르는 값이라 서버·테스트가 같은 함수를 쓴다. */
export function ageOn(birthDate: string, today: Date): number {
  const [y, m, d] = birthDate.split('-').map(Number)
  let age = today.getFullYear() - y
  const beforeBirthday = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)
  if (beforeBirthday) age -= 1
  return Math.max(0, age)
}

// ─────────────────────────────────────────────────────────────
// 공유
// ─────────────────────────────────────────────────────────────

export const TYPE_SLUGS: TypeSlug[] = (Object.keys(TYPES) as RoleKey[]).flatMap((k) => [
  TYPES[k].strong.slug,
  TYPES[k].weak.slug,
])

const BY_SLUG: Record<string, TypeInfo> = Object.fromEntries(
  (Object.keys(TYPES) as RoleKey[]).flatMap((k) => [
    [TYPES[k].strong.slug, TYPES[k].strong],
    [TYPES[k].weak.slug, TYPES[k].weak],
  ])
)

export function isTypeSlug(v: string): v is TypeSlug {
  return Object.prototype.hasOwnProperty.call(BY_SLUG, v)
}

export function typeBySlug(slug: TypeSlug): TypeInfo {
  return BY_SLUG[slug]
}

/** 공유 문구 — 스레드 500자 한참 아래. 반말(계정 목소리와 같게). */
export function shareText(type: TypeInfo, url: string): string {
  return `내 사주 한 줄: 「${type.title}」\n너는? 생년월일만 넣으면 3초.\n${url}`
}

/** 오방색 계열 — 카드·막대에만 쓰는 데이터 색(디자인 토큰 아님). */
export const ELEMENT_COLOR: Record<Element, string> = {
  木: '#4F8A6A',
  火: '#9E2B2B',
  土: '#C9A84C',
  金: '#E8E4DC',
  水: '#2D5F8A',
}

/** 태어난 시간을 모를 때 쓰는 기준 시각 — 일간이 넘어가는 23시 경계를 피한다. */
export const UNKNOWN_TIME_FALLBACK = '12:00'

/** 유형 랜딩에 붙는 한 문단 — 「한 줄로 사람을 가둔다」는 오해를 먼저 막는다. */
export const TYPE_NOTE =
  '이 한 줄은 여덟 글자 중 제일 두드러진 자리 하나를 읽은 거야. 사람을 열 칸에 가두는 게 아니라, 지금 어느 쪽으로 기울어 있는지를 보는 거고. 같은 형이어도 돈·인연·때는 사람마다 다르게 나와.'
