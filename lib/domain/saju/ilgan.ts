/**
 * 일간(日干) 10종 — 「3초 일간」 공개 페이지의 단일 출처.
 *
 * 왜 따로 두나: 스레드 이야기 글의 참여 질문 「당신의 일간은?」이 갈 곳이 없었다. 이벤트 폼(개인정보 7항목)은
 * 신뢰 0인 방문자에게 너무 무겁다. 생년월일 하나로 끝나는 입구가 퍼널의 진짜 첫 칸이다.
 *
 * 🔴 문장 규율(표시광고법·MARKETING.md §2): 사람을 단정하지 않는다. «당신은 ~이다»가 아니라
 *    전통이 그 일간을 어떻게 «읽는가»(象)로 쓴다. 효험·미래 약속 없음.
 * 🔴 이 파일은 클라이언트에서도 import 한다 — 만세력(lunar-javascript)·서버 전용 모듈을 끌어오지 않는다.
 */

export type IlganSlug = 'gap' | 'eul' | 'byeong' | 'jeong' | 'mu' | 'gi' | 'gyeong' | 'sin' | 'im' | 'gye'
export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export interface IlganInfo {
  readonly slug: IlganSlug
  /** 천간 한자 — 만세력 결과(day.ganHan)와 맞추는 키 */
  readonly han: string
  /** 한 글자 독음 */
  readonly ko: string
  /** 통용 이름 (갑목·을목 …) */
  readonly name: string
  readonly hanja: string
  readonly element: Element
  readonly elementKo: string
  readonly polarity: '양' | '음'
  /** 상(象) — 한 구절. 카드·공유 문구의 핵심 */
  readonly image: string
  /** 세 줄. «~로 봅니다 / ~로 읽습니다» 어미를 지킨다 */
  readonly lines: readonly [string, string, string]
}

