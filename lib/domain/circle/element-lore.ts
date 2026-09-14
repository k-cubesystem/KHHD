/**
 * 오행 «결» 사전 — 처방전(`prescription.ts`)의 원문.
 *
 * ## 무엇을 담고, 무엇을 담지 않는가
 * 색·방향·시간·계절·자리·몸은 **`lib/domain/remedy/remedy.ts` 가 정본**이다(그 파일 머리말 —
 * 세 번째 사본을 만들지 않는다). 이 사전은 그 표에 **없는 것만** 든다:
 * 모자랄 때 삶에서 보이는 결, 채우면 트이는 것, 낳아 주는 기운, 책상 위 한 가지, 선물 셋, 과할 때.
 *
 * ## 🔴 어휘 규율 (표시광고법 §9-1 · 채용절차법 §9-2)
 * 「낫는다·부른다·성공·보장·치유」 같은 효능 어휘를 쓰지 않는다. 쓰는 말은 결·자리·붙는다·트인다·옅다.
 * 「채용·뽑·면접·지원자·적합도」 같은 채용 어휘도 쓰지 않는다 — 이 사전은 «판단»이 아니라 «돌봄»의 말이다.
 * 둘 다 테스트가 전량을 훑는다(`__tests__/element-lore.test.ts`).
 */
import { REMEDY_TABLE, type Element as RemedyElement, type SipseongGroupKey } from '@/lib/domain/remedy/remedy'
import type { Element } from '@/lib/domain/shrine/types'
import { ELEMENTS } from '@/lib/domain/shrine/energy'

export interface ElementLore {
  /** 모자랄 때 삶에서 보이는 결 — 「~합니다」 서술문 하나. */
  readonly lacking: string
  /** 채우면 트이는 것 — 명사구. */
  readonly gains: string
  /** 책상 위에 둘 한 가지 — 돈이 거의 들지 않는 것. */
  readonly deskItem: string
  /** 선물 셋 — 실물. 효능이 아니라 «그 오행의 결»을 띤 물건. */
  readonly gifts: readonly [string, string, string]
  /** 그 기운을 나눠 주는 사람과 «함께 하면 좋은 것» — 관계 문장의 실천 한 줄. */
  readonly together: string
  /** 과하면 생기는 결 — 덜어낼 이유. */
  readonly excess: string
}

export const ELEMENT_LORE: Record<Element, ElementLore> = {
  wood: {
    lacking: '시작이 더디고, 새 일에 손이 잘 안 가고, 몸과 생각이 굳습니다.',
    gains: '시작하는 힘, 뻗어 나가는 결',
    deskItem: '작은 관엽 화분',
    gifts: ['미니 화분', '원목 명함꽂이', '허브차'],
    together: '새 일을 같이 시작하는 자리 — 아침 산책, 계획 세우기, 첫 삽을 함께 뜨기.',
    excess: '벌여만 놓고 거두지 못하는 결',
  },
  fire: {
    lacking: '자리가 식고, 말이 밝지 않고, 열의가 오래 가지 않습니다.',
    gains: '드러내는 힘, 사람 앞에 서는 온기',
    deskItem: '따뜻한 빛의 작은 스탠드',
    gifts: ['무드등', '붉은 계열 머그', '홍차'],
    together: '밝은 자리에서 같이 밥 먹고 이야기하기 — 한낮에 만나고, 웃는 자리를 늘리기.',
    excess: '과열과 성급함, 밤늦은 흥분',
  },
  earth: {
    lacking: '중심이 흔들리고, 약속과 규칙이 무너지고, 마음이 들뜹니다.',
    gains: '버티는 힘, 믿음이 가는 결',
    deskItem: '도자기 컵 하나',
    gifts: ['도자기 머그', '원석 문진', '황토색 담요'],
    together: '정해진 시간에 만나기 — 같이 정리하고, 약속을 지키는 작은 일을 함께.',
    excess: '쌓아 두고 움직이지 않는 결',
  },
  metal: {
    lacking: '맺고 끊음이 흐릿하고, 마무리가 약하고, 정리가 되지 않습니다.',
    gains: '정리하는 힘, 결단의 결',
    deskItem: '금속 펜 한 자루',
    gifts: ['금속 볼펜', '은색 카드지갑', '흰 손수건'],
    together: '마무리를 같이 하기 — 정리·결산·끝내는 자리, 해 질 무렵에 만나기.',
    excess: '지나친 잣대와 차가운 말',
  },
  water: {
    lacking: '깊이 듣지 못하고, 쉼이 없고, 생각이 마릅니다.',
    gains: '듣는 힘, 유연함, 쉬는 결',
    deskItem: '책상 위에 늘 두는 물컵',
    gifts: ['유리 물병', '남색 노트', '미니 수경 화분'],
    together: '조용히 듣는 시간 — 말 대신 곁에 앉기, 쉼을 같이, 밤에 짧게.',
    excess: '어둡고 늘어지는 결, 밤샘',
  },
}

