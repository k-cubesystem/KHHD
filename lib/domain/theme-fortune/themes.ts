/**
 * 인기테마운세 — 테마 정의 단일 출처.
 *
 * 기획 근거: `TEAM_G_DESIGN/prd/PLAN-popular-theme-fortune-v1.md`(마스터) §6-1·§6-2 와
 * 세트 문서 4종(직장·재물 / 연애 / 관상 / 풍수).
 *
 * ## 왜 DB 가 아니라 TS 상수인가 (마스터 §6-1)
 * 테마 카피는 **법적 리스크가 붙은 문구**다. 어드민이 자유롭게 쓸 수 있던 자리에서 9차
 * 표시광고법 사고가 났다. 카피를 리포에 두면 금지어 회귀 테스트가 CI 에서 막아 준다.
 *
 * ## 🔴 단가를 여기에 숫자로 쓰지 않는다 (마스터 §7-1)
 * 표시 = 실차감. 테마가 드는 것은 «어느 화면으로 데려가는가»(`destination`) 뿐이고,
 * 값은 그 화면의 실차감 키(`feature-costs.ts`)에서 파생한다. CEO 가 「메인 테마운세 기획 후
 * 가격 전부 정리」를 지시해 둔 상태라, 지금 확정가를 박으면 두 번 일이 된다.
 *
 * ## 개별 테마 «풀이» — 판정이 선 테마만 자기 화면을 갖는다
 * `/protected/analysis/theme/{slug}` 가 **테마 상세**다(구 5개 slug 는 그 라우트에서 계속
 * 리다이렉트로 처리된다). 다만 그 화면이 실제 풀이를 내는 것은 **판정이 등록된 테마뿐**이고,
 * 등록 여부는 이 표가 아니라 `resolvers/index.ts` 가 안다 — 카피(여기)와 계산(거기)이 서로
 * 다른 속도로 늘어나기 때문이다.
 *
 * 그래서 `destination` 은 **판정이 서기 전까지 데려갈 곳**으로 남는다. 가짜 결과(전 사용자 동일
 * 85점 목업)로 보내지 않는 것이 이 표의 첫 번째 계약이고, 판정이 서면 화면이 알아서 상세로
 * 데려간다(`themeEntryHref`) — 카피·순서·출하 플래그는 그대로다.
 *
 * ## 테마 하나 추가하기
 * ①아래 표에 항목 1개 ②`shipped` 는 실존 진입 경로가 생긴 뒤에 켠다 ③테스트 통과.
 */
import { FEATURE_COST, formatFeatureCost, type FeatureCostKey } from '@/lib/domain/payment/feature-costs'

/** 테마가 다루는 갈래. 화면의 탭보다 잘게 나눈다(직장과 재물은 한 탭에서 함께 보인다). */
export type ThemeCategory = 'career' | 'wealth' | 'love' | 'face' | 'fengshui'

/** 입력 종류. PAIR 는 상대의 생년월일이 필요하다 — 동의 장치가 서기 전에는 출하하지 않는다. */
export type ThemeInputKind = 'SOLO' | 'PAIR'

/** 목록 화면의 탭 키. */
export type ThemeTabKey = 'work' | 'love' | 'face' | 'fengshui'

export interface ThemeTab {
  readonly key: ThemeTabKey
  readonly label: string
  /** 이 탭이 품는 카테고리. 카테고리는 정확히 한 탭에만 속한다(테스트가 강제). */
  readonly categories: readonly ThemeCategory[]
}

/** 선언 순서 = 탭 바의 왼쪽부터의 순서. */
export const THEME_TABS: readonly ThemeTab[] = [
  { key: 'work', label: '직장·재물', categories: ['career', 'wealth'] },
  { key: 'love', label: '연애', categories: ['love'] },
  { key: 'face', label: '관상', categories: ['face'] },
  { key: 'fengshui', label: '풍수', categories: ['fengshui'] },
]

export const DEFAULT_THEME_TAB: ThemeTabKey = 'work'

/** 카테고리 표시용 — 라벨과 폴백 썸네일. */
export interface ThemeCategoryMeta {
  readonly label: string
  /**
   * 실사 썸네일이 아직 없거나 못 불러왔을 때 카드에 세우는 그림.
   *
   * 🔴 **이 파일들은 리포에 이미 있다**(허브 아이콘 재사용). 실사 썸네일과 달리 실재를 테스트가
   *    확인한다 — 화면이 «깨진 그림»을 절대 보이지 않는다는 보증이 여기서 나온다.
   */
  readonly fallbackImage: string
}

export const THEME_CATEGORIES = {
  career: { label: '직장', fallbackImage: '/icons/hub/jikjang.webp' },
  wealth: { label: '재물', fallbackImage: '/icons/hub/jaemul.webp' },
  love: { label: '연애', fallbackImage: '/icons/hub/aejeong.webp' },
  face: { label: '관상', fallbackImage: '/icons/hub/gwansang.webp' },
  fengshui: { label: '풍수', fallbackImage: '/icons/hub/pungsu.webp' },
} as const satisfies Record<ThemeCategory, ThemeCategoryMeta>

/**
 * 지금 실제로 돌아가는 풀이 화면.
 *
 * 🔴 `costKey: null` 은 «그 화면이 복채를 받지 않는다»는 **사실 진술**이다. 추측이 아니라
 * 실차감 호출부를 보고 적었고, 회귀 테스트가 그 파일을 다시 읽어 확인한다.
 */
