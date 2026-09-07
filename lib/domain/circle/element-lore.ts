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
import type { Element as RemedyElement } from '@/lib/domain/remedy/remedy'
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
  /** 과하면 생기는 결 — 덜어낼 이유. */
  readonly excess: string
}

export const ELEMENT_LORE: Record<Element, ElementLore> = {
  wood: {
    lacking: '시작이 더디고, 새 일에 손이 잘 안 가고, 몸과 생각이 굳습니다.',
    gains: '시작하는 힘, 뻗어 나가는 결',
    deskItem: '작은 관엽 화분',
    gifts: ['미니 화분', '원목 명함꽂이', '허브차'],
    excess: '벌여만 놓고 거두지 못하는 결',
  },
  fire: {
    lacking: '자리가 식고, 말이 밝지 않고, 열의가 오래 가지 않습니다.',
    gains: '드러내는 힘, 사람 앞에 서는 온기',
    deskItem: '따뜻한 빛의 작은 스탠드',
    gifts: ['무드등', '붉은 계열 머그', '홍차'],
    excess: '과열과 성급함, 밤늦은 흥분',
  },
  earth: {
    lacking: '중심이 흔들리고, 약속과 규칙이 무너지고, 마음이 들뜹니다.',
    gains: '버티는 힘, 믿음이 가는 결',
    deskItem: '도자기 컵 하나',
    gifts: ['도자기 머그', '원석 문진', '황토색 담요'],
    excess: '쌓아 두고 움직이지 않는 결',
  },
  metal: {
    lacking: '맺고 끊음이 흐릿하고, 마무리가 약하고, 정리가 되지 않습니다.',
    gains: '정리하는 힘, 결단의 결',
    deskItem: '금속 펜 한 자루',
    gifts: ['금속 볼펜', '은색 카드지갑', '흰 손수건'],
    excess: '지나친 잣대와 차가운 말',
  },
  water: {
    lacking: '깊이 듣지 못하고, 쉼이 없고, 생각이 마릅니다.',
    gains: '듣는 힘, 유연함, 쉬는 결',
    deskItem: '책상 위에 늘 두는 물컵',
    gifts: ['유리 물병', '남색 노트', '미니 수경 화분'],
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