/** 상생(相生) — 나를 낳아 주는 기운. 水生木 · 木生火 · 火生土 · 土生金 · 金生水. */
export const MOTHER_OF: Record<Element, Element> = {
  wood: 'water',
  fire: 'wood',
  earth: 'fire',
  metal: 'earth',
  water: 'metal',
}

/** 상극(相剋) — 내가 누르는 기운. 木克土 · 土克水 · 水克火 · 火克金 · 金克木. */
export const CONTROLS: Record<Element, Element> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
}

/** 상생 — 내가 낳는 기운. `MOTHER_OF` 의 역이다(테스트가 서로 맞는지 확인한다). */
export const CHILD_OF: Record<Element, Element> = {
  water: 'wood',
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
}

/** 영문 키(신당·지도) ↔ 한자 키(명식 엔진·개운 처방). `EL_KO` 와 같은 값이어야 한다 — 테스트가 맞춘다. */
export const HANJA_OF: Record<Element, RemedyElement> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
}

export function elementFromHanja(hanja: string | null | undefined): Element | null {
  if (!hanja) return null
  for (const el of ELEMENTS) if (HANJA_OF[el] === hanja) return el
  return null
}

/**
 * 「필요한 것」 — 옅은 기운 하나를 채우는 물건·자리·색·방향·시간 (CEO 2026-09-13 「필요한 아이템, 서로에게 맞는 풍수와 오행 물건」).
 * 물건은 이 사전(책상 위·선물 셋), 자리·색·방향·시간은 remedy 표 — 둘 다 참조일 뿐 세 번째 사본이 아니다.
 */
export interface ElementNeeds {
  readonly element: Element
  /** 책상 위 한 가지 — 쿠팡 검색어. */
  readonly desk: string
  /** 집·사무실에서 손댈 자리(돈이 들지 않는 것). */
  readonly home: string
  /** 선물 셋 — 쿠팡 검색어. */
  readonly gifts: readonly [string, string, string]
  readonly color: string
  readonly direction: string
  readonly hourBand: string
}

export function elementNeeds(el: Element): ElementNeeds {
  const h = HANJA_OF[el]
  const lore = ELEMENT_LORE[el]
  return {
    element: el,
    desk: lore.deskItem,
    home: REMEDY_TABLE.SPACE[h],
    gifts: lore.gifts,
    color: REMEDY_TABLE.COLOR[h],
    direction: REMEDY_TABLE.DIRECTION[h],
    hourBand: REMEDY_TABLE.HOUR_BAND[h],
  }
}

/** 다섯 기운 전부 — 화면이 고른 사람이 바뀌어도 서버를 다시 부르지 않게 한 번에 내려 보낸다. */
export function allElementNeeds(): Record<Element, ElementNeeds> {
  return {
    wood: elementNeeds('wood'),
    fire: elementNeeds('fire'),
    earth: elementNeeds('earth'),
    metal: elementNeeds('metal'),
    water: elementNeeds('water'),
  }
}

/**
 * 보통 사람의 말 — 지도의 「이것만 보면 됩니다」가 쓴다(CEO 2026-09-14 「의미는 좋지만 해석이 어려워, 일반 사람이 이해하기 편하게」).
 * «옅다·결·두껍다» 대신 «부족하다·분위기·많다»로 쓴다. 효능·채용 어휘 없음(테스트가 훑는다).
 */
export interface ElementPlain {
  /** 그 기운이 가장 부족할 때 — 한두 문장. */
  readonly lacking: string
  /** 그 기운이 가장 넉넉할 때의 분위기 — 한 문장. */
  readonly rich: string
}