export interface ThemeDestination {
  readonly href: string
  /** 「지금은 ○○로 이어집니다」의 ○○. 사용자가 어디로 가는지 카드에서 미리 안다. */
  readonly label: string
  readonly costKey: FeatureCostKey | null
}

export const THEME_DESTINATIONS = {
  trendCareer: { href: '/protected/analysis/trend/career', label: '직장운 흐름', costKey: null },
  trendLove: { href: '/protected/analysis/trend/love', label: '애정운 흐름', costKey: null },
  trendExam: { href: '/protected/analysis/trend/exam', label: '학업운 흐름', costKey: null },
  trendEstate: { href: '/protected/analysis/trend/estate', label: '부동산·이사 흐름', costKey: null },
  wealthDeep: { href: '/protected/analysis/wealth', label: '재물 심층 풀이', costKey: 'wealth' },
  face: { href: '/protected/studio/face', label: '관상 풀이', costKey: 'face' },
  palm: { href: '/protected/studio/palm', label: '손금 풀이', costKey: 'palm' },
  fengshui: { href: '/protected/studio/fengshui', label: '풍수 풀이', costKey: 'fengshui' },
  compatibility: { href: '/protected/analysis/compatibility', label: '궁합 풀이', costKey: 'compatibility' },
} as const satisfies Record<string, ThemeDestination>

export type ThemeDestinationKey = keyof typeof THEME_DESTINATIONS

/**
 * 테마가 가리키지는 않지만 「지금 바로 볼 수 있는 풀이」에 함께 거는 화면.
 *
 * 🔴 **이 목록이 두 화면의 유일한 진입 경로다.** 2026-08-13 허브 비우기(CEO 지시)로 「더 깊이
 *    들여다보기」 섹션이 없어지면서, 오늘의 운세와 2026 병오년은 링크가 한 곳도 남지 않을
 *    뻔했다. 여기서 빼는 순간 기능이 접근 불가가 된다 — 뺄 거면 라우트도 함께 지울 것.
 *
 * 🔴 둘 다 **복채를 받지 않는다**(`FEATURE_COST.today/newYear.free`). 표기는 다른 카드와 같은
 *    경로(`formatFeatureCost`)로 만들어 «무료»가 화면에서 유료로 보이지 않게 한다.
 */
export const STANDALONE_ROUTES = {
  today: { href: '/protected/analysis/today', label: '오늘의 운세', costKey: 'today' },
  newYear: { href: '/protected/analysis/new-year', label: '2026 병오년', costKey: 'newYear' },
} as const satisfies Record<string, ThemeDestination>

/**
 * 「지금 바로 볼 수 있는 풀이」에 그리는 전량 — 테마가 가는 곳 + 단독 화면.
 * 화면은 이 함수 하나만 본다(두 표를 화면에서 다시 이어붙이면 그 순간 순서가 두 곳이 된다).
 */
export function openRoutes(): readonly ThemeDestination[] {
  return [...Object.values(THEME_DESTINATIONS), ...Object.values(STANDALONE_ROUTES)]
}

/** 그 화면이 복채를 받지 않는가 — 배지 문구·색을 가르는 데만 쓴다. */
export function isFreeRoute(route: ThemeDestination): boolean {
  return route.costKey === null || FEATURE_COST[route.costKey].free
}

/** 「지금 바로 볼 수 있는 풀이」 배지 문구. 숫자는 `feature-costs.ts` 에서만 온다. */
export function routeCostLabel(route: ThemeDestination): string {
  return route.costKey ? formatFeatureCost(route.costKey) : '무료'
}