export const ILGAN: Record<IlganSlug, IlganInfo> = {
  gap: {
    slug: 'gap',
    han: '甲',
    ko: '갑',
    name: '갑목',
    hanja: '甲木',
    element: 'wood',
    elementKo: '나무',
    polarity: '양',
    image: '하늘로 곧게 뻗는 큰 나무',
    lines: [
      '위로 곧게 뻗으려는 성질로 봅니다. 굽히는 것보다 밀고 나가는 쪽이 편합니다.',
      '시작에 강하고, 끝맺음은 옆사람이 거들 때 빛납니다.',
      '흔히 「바람 부는 언덕의 나무」로 읽습니다 — 꺾이기보다 견디는 쪽.',
    ],
  },
  eul: {
    slug: 'eul',
    han: '乙',
    ko: '을',
    name: '을목',
    hanja: '乙木',
    element: 'wood',
    elementKo: '나무',
    polarity: '음',
    image: '돌 틈을 타고 오르는 덩굴',
    lines: [
      '바위를 뚫는 대신 타고 넘는 성질로 봅니다. 유연함이 힘입니다.',
      '환경을 읽는 감각이 빠르고, 혼자보다 기댈 곳이 있을 때 멀리 갑니다.',
      '흔히 「돌 틈에서 피는 풀」로 읽습니다 — 약해 보여도 끝까지 남는 쪽.',
    ],
  },
  byeong: {
    slug: 'byeong',
    han: '丙',
    ko: '병',
    name: '병화',
    hanja: '丙火',
    element: 'fire',
    elementKo: '불',
    polarity: '양',
    image: '한낮의 태양',
    lines: [
      '감추지 못하고 드러내는 성질로 봅니다. 있으면 방이 밝아집니다.',
      '베푸는 데 망설임이 적고, 그만큼 답이 없으면 쉽게 지칩니다.',
      '흔히 「한낮의 해」로 읽습니다 — 모두를 비추되 제 그림자는 못 보는 쪽.',
    ],
  },
  jeong: {
    slug: 'jeong',
    han: '丁',
    ko: '정',
    name: '정화',
    hanja: '丁火',
    element: 'fire',
    elementKo: '불',
    polarity: '음',
    image: '밤을 지키는 등불',
    lines: [
      '멀리 비추기보다 가까이를 따뜻하게 하는 성질로 봅니다.',
      '섬세하고 오래 타며, 바람에는 약하지만 어둠 속에서 제일 잘 보입니다.',
      '흔히 「밤의 등불」로 읽습니다 — 한 사람을 끝까지 밝히는 쪽.',
    ],
  },
  mu: {
    slug: 'mu',
    han: '戊',
    ko: '무',
    name: '무토',
    hanja: '戊土',
    element: 'earth',
    elementKo: '흙',
    polarity: '양',
    image: '움직이지 않는 큰 산',
    lines: [
      '쉽게 움직이지 않는 성질로 봅니다. 믿음직하다는 말을 자주 듣습니다.',
      '품이 넓고 오래 참지만, 한 번 무너지면 산사태입니다.',
      '흔히 「모두가 기대는 산」으로 읽습니다 — 정작 본인은 기댈 곳이 드문 쪽.',
    ],
  },
  gi: {
    slug: 'gi',
    han: '己',
    ko: '기',
    name: '기토',
    hanja: '己土',
    element: 'earth',
    elementKo: '흙',
    polarity: '음',
    image: '무엇이든 길러내는 봄 밭',
    lines: [
      '무엇이든 받아 길러내는 성질로 봅니다. 돌보는 일에 능합니다.',
      '티 나지 않게 일하고, 제 몫은 뒤로 미루기 쉽습니다.',
      '흔히 「봄 밭」으로 읽습니다 — 씨 뿌린 사람보다 땅이 기억하는 쪽.',
    ],
  },
  gyeong: {
    slug: 'gyeong',
    han: '庚',
    ko: '경',
    name: '경금',
    hanja: '庚金',
    element: 'metal',
    elementKo: '쇠',
    polarity: '양',
    image: '다듬기 전의 쇠',
    lines: [
      '단단하고 직선적인 성질로 봅니다. 돌려 말하는 걸 못 견딥니다.',
      '의리가 분명하고, 한 번 정한 것은 잘 바꾸지 않습니다.',
      '흔히 「다듬기 전의 쇠」로 읽습니다 — 불을 만나야 칼이 되는 쪽.',
    ],
  },
  sin: {
    slug: 'sin',
    han: '辛',
    ko: '신',
    name: '신금',
    hanja: '辛金',
    element: 'metal',
    elementKo: '쇠',
    polarity: '음',
    image: '갈고 닦은 보석',
    lines: [
      '날카롭고 정교한 성질로 봅니다. 작은 흠을 먼저 봅니다.',
      '자존심이 단단하고, 인정받을 때 가장 빛납니다.',
      '흔히 「갈고 닦은 보석」으로 읽습니다 — 상처에 예민하지만 그래서 아름다운 쪽.',
    ],
  },
  im: {
    slug: 'im',
    han: '壬',
    ko: '임',
    name: '임수',
    hanja: '壬水',
    element: 'water',
    elementKo: '물',
    polarity: '양',
    image: '멀리 흐르는 큰 강',
    lines: [
      '넓고 깊게 흐르는 성질로 봅니다. 한곳에 머물기 어렵습니다.',
      '생각이 크고 멀리 보지만, 바닥이 안 보여 오해도 받습니다.',
      '흔히 「큰 강」으로 읽습니다 — 막으면 넘치고, 길을 내주면 멀리 가는 쪽.',
    ],
  },
  gye: {
    slug: 'gye',
    han: '癸',
    ko: '계',
    name: '계수',
    hanja: '癸水',
    element: 'water',
    elementKo: '물',
    polarity: '음',
    image: '소리 없이 스미는 봄비',
    lines: [
      '스며드는 성질로 봅니다. 소리 없이 깊이 닿습니다.',
      '감수성이 깊고 눈치가 빠르며, 마음을 다 보이진 않습니다.',
      '흔히 「봄비」로 읽습니다 — 적시고 지나가면 뭔가 자라 있는 쪽.',
    ],
  },
}

export const ILGAN_SLUGS = Object.keys(ILGAN) as IlganSlug[]

export function isIlganSlug(v: string): v is IlganSlug {
  return Object.prototype.hasOwnProperty.call(ILGAN, v)
}

const BY_HAN: Record<string, IlganSlug> = Object.fromEntries(ILGAN_SLUGS.map((s) => [ILGAN[s].han, s]))

/** 만세력 day.ganHan(甲…癸) → slug. 모르는 글자면 null(throw 하지 않는다 — 공개 화면). */
export function ilganSlugFromHan(han: string): IlganSlug | null {
  return BY_HAN[han] ?? null
}

/** 오방색 기반 오행 색 — OG 카드·글리프에만 쓰는 데이터 색(토큰 아님). */
export const ELEMENT_COLOR: Record<Element, string> = {
  wood: '#4F8A6A',
  fire: '#9E2B2B',
  earth: '#C9A84C',
  metal: '#E8E4DC',
  water: '#2D5F8A',
}

export const ELEMENT_HANJA: Record<Element, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
}

/** 공유 문구(스레드 intent·복사). 500자 한참 아래. */
export function ilganShareText(info: IlganInfo, url: string): string {
  return `내 일간은 ${info.name}(${info.hanja}) — 「${info.image}」\n당신의 일간은? 생년월일만 넣으면 3초.\n${url}`
}

/**
 * 태어난 시각을 모를 때 쓰는 기준 시각. 일간은 23시(야자시) 경계에서만 다음 날로 넘어가므로
 * 정오를 쓰면 어느 쪽에도 걸리지 않는다. 이 값이 «모름»의 정의다.
 */
export const UNKNOWN_TIME_FALLBACK = '12:00'