export const ELEMENT_PLAIN: Record<Element, ElementPlain> = {
  wood: {
    lacking: '새로 시작하는 힘이 약해요. 계획은 있는데 첫발이 잘 안 떨어지는 편이에요.',
    rich: '새 일을 잘 벌이고 앞으로 나아가는 분위기예요.',
  },
  fire: {
    lacking: '활기와 표현이 부족해요. 분위기가 가라앉고 말수가 줄기 쉬워요.',
    rich: '밝고 활발해서 자리가 금방 데워지는 분위기예요.',
  },
  earth: {
    lacking: '중심이 흔들리기 쉬워요. 약속과 규칙이 잘 안 지켜지는 편이에요.',
    rich: '차분하고 믿음직해서 서로 기댈 수 있는 분위기예요.',
  },
  metal: {
    lacking: '마무리와 정리가 약해요. 벌여 놓고 끝을 못 내기 쉬워요.',
    rich: '딱 부러지게 정리하고 결정을 잘 내리는 분위기예요.',
  },
  water: {
    lacking: '쉬어 가는 여유와 들어 주는 힘이 부족해요. 서로 지치기 쉬워요.',
    rich: '차분하게 잘 들어 주고 여유가 있는 분위기예요.',
  },
}

/** 십성 다섯 무리 → 보통 사람의 말로 «어떤 사람». 전부 «사람»으로 끝나 조사가 갈리지 않는다(이 많고 / 은 적어요). */
export const ROLE_PEOPLE: Record<SipseongGroupKey, string> = {
  gwan: '책임지고 이끄는 사람',
  siksang: '아이디어를 내고 만들어 내는 사람',
  bigyeop: '옆에서 같이 뛰어 주는 사람',
  jaeseong: '일을 벌이고 열매를 거두는 사람',
  inseong: '배우고 받아들이며 받쳐 주는 사람',
}

/**
 * 「함께 있을 때 이렇게」 — 그 기운이 **부족한** 사람과 같이 있을 때 무엇이 좋은가(CEO 2026-09-14 「밥을 먹어야 좋은지,
 * 운동을 해야 좋은지, 쉬게 두어야 좋은지 이유와 함께」). 자리·몸의 결은 remedy 표(BODY·SPACE)와 같은 방향이다.
 */
export type ActivityKind = 'move' | 'meal' | 'routine' | 'tidy' | 'rest'

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  move: '몸 움직이기',
  meal: '같이 밥',
  routine: '정해진 시간',
  tidy: '같이 마무리',
  rest: '쉬게 두기',
}

export interface ElementCare {
  readonly kind: ActivityKind
  /** 함께할 때 좋은 자리 — 한 줄. */
  readonly together: string
  /** 해야 할 것 하나. */
  readonly do: string
  /** 왜 그런지 — 부족한 기운의 이치. */
  readonly why: string
}

export const ELEMENT_CARE: Record<Element, ElementCare> = {
  wood: {
    kind: 'move',
    together: '가볍게 몸을 움직이는 자리 — 같이 걷거나 스트레칭, 새 일의 첫걸음을 함께',
    do: '아침에 같이 걷고, 새 일은 첫발만 같이 떼 주기',
    why: '나무 기운이 부족하면 시작하는 힘이 약해요. 몸을 움직이고 첫발을 같이 떼면 그 기운이 살아나요.',
  },
  fire: {
    kind: 'meal',
    together: '밝은 자리에서 같이 밥 먹고 이야기하는 자리 — 낮에 만나고 웃는 자리를 늘리기',
    do: '점심을 같이 먹고, 좋은 소식을 먼저 꺼내 주기',
    why: '불 기운이 부족하면 활기와 표현이 가라앉아요. 따뜻한 밥과 웃는 자리가 그 기운을 데워요.',
  },
  earth: {
    kind: 'routine',
    together: '정해진 시간에 만나는 자리 — 같은 시간에 밥 먹고, 작은 약속을 지키는 일을 함께',
    do: '식사 시간을 정해 두고 지키기, 작은 약속부터 먼저 지켜 주기',
    why: '흙 기운이 부족하면 중심이 흔들려요. 규칙과 정해진 시간이 그 기운을 세워 줘요.',
  },
  metal: {
    kind: 'tidy',
    together: '마무리를 같이 하는 자리 — 정리·결산·끝내는 일, 해 질 무렵에 만나기',
    do: '하던 일을 같이 끝맺고, 물건과 자리를 함께 정리하기',
    why: '쇠 기운이 부족하면 마무리가 약해요. 끝을 같이 맺어 주면 그 기운이 붙어요.',
  },
  water: {
    kind: 'rest',
    together: '쉬게 두는 자리 — 말 대신 곁에 앉기, 조용히 듣기, 밤에는 짧게',
    do: '먼저 묻지 말고 기다리기, 쉬는 시간을 지켜 주기',
    why: '물 기운이 부족하면 쉼과 듣는 힘이 마릅니다. 가만히 두고 들어 주는 것이 그 기운을 채워요.',
  },
}