export interface ThemeFortune {
  /** 라우트 slug · 상수 키 · 썸네일 파일명이 전부 이 값 하나다. kebab-case. */
  readonly id: string
  readonly category: ThemeCategory
  /** 카드에 찍히는 제목. 규격은 테스트가 지킨다. */
  readonly title: string
  /**
   * 공유·숏폼·OG 용 «롱버전»(기획서 표기). 카드에는 쓰지 않는다(마스터 §4-5).
   * ⚠️ 이름과 달리 더 짧을 수 있다 — `fold-or-hold` 처럼 카드 쪽을 일부러 늘린 경우다.
   */
  readonly titleLong?: string
  readonly subcopy: string
  /** 누가 이 카드를 누르는가 — 한 줄. */
  readonly target: string
  readonly input: ThemeInputKind
  /** 지금 눌렀을 때 가는 곳. `null` = 개별 풀이 준비 중(출하 전). */
  readonly destination: ThemeDestinationKey | null
  /** 목록 안에서의 노출 순서(작을수록 앞). 전체에서 유일. */
  readonly order: number
  /**
   * 허브 ① 「인기테마운세」 리스트의 순위(마스터 §6-3 v1 = 수동값). 안 거는 테마는 null.
   *
   * 🔴 순위는 **갈래를 번갈아** 매긴다. 정렬 결과가 곧 화면의 세로 순서라, 같은 갈래를 몰아
   *    두면 열 줄짜리 리스트가 「직장 직장 직장…」으로 읽힌다. 상위 5줄만 봐도 다섯 갈래가 다
   *    보이도록 1~5 에 갈래를 하나씩 깔고, 6~10 에서 같은 차례를 되풀이한다(테스트가 강제).
   */
  readonly hubRank: number | null
  /** 1차 출하 여부. 꺼져 있으면 화면에 아예 나오지 않는다. */
  readonly shipped: boolean
  /**
   * 개별 풀이(L2 판정)가 섰는가. 켜면 카드가 `destination` 이 아니라 **자기 풀이 화면**으로 간다.
   *
   * 🔴 이 한 칸이 **가는 곳과 복채를 함께** 바꾼다. 링크만 바꾸고 단가를 안 바꾸면 「무료」라고
   *    적힌 카드가 복채를 받는다 — 표시광고법 사고의 전형이다(마스터 §7-1 표시 = 실차감).
   * 🔴 켜 두고 판정을 등록하지 않으면 화면이 「준비 중」으로 닫히고 복채는 못 받는다.
   *    그 어긋남은 빌드가 아니라 **테스트가 잡는다**(`__tests__/resolvers.test.ts`).
   */
  readonly reading?: boolean
  /**
   * 개별 풀이를 복채 없이 여는 «미끼»인가 (마스터 §7-1 — 카테고리당 1종).
   *
   * 🔴 근거는 «인심»이 아니라 **엔진 원가**다(직장·재물 §4). 이 둘만 세운 타임라인을 돌지 않아
   *    다른 테마보다 실제로 싸다. 그래서 이 플래그 하나가 표시(무료 배지)와 실차감(차감 건너뜀)을
   *    **동시에** 가른다 — 두 곳에 적으면 그 순간 표시와 실차감이 어긋난다.
   */
  readonly freeReading?: boolean
  /**
   * 마스터 §10 실사 썸네일. 경로 규약은 `themeThumbnailPath()` 하나뿐이다.
   *
   * 🔴 **파일이 아직 안 왔을 수 있다.** 이 칸은 «그려질 자리»의 선언이지 파일 실재 증명이 아니다
   *    — 실재 테스트를 걸면 자산이 도착하기 전 CI 가 깨진다. 대신 화면이 폴백을 갖는다
   *    (`components/analysis/ThemeThumbnail.tsx` — 못 불러오면 카테고리 그림으로 되돌아간다).
   */
  readonly thumbnail?: string
  /**
   * 상단 강화 고지(마스터 §9-4) — 있으면 상세 화면이 히어로 바로 아래 호박색 경고 박스를 세운다.
   *
   * 🔴 2인 직장·사업·투자 부류는 개별 풀이를 여는 순간 이 칸이 게이트다(마스터 §9-5 6번 —
   *    비어 있으면 출하 실패). 문구는 §9-4 표의 문안 상수만 쓴다 — 화면·프롬프트에 다시 적으면
   *    그 순간 두 소스가 된다.
   */
  readonly extraDisclaimer?: string
}

/**
 * 실사 썸네일 경로 규약 — 리포에서 이 함수 하나가 정본이다.
 *
 * 파일을 만드는 쪽과 그리는 쪽이 다른 작업으로 갈라져 있어, 규약이 두 곳에 적히면 그대로
 * 어긋난다. 표에는 규약이 만든 문자열을 그대로 적고(읽는 사람이 경로를 눈으로 본다),
 * 테스트가 표의 문자열과 이 함수의 출력이 같은지 대조한다.
 *
 * 버전 접미사는 폰 캐시 때문이다 — 그림을 갈아 끼울 때는 같은 이름을 덮어쓰지 말고 번호를 올린다.
 * `-v2` 는 현대(컨템포러리) 실사로 12장을 다시 찍은 회차다(v1 은 11장이 한옥이라 결이 갈렸다).
 */
export function themeThumbnailPath(themeId: string): string {
  return `/images/theme-thumbs/${themeId}-v2.webp`
}

/**
 * 강화 고지 문안 — 투자 부류(마스터 §9-4 표 3행 그대로).
 *
 * 🔴 다듬지 말 것 — 대가를 받고 투자 판단을 조언하면 자본시장법상 유사투자자문 영역과 닿고,
 *    이 문장이 그 거리를 벌린다. 테스트가 문자열을 고정한다(의식 놀이 상수 패턴 승계).
 */
export const THEME_DISCLAIMER_INVEST =
  '이 풀이는 투자 자문이 아닙니다. 특정 상품·종목·매매 시점을 권유하지 않으며, 투자 판단과 책임은 본인에게 있습니다.'

/**
 * 테마 32종.
 *
 * 출하 범위는 각 세트 문서의 «1차 출하» 권고를 따른다. 켜지 않은 테마는 우연이 아니라
 * **선행 조건**이 없어서다 — PAIR 는 상대방 동의 장치(연애 §4-1 · 직장 §3-5)가, 사업·투자
 * 계열은 강화 고지가, 나머지는 개별 풀이·육안 검수가 먼저다.
 */
