/**
 * 사주·궁합 허브(/protected/analysis)의 «섹션» 정의 — 단일 출처.
 *
 * 상단 바로가기(`HubSectionNav`)와 실제 섹션 래퍼가 **같은 표**를 보고 그린다. 앵커 id·칩 라벨·
 * 섹션 제목이 한 줄에 모여 있으므로, 나중에 라벨만 갈아끼우는 재편(예: 「청담해화당 통합분석」
 * → 「인기테마운세」)은 이 파일의 문자열 하나만 고치면 끝난다. 화면 쪽에는 제목 문자열을 다시
 * 쓰지 않는다 — 쓰면 그 순간 두 곳이 된다.
 *
 * 선언 순서 = 화면의 문서 순서 = 칩 순서다(`Object.values` 는 문자열 키의 선언 순서를 지킨다).
 */

/** 섹션이 화면에 실제로 그려지는 조건. 없으면 항상 그려진다. */
export type HubSectionCondition = 'dailyFortune'

export interface HubSection {
  /** 앵커 id. `<a href="#id">` 와 섹션 요소의 `id` 가 이 값 하나를 공유한다. */
  readonly id: string
  /** 바로가기 칩에 찍히는 짧은 이름. */
  readonly label: string
  /** 섹션 제목. 눈에 보이든(`titleVisible`) 스크린리더용이든 문구는 여기 것 하나뿐이다. */
  readonly title: string
  /**
   * 제목을 눈으로도 보여주는가.
   * `false` 면 `sr-only` 로만 둔다 — 카드 자체가 이미 제 이름을 달고 있는 자리에
   * 제목을 또 그리면 같은 말이 두 번 보인다.
   */
  readonly titleVisible: boolean
  readonly condition?: HubSectionCondition
}

export const HUB_SECTIONS = {
  journey: {
    id: 'hub-journey',
    label: '종합사주풀이',
    title: '종합사주풀이 여정',
    titleVisible: false,
  },
  ritual: {
    id: 'hub-ritual',
    label: '오늘의 정성',
    title: '오늘의 정성',
    titleVisible: false,
  },
  studio: {
    id: 'hub-studio',
    label: '통합분석',
    title: '청담해화당 통합분석',
    titleVisible: true,
  },
  theme: {
    id: 'hub-theme',
    label: '더 깊이',
    title: '더 깊이 들여다보기',
    titleVisible: true,
  },
  dailyFortune: {
    id: 'hub-daily',
    label: '오늘의 운세',
    title: '오늘의 운세',
    titleVisible: false,
    condition: 'dailyFortune',
  },
} as const satisfies Record<string, HubSection>

export type HubSectionKey = keyof typeof HUB_SECTIONS

/** 지금 이 화면에 무엇이 실제로 그려져 있는가. 없는 섹션으로 가는 칩은 만들지 않는다. */
export interface HubSectionContext {
  /** 하단 「오늘의 운세」 카드는 이름을 아는 회원에게만 그려진다. */
  readonly hasDailyFortune: boolean
}

/**
 * 바로가기에 올릴 섹션 — 화면에 없는 앵커로 보내는 칩은 걸러낸다.
 *
 * 죽은 앵커는 «눌러도 아무 일도 안 일어나는 버튼» 이 된다. 조건을 화면 쪽 `&&` 에만 두면
 * 칩과 섹션이 조용히 어긋나므로, 판정을 여기 한 곳으로 모은다.
 */
export function visibleHubSections(context: HubSectionContext): readonly HubSection[] {
  return allHubSections().filter((section) => (section.condition === 'dailyFortune' ? context.hasDailyFortune : true))
}

/** 표 전체를 문서 순서대로. `as const` 로 좁혀진 리터럴 타입을 공통 모양으로 넓혀 준다. */
export function allHubSections(): readonly HubSection[] {
  return Object.values(HUB_SECTIONS)
}

/** 섹션 제목 요소의 id — `aria-labelledby` 가 가리키는 곳. */
export function hubHeadingId(sectionId: string): string {
  return `${sectionId}-title`
}

/**
 * 바로가기 스크롤의 거동.
 *
 * ⚠️ `scrollIntoView({ behavior: 'smooth' })` 는 CSS `scroll-behavior: auto` 를 **덮어쓴다**.
 *    globals.css 의 감속 선호 블록이 있으니 괜찮다고 믿으면 안 된다 — 옵션으로 넘긴 값이 이긴다.
 *    그래서 감속 선호는 여기서 직접 보고 즉시 이동으로 바꾼다.
 */
export function hubScrollBehavior(prefersReducedMotion: boolean): ScrollBehavior {
  return prefersReducedMotion ? 'auto' : 'smooth'
}