/** 그 기운이 **넉넉한** 사람과 같이 있을 때 피할 자리 — 넘치는 쪽을 더 부추기지 않기. «금지»가 아니라 정도의 말. */
export const RICH_AVOID: Record<Element, string> = {
  wood: '벌여 놓기만 하는 자리 — 새 계획을 자꾸 보태지 않기',
  fire: '밤늦게까지 들뜨는 자리 — 자극적인 말과 늦은 흥분은 줄이기',
  earth: '쌓아 두고 움직이지 않는 자리 — 미루는 일을 같이 미루지 않기',
  metal: '잣대를 세우는 자리 — 차가운 말과 지나친 원칙은 줄이기',
  water: '어두운 데 오래 머무는 자리 — 밤새우는 일과 늘어지는 시간은 줄이기',
}

/**
 * 같은 팀·가족이라도 조심할 것 — 상극(相剋). «누르는 쪽»의 넉넉한 기운이 «눌리는 쪽»의 넉넉한 기운을 꺾기 쉽다.
 * 이름을 받아 문장을 만든다. 사람을 재는 말이 아니라 «자리를 어떻게 두는가»의 말이다.
 */
export const CAUTION_OF: Record<Element, (presser: string, pressed: string) => string> = {
  wood: (a, b) =>
    `나무가 흙을 파고들듯 ${a}님의 시작하는 힘이 ${b}님의 안정을 흔들기 쉬워요. 새 일을 꺼낼 땐 ${b}님에게 생각할 시간을 먼저 주세요.`,
  earth: (a, b) =>
    `흙이 물길을 막듯 ${a}님의 규칙이 ${b}님의 여유를 막기 쉬워요. 쉬는 시간까지 정해 주지는 않는 편이 좋아요.`,
  water: (a, b) =>
    `물이 불을 끄듯 ${a}님의 차분함이 ${b}님의 열의를 식히기 쉬워요. ${b}님이 들떠 있을 때 찬물 끼얹는 말은 아끼세요.`,
  fire: (a, b) =>
    `불이 쇠를 녹이듯 ${a}님의 열기가 ${b}님의 정리를 흐트러뜨리기 쉬워요. ${b}님이 마무리하는 중엔 새 이야기를 뒤로 미루세요.`,
  metal: (a, b) =>
    `쇠가 나무를 치듯 ${a}님의 딱 부러진 결정이 ${b}님의 새 시작을 막기 쉬워요. ${b}님이 처음 꺼낸 생각은 하루 두고 보세요.`,
}

/** 쿠팡 검색어 전부(책상 위 + 선물 셋 × 다섯 기운) — 지도가 한 번에 링크를 받아 둔다. */
export function allNeedKeywords(): string[] {
  const out: string[] = []
  for (const el of ELEMENTS) {
    const n = elementNeeds(el)
    out.push(n.desk, ...n.gifts)
  }
  return out
}

/**
 * 금지어 — 사전·처방전·그룹 화면 문자열 전량이 이 목록을 피해야 한다.
 * 효능(표시광고법)과 채용(채용절차법)을 한 자리에 둔다: 새 문장을 쓰는 사람이 둘을 따로 찾지 않게.
 */
export const LORE_BANNED_WORDS = {
  efficacy: [
    '보장',
    '반드시',
    '확실히',
    '무조건',
    '완치',
    '치료',
    '치유',
    '낫습니다',
    '낫는',
    '부자',
    '대박',
    '급등',
    '재물이 들어',
    '평생',
    '무제한',
    '매일',
    '성공',
    '최고',
    '유일',
    '효험',
    '효능',
  ],
  // '자를'(해고)은 「의자를」에 걸린다 — 낱말 경계가 없는 한글에서 부분 문자열 검사는 이렇게 어긋난다. '잘라'·'해고'로 대신한다.
  hiring: ['채용', '뽑', '면접', '지원자', '적합도', '합격', '선발', '승진', '해고', '잘라', '평가'],
} as const

/** 문자열 하나에서 걸리는 금지어 — 빈 배열이면 통과. 테스트와 화면 빌드 검사가 같이 쓴다. */
export function bannedWordsIn(text: string): string[] {
  const all: readonly string[] = [...LORE_BANNED_WORDS.efficacy, ...LORE_BANNED_WORDS.hiring]
  return all.filter((word) => text.includes(word))
}