export const THEME_FORTUNES: readonly ThemeFortune[] = [
  // ── 직장 (PLAN-theme-career-wealth-v1 §4, C-1~C-5) ─────────────────────────
  {
    id: 'leave-or-stay',
    category: 'career',
    title: '나갈까 말까, 벌써 세 번째',
    subcopy: '고르라고 하지 않습니다. 답답한 게 자리 탓인지 때 탓인지 갈라드립니다.',
    target: '재직 중 20~40대 — 그만두고 싶은 게 일 때문인지 사람 때문인지 모르겠는 사람',
    input: 'SOLO',
    destination: 'trendCareer',
    order: 1,
    hubRank: 1,
    shipped: true,
    // 시범 관통 1호(13차) — 판정은 `resolvers/leave-or-stay.ts`.
    reading: true,
    thumbnail: '/images/theme-thumbs/leave-or-stay-v2.webp',
  },
  {
    id: 'what-next',
    category: 'career',
    title: '그만두면, 그다음은 뭘 하지',
    subcopy: '하고 싶은 게 없는 게 아니라, 아직 이름을 못 붙였을 뿐입니다.',
    target: '퇴사를 마음먹었거나 막 나온 20~40대',
    input: 'SOLO',
    destination: 'trendCareer',
    order: 2,
    hubRank: 6,
    shipped: true,
    reading: true,
    freeReading: true,
    thumbnail: '/images/theme-thumbs/what-next-v2.webp',
  },
  {
    id: 'people-luck',
    category: 'career',
    title: '직원복이 없는 건지, 보는 눈이 없는 건지',
    subcopy: '사람이 몰리고 흩어지는 자리는, 사장님 사주에 먼저 그려져 있습니다.',
    target: '직원 1~5명 규모의 사장·점주·팀장',
    input: 'SOLO',
    destination: null,
    order: 3,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'work-friction',
    category: 'career',
    title: '그 사람과 늘 같은 데서 부딪힌다면',
    titleLong: '같이 일하는 그 사람과, 왜 늘 같은 데서 부딪힐까',
    subcopy: '사람을 바꾸는 대신, 부딪히는 자리를 먼저 알아봅니다.',
    target: '이미 함께 일하고 있는 사람과의 소통을 풀고 싶은 사장·팀장·직원',
    input: 'PAIR',
    destination: null,
    order: 4,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'fold-or-hold',
    category: 'career',
    // 🔴 카드에는 긴 쪽을 쓴다. 「접을까, 버틸까」만 걸면 «둘 중 하나를 골라준다»로 읽히는데
    //    이 테마는 구조적으로 그걸 하지 않는다(직장·재물 §3-4·§4-5).
    title: '접을까 버틸까, 지금 눌린 게 뭔지',
    titleLong: '접을까, 버틸까',
    subcopy: '어느 쪽도 권하지 않습니다. 지금 눌린 게 구조인지 시기인지만 갈라드립니다.',
    target: '자영업자·1인 사업자·소규모 법인 대표',
    input: 'SOLO',
    destination: null,
    order: 5,
    hubRank: null,
    shipped: false,
  },

  // ── 재물 (PLAN-theme-career-wealth-v1 §4, W-1~W-3) ─────────────────────────
  {
    id: 'nothing-left',
    category: 'wealth',
    title: '버는 만큼 남지 않는 이유',
    subcopy: '덜 쓰라는 말은 하지 않습니다. 돈이 어느 자리에서 새는지를 봅니다.',
    target: '소득은 있으나 잔고가 늘지 않는 25~45세',
    input: 'SOLO',
    destination: 'wealthDeep',
    order: 6,
    hubRank: 2,
    shipped: true,
    reading: true,
    // 투자 부류 강화 고지(마스터 §9-5 6번) — 개별 풀이가 서는 순간 이 칸이 게이트다.
    extraDisclaimer: THEME_DISCLAIMER_INVEST,
    thumbnail: '/images/theme-thumbs/nothing-left-v2.webp',
  },
  {
    id: 'money-self',
    category: 'wealth',
    title: '돈 앞에서 나는 어떤 사람인가',
    subcopy: '어디에 넣을지는 말하지 않습니다. 돈을 만질 때의 내 결만 봅니다.',
    target: '투자를 해야 할 것 같은데 자기 결을 모르겠는 20~40대',
    input: 'SOLO',
    destination: 'wealthDeep',
    order: 7,
    hubRank: 7,
    shipped: true,
    reading: true,
    freeReading: true,
    extraDisclaimer: THEME_DISCLAIMER_INVEST,
    thumbnail: '/images/theme-thumbs/money-self-v2.webp',
  },
  {
    id: 'partner-money',
    category: 'wealth',
    title: '돈을 같이 만져도 되는 사이인가',
    subcopy: '사람은 좋은데 돈 얘기만 나오면 어색해진다면, 그 자리를 미리 봅니다.',
    target: '동업을 검토 중이거나 이미 동업 중인 사장·프리랜서',
    input: 'PAIR',
    destination: null,
    order: 8,
    hubRank: null,
    shipped: false,
  },

  // ── 연애 (PLAN-theme-love-v1 §5, L1~L8) ────────────────────────────────────
  {
    id: 'attracts-me',
    category: 'love',
    title: '내가 좋아하는 사람 말고, 날 좋아해주는 사람',
    subcopy: '짝사랑만 하다 지쳤다면. 내 사주가 편안해하는 사람의 결을 봅니다.',
    target: '짝사랑·일방적 연애를 반복한 20~30대',
    input: 'SOLO',
    destination: 'trendLove',
    order: 9,
    // 연애 셋 중 둘만 허브에 건다 — 열 줄을 다섯 갈래가 나눠 가지려면 한 갈래가 셋을 차지할
    // 수 없다. 목록(`/analysis/theme?tab=love`)에서는 그대로 보인다.
    hubRank: null,
    shipped: true,
    reading: true,
    thumbnail: '/images/theme-thumbs/attracts-me-v2.webp',
  },
  {
    id: 'same-type',
    category: 'love',
    title: '나는 왜 항상 이런 사람만 만날까',
    subcopy: '매번 다른 사람인데 결말은 늘 비슷했다면, 그 반복을 봅니다.',
    target: '연애 3회 이상, 「내가 문제인가」 자책 구간의 20~30대',
    input: 'SOLO',
    destination: 'trendLove',
    order: 10,
    hubRank: 8,
    shipped: true,
    reading: true,
    thumbnail: '/images/theme-thumbs/same-type-v2.webp',
  },
  {
    id: 'when-love',
    category: 'love',
    title: '내 인연은 언제 오나',
    subcopy: '언제·어디서·어떤 결의 사람인지, 달을 짚어 봅니다.',
    target: '인연을 기다리는 비연애 20~30대',
    input: 'SOLO',
    destination: 'trendLove',
    order: 11,
    hubRank: 3,
    shipped: true,
    reading: true,
    thumbnail: '/images/theme-thumbs/when-love-v2.webp',
  },
  {
    id: 'hot-or-not',
    category: 'love',
    title: '걔도 나 좋아할까 — 우리 지금 썸이야, 아니야',
    subcopy: '마음을 캐묻는 대신, 두 기운의 온도차를 봅니다.',
    target: '짝사랑·썸 구간 20대 — 「물어보긴 무섭고 확인은 하고 싶다」',
    input: 'PAIR',
    destination: null,
    order: 12,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'text-or-not',
    category: 'love',
    title: '연락할까, 말까',
    subcopy: '답장이 느린 게 마음의 문제인지, 원래 템포인지 봅니다.',
    target: '썸·연애 초기 20대 — 폰을 들었다 놨다 하는 구간',
    input: 'PAIR',
    destination: null,
    order: 13,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'marry-or-not',
    category: 'love',
    title: '이 사람이랑 결혼해도 될까',
    subcopy: '좋고 나쁨 말고, 결혼 전에 무엇을 맞춰봐야 하는지 짚어드립니다.',
    target: '교제 2년 이상, 결혼 이야기가 오가는 27~38세',
    input: 'PAIR',
    destination: null,
    order: 14,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'stay-or-go',
    category: 'love',
    // 🔴 짧은 「헤어져야 할까, 견뎌야 할까」는 «골라준다»는 기대를 만든다 — 이 테마는 구조적으로
    //    그걸 하지 않으므로 표시와 내용이 어긋난다(연애 §9 결정 10 권고 = 롱버전을 카드에).
    title: '지금 힘든 게 우리 문제인가, 시기 문제인가',
    subcopy: '지나갈 것과 남을 것을 갈라 봅니다.',
    target: '교제 1년 이상, 권태·반복 갈등 구간의 20~30대',
    input: 'PAIR',
    destination: null,
    order: 15,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'come-back',
    category: 'love',
    title: '그 사람, 다시 돌아올까 — 나는 어디쯤 왔나',
    titleLong: '그 사람, 다시 돌아올까 — 그리고 나는 어디쯤 왔나',
    subcopy: '돌아올지 아닐지를 맞히지 않습니다. 두 흐름이 겹치는 구간을 봅니다.',
    target: '이별 후 1~12개월',
    input: 'PAIR',
    destination: null,
    order: 16,
    hubRank: null,
    shipped: false,
  },

  // ── 관상 (PLAN-theme-face-v1 §6, 테마 1~8) ─────────────────────────────────
  {
    id: 'first-impression',
    category: 'face',
    title: '처음 본 사람은 3초 만에 당신을 이렇게 읽는다',
    subcopy: '당신이 말을 꺼내기 전에, 얼굴이 먼저 한 말을 읽습니다.',
    target: '소개팅·첫 출근·모임을 앞둔 20~40대',
    input: 'SOLO',
    destination: 'face',
    order: 17,
    hubRank: 4,
    shipped: true,
    thumbnail: '/images/theme-thumbs/first-impression-v2.webp',
  },
  {
    id: 'easy-to-ask',
    category: 'face',
    title: '왜 사람들은 늘 당신에게 부탁할까',
    subcopy: '만만해서가 아니라, 얼굴이 문을 열어두고 있을 뿐입니다.',
    target: '20~30대 직장인·대학생',
    input: 'SOLO',
    destination: 'face',
    order: 18,
    // 관상 셋 중 둘만 허브에 건다(연애와 같은 이유). 목록에서는 그대로 보인다.
    hubRank: null,
    shipped: true,
    thumbnail: '/images/theme-thumbs/easy-to-ask-v2.webp',
  },
  {
    // 🔴 이 테마의 시선은 **자기 얼굴을 보는 구직자 본인**이다. 채용절차법의 수범자는
    //    구인자(사장)이고, 마스터 §9-2 가 막는 것은 «남을 골라내는» 쪽이다. 상대를 심사하는
    //    어휘(지원자·적합도·선발)는 금지어 테스트가 계속 막는다.
    id: 'interview-face',
    category: 'face',
    title: '면접장에서 당신의 얼굴이 먼저 하는 말',
    subcopy: '첫 질문이 나오기 전 30초, 상대가 읽는 것을 봅니다.',
    target: '취업·이직을 준비하는 20~30대',
    input: 'SOLO',
    destination: null,
    order: 19,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'life-season',
    category: 'face',
    title: '당신의 얼굴은 인생의 어느 계절에 서 있나',
    subcopy: '동안이냐 노안이냐가 아니라, 어느 停이 열려 있느냐를 봅니다.',
    target: '30~50대 — 「나이 들어 보인다」는 고민의 정면 재구성',
    input: 'SOLO',
    destination: null,
    order: 20,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'nose-wealth',
    category: 'face',
    title: '복코면 잘산다는 말, 어디서 나왔을까',
    subcopy: '재백궁(財帛宮) 500년 — 통념의 절반은 맞고 절반은 틀립니다.',
    target: '전 연령 — 통념의 출처가 궁금한 사람',
    input: 'SOLO',
    destination: null,
    order: 21,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'five-faces',
    category: 'face',
    title: '당신은 다섯 얼굴 중 어느 쪽인가',
    subcopy: '木·火·土·金·水 — 얼굴에도 오행이 있습니다.',
    target: '전 연령 — 유형으로 자기를 읽는 데 익숙한 층',
    input: 'SOLO',
    destination: 'face',
    order: 22,
    hubRank: 9,
    shipped: true,
    thumbnail: '/images/theme-thumbs/five-faces-v2.webp',
  },
  {
    id: 'resting-face',
    category: 'face',
    title: '가만히 있었는데 「화났어?」 소리를 듣는다면',
    subcopy: '무표정과 인상 사이, 얼굴이 저지르는 오해를 봅니다.',
    target: '20~40대 — 사람을 자주 마주하는 일을 하는 층',
    input: 'SOLO',
    destination: null,
    order: 23,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'face-changes',
    category: 'face',
    title: '얼굴은 바뀐다 — 90일 전의 당신과 지금',
    subcopy: '관상은 타고난 것이 아니라 쌓인 것입니다.',
    target: '이미 관상을 본 이용자 — 다시 찍어 견주는 자리',
    input: 'SOLO',
    destination: null,
    order: 24,
    hubRank: null,
    shipped: false,
  },

  // ── 풍수 (PLAN-theme-fengshui-v1 §4, 테마 1~8) ─────────────────────────────
  {
    id: 'moving-day',
    category: 'fengshui',
    title: '손 없는 날은 다 같은 날이 아니다',
    subcopy: '달력에 동그라미 치기 전에, 내 사주에 맞는 날부터 고릅니다.',
    target: '이사 날짜를 잡아야 하는 사람 — 잔금일·입주일 조율 중',
    input: 'SOLO',
    destination: 'trendEstate',
    order: 25,
    hubRank: 5,
    shipped: true,
    reading: true,
    thumbnail: '/images/theme-thumbs/moving-day-v2.webp',
  },
  {
    id: 'house-or-timing',
    category: 'fengshui',
    title: '집이 문제인가, 때가 문제인가',
    subcopy: '이사 온 뒤로 꼬였다면, 둘 중 무엇 때문인지부터 가릅니다.',
    target: '이사 후 1~3년, 「집 탓인가」를 의심하는 사람',
    input: 'SOLO',
    destination: 'fengshui',
    order: 26,
    hubRank: 10,
    shipped: true,
    reading: true,
    thumbnail: '/images/theme-thumbs/house-or-timing-v2.webp',
  },
  {
    id: 'before-contract',
    category: 'fengshui',
    title: '도장 찍기 전, 이 집이 나와 맞는가',
    subcopy: '마음에 든 그 집 — 사진 몇 장으로 방위와 층부터 맞춰봅니다.',
    target: '전월세·매매 계약을 앞둔 사람',
    input: 'SOLO',
    destination: null,
    order: 27,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'newlywed-home',
    category: 'fengshui',
    title: '둘 중 한 사람에게만 맞는 집일 수 있다',
    subcopy: '어긋난 쪽은 어느 방을 쓰면 되는지까지 짚습니다.',
    target: '예비·신혼부부',
    input: 'PAIR',
    destination: null,
    order: 28,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'study-desk',
    category: 'fengshui',
    title: '왜 앉자마자 딴짓을 할까',
    subcopy: '책상 방향 하나로 아이 방의 기운이 갈립니다.',
    target: '초·중등 자녀를 둔 40~50대',
    input: 'SOLO',
    destination: null,
    order: 29,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'sleepless-room',
    category: 'fengshui',
    title: '머리를 어디에 두고 자는가',
    subcopy: '침대 위치를 바꾸는 데는 돈이 들지 않습니다.',
    target: '잠자리가 편치 않아 방을 의심하는 전 연령',
    input: 'SOLO',
    destination: null,
    order: 30,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'shop-spot',
    category: 'fengshui',
    title: '문은 어디로 나 있고, 돈은 어디로 도는가',
    subcopy: '업종·좌향·대표의 사주, 세 가지를 겹쳐서 봅니다.',
    target: '창업 준비·점포 이전을 앞둔 사장',
    input: 'SOLO',
    destination: null,
    order: 31,
    hubRank: null,
    shipped: false,
  },
  {
    id: 'desk-seat',
    category: 'fengshui',
    title: '자리를 옮길 수 있다면, 어디로',
    subcopy: '사무실에서 바꿀 수 있는 건 딱 세 가지입니다.',
    target: '사무실 자리가 불편한 직장인',
    input: 'SOLO',
    destination: null,
    order: 32,
    hubRank: null,
    shipped: false,
  },
]

/** 목록 페이지 경로. 허브 카드와 「테마 전체 보기」가 같은 문자열을 본다. */
export const THEME_LIST_PATH = '/protected/analysis/theme'

/**
 * 허브 ① 리스트에 거는 줄 수.
 *
 * 3 → 10 (CEO 2026-08-13 「3개 말고 상하단 사이즈를 좀 줄여서 10개까지」). 세로를 감당하는 것은
 * 이 숫자가 아니라 **행 모양**이다 — 풀폭 16:9 카드(1장 ≈ 210px)를 유튜브식 가로 행(≈ 88px)으로
 * 바꿔서 열 줄이 예전 넉 장보다 덜 먹는다(`components/analysis/AnalysisDashboard.tsx`).
 *
 * ⚠️ 출하 12종 중 열이므로 둘은 허브에 안 걸린다(`hubRank: null`) — 목록에서는 그대로 보인다.
 */
export const HUB_THEME_COUNT = 10

/**
 * 개별 풀이 캐시 기간(일) — 기존 `analyzeTrendAction` 승계(마스터 §7-2).
 * 이 기간 안의 재진입은 저장본을 보여 주고 **복채가 나가지 않는다.**
 *
 * ⚠️ 여기 사는 이유: 서버 액션 모듈은 **async 함수만 내보낼 수 있다**(Next 규칙) — 상수를
 *    거기 두면 빌드가 깨진다. 정책 숫자는 도메인 상수 자리인 이 파일이 맞다.
 */
export const THEME_CACHE_DAYS = 7

/** 출하된 테마만. 화면은 예외 없이 이 함수를 거쳐 테마를 얻는다. */
export function shippedThemes(): readonly ThemeFortune[] {
  return THEME_FORTUNES.filter((theme) => theme.shipped).sort((a, b) => a.order - b.order)
}

export function themeTab(key: ThemeTabKey): ThemeTab {
  const tab = THEME_TABS.find((candidate) => candidate.key === key)
  // 유니온 타입이라 실무상 도달하지 않지만, 쿼리스트링에서 온 값을 다루는 자리라 방어한다.
  if (!tab) throw new Error(`알 수 없는 테마 탭: ${key}`)
  return tab
}

/** 탭 하나에 걸리는 테마(출하분만). */
export function themesByTab(tab: ThemeTabKey): readonly ThemeFortune[] {
  const { categories } = themeTab(tab)
  return shippedThemes().filter((theme) => categories.includes(theme.category))
}

/** 카테고리가 속한 탭. */
export function tabOfCategory(category: ThemeCategory): ThemeTabKey {
  const tab = THEME_TABS.find((candidate) => candidate.categories.includes(category))
  if (!tab) throw new Error(`탭에 속하지 않은 카테고리: ${category}`)
  return tab.key
}

/** 쿼리스트링 → 탭. 모르는 값은 조용히 기본 탭으로 떨어뜨린다. */
export function resolveThemeTab(raw: string | undefined): ThemeTabKey {
  return THEME_TABS.some((tab) => tab.key === raw) ? (raw as ThemeTabKey) : DEFAULT_THEME_TAB
}

/**
 * 허브 ① 「인기테마운세」 리스트 — 위에서 아래로의 순서 그대로.
 *
 * 🔴 «인기»는 지금 **수동 순위**다(마스터 §6-3 v1). 그래서 화면에 「1위」 「N명이 봤어요」 같은
 *    실측 주장을 쓰지 않는다 — 계측(v2)이 서기 전까지 그건 거짓이 된다. 열 줄이 되면서 순번을
 *    붙이고 싶어지는 자리지만, 숫자를 붙이는 순간 그 주장이 된다(금지어 목록에 「1위」가 있다).
 */
export function hubThemePicks(): readonly ThemeFortune[] {
  return shippedThemes()
    .filter((theme) => theme.hubRank !== null)
    .sort((a, b) => (a.hubRank ?? 0) - (b.hubRank ?? 0))
    .slice(0, HUB_THEME_COUNT)
}

export function themeDestination(theme: ThemeFortune): ThemeDestination | null {
  return theme.destination ? THEME_DESTINATIONS[theme.destination] : null
}

/** 개별 풀이가 선 테마인가 — 가는 곳과 복채를 함께 가른다. */
export function hasThemeReading(theme: ThemeFortune): boolean {
  return theme.reading === true
}

/**
 * 단가 키 — **카드를 눌렀을 때 실제로 나가는 복채**의 키. null 은 «복채를 받지 않는다».
 *
 * 🔴 개별 풀이가 선 테마는 `destination` 이 아니라 **자기 풀이**의 값을 쓴다. 링크는 풀이로
 *    가는데 배지가 도착 화면의 값을 쓰면, 「무료」라고 적힌 카드가 복채를 받는다.
 */
export function themeCostKey(theme: ThemeFortune): FeatureCostKey | null {
  if (hasThemeReading(theme)) return themeReadingCostKey(theme)
  return themeDestination(theme)?.costKey ?? null
}

/**
 * 카드에 찍는 복채 표기.
 * 숫자는 `feature-costs.ts` 에서만 온다 — 이 파일에는 금액이 한 글자도 없다.
 */
export function themeCostLabel(theme: ThemeFortune): string {
  if (hasThemeReading(theme)) return themeReadingCostLabel(theme)
  const destination = themeDestination(theme)
  if (!destination) return '준비 중'
  return routeCostLabel(destination)
}

/** 그 복채가 «무료»인가 — 배지 색을 가르는 데만 쓴다. */
export function isFreeTheme(theme: ThemeFortune): boolean {
  if (hasThemeReading(theme)) return isFreeReading(theme)
  const destination = themeDestination(theme)
  if (!destination) return false
  return isFreeRoute(destination)
}

/** 카드 앵커 id — 허브에서 누른 카드가 목록의 어느 자리인지 알려면 필요하다. */
export function themeAnchorId(themeId: string): string {
  return `theme-${themeId}`
}

/**
 * 허브 카드가 가는 곳 = **목록 페이지의 그 카드 자리**.
 *
 * 개별 테마 풀이가 아직 없으므로, 허브에서 곧장 복채 차감 화면으로 던지지 않는다. 목록에서
 * «지금은 어느 풀이로 이어지는지»와 복채를 한 번 보여 준 다음 사용자가 누르게 한다.
 */
export function themeListHref(theme: ThemeFortune): string {
  return `${THEME_LIST_PATH}?tab=${tabOfCategory(theme.category)}#${themeAnchorId(theme.id)}`
}

/**
 * 실사 썸네일 — **아직 파일이 없을 수 있다**(자산 작업이 따로 돈다).
 *
 * 그래서 «있으면 이 그림»이라는 뜻이지 «이 그림이 뜬다»가 아니다. 뜨지 않았을 때 무엇이
 * 보이는지는 아래 `themeFallbackImage` 가 정하고, 둘을 겹쳐 그리는 것은 화면의 몫이다.
 */
export function themeThumbnail(theme: ThemeFortune): string | undefined {
  return theme.thumbnail
}

/** 늘 존재하는 그림 — 실사 썸네일이 없거나 못 불러왔을 때 그 자리를 메운다. */
export function themeFallbackImage(theme: ThemeFortune): string {
  return THEME_CATEGORIES[theme.category].fallbackImage
}

/** id 로 테마를 찾는다. 라우트 slug 가 곧 id 이므로 URL 해석의 유일한 관문이다. */
export function themeById(themeId: string): ThemeFortune | null {
  return THEME_FORTUNES.find((theme) => theme.id === themeId) ?? null
}

/**
 * 개별 풀이 화면 경로 규약 — 리포에서 이 함수 하나가 정본이다.
 * slug 는 테마 id 그대로다(썸네일 파일명·상수 키와 같은 값 하나, 마스터 §4).
 */
export function themeReadingPath(themeId: string): string {
  return `${THEME_LIST_PATH}/${themeId}`
}

/**
 * 개별 풀이의 실차감 키. `null` 은 «복채를 받지 않는다».
 *
 * 🔴 표시 = 실차감(마스터 §7-1). 이 함수가 화면의 배지도, 서버 액션의 차감액도 정한다 —
 *    금액은 `feature-costs.ts` 에서만 오고 이 파일에는 숫자가 한 글자도 없다.
 */
export function themeReadingCostKey(theme: ThemeFortune): FeatureCostKey | null {
  return theme.freeReading ? null : 'themeFortune'
}

/** 상세 화면에 찍는 복채 표기. */
export function themeReadingCostLabel(theme: ThemeFortune): string {
  const key = themeReadingCostKey(theme)
  return key ? formatFeatureCost(key) : '무료'
}

export function isFreeReading(theme: ThemeFortune): boolean {
  const key = themeReadingCostKey(theme)
  return key === null || FEATURE_COST[key].free
}

/**
 * 카드를 눌렀을 때 실제로 가는 곳.
 *
 * 판정이 선 테마는 **자기 풀이 화면**으로, 아직 없는 테마는 지금 돌아가는 화면으로 간다.
 * 갈 곳이 아예 없으면 `null` — 화면은 그때 카드를 링크로 만들지 않는다(눌러도 못 가는 카드 금지).
 */
export function themeEntryHref(theme: ThemeFortune): string | null {
  if (hasThemeReading(theme)) return themeReadingPath(theme.id)
  return themeDestination(theme)?.href ?? null
}

/** 카드에 적는 「지금은 ○○로 이어집니다」. 자기 풀이가 선 테마는 적을 것이 없다(제자리로 간다). */
export function themeEntryLabel(theme: ThemeFortune): string | null {
  if (hasThemeReading(theme)) return null
  return themeDestination(theme)?.label ?? null
}

/** 결과 화면 8번 칸 「다음 걸음」 — 같은 갈래의 출하 테마 2장. 자기 자신은 뺀다. */
export function relatedThemes(theme: ThemeFortune, count = 2): readonly ThemeFortune[] {
  const tab = tabOfCategory(theme.category)
  const sameTab = themesByTab(tab).filter((candidate) => candidate.id !== theme.id)
  // 같은 갈래에 남는 게 모자라면 다른 갈래에서 채운다 — 「다음 걸음」이 비어 있으면 화면이 막힌다.
  const rest = shippedThemes().filter(
    (candidate) => candidate.id !== theme.id && !sameTab.some((item) => item.id === candidate.id)
  )
  return [...sameTab, ...rest].slice(0, count)
}
