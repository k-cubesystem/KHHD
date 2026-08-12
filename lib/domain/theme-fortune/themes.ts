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
 * ## 🔴 개별 테마 «풀이»는 아직 없다
 * 그래서 `destination` 은 **지금 실제로 돌아가는 화면**을 가리킨다. 가짜 결과(전 사용자 동일
 * 85점 목업)로 보내지 않는 것이 이 표의 첫 번째 계약이다. 개별 풀이가 서면 그 화면으로
 * `destination` 만 갈아 끼운다 — 카피·순서·출하 플래그는 그대로다.
 *
 * ⚠️ `/protected/analysis/theme/{slug}` 로는 링크하지 않는다. 그 자리는 구 5개 slug 를 진짜
 *    화면으로 넘기는 **리다이렉트 전용**이라, 새 테마 slug 로 들어가면 허브로 튕긴다.
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
   * 썸네일이 없을 때 카드에 세우는 그림.
   * 테마 전용 썸네일(마스터 §10)은 아직 없다 — 기존 허브 아이콘을 그대로 빌려 쓴다.
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
  /** 허브 ① 「인기테마운세」에 거는 순위(마스터 §6-3 v1 = 수동값). 안 거는 테마는 null. */
  readonly hubRank: number | null
  /** 1차 출하 여부. 꺼져 있으면 화면에 아예 나오지 않는다. */
  readonly shipped: boolean
  /** 마스터 §10 썸네일. 아직 없다 — 생기면 여기만 채우면 카드가 바뀐다. */
  readonly thumbnail?: string
}

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
    hubRank: null,
    shipped: true,
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
    hubRank: null,
    shipped: true,
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
    hubRank: null,
    shipped: true,
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
    hubRank: null,
    shipped: true,
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
    hubRank: null,
    shipped: true,
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
    hubRank: null,
    shipped: true,
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
    hubRank: null,
    shipped: true,
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
    hubRank: null,
    shipped: true,
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
    hubRank: null,
    shipped: true,
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

/** 허브 ① 에 거는 와이드 카드 수. */
export const HUB_THEME_PICK_COUNT = 3

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
 * 허브 ① 「인기테마운세」 와이드 카드.
 *
 * 🔴 «인기»는 지금 **수동 순위**다(마스터 §6-3 v1). 그래서 화면에 「1위」 「N명이 봤어요」 같은
 *    실측 주장을 쓰지 않는다 — 계측(v2)이 서기 전까지 그건 거짓이 된다.
 */
export function hubThemePicks(): readonly ThemeFortune[] {
  return shippedThemes()
    .filter((theme) => theme.hubRank !== null)
    .sort((a, b) => (a.hubRank ?? 0) - (b.hubRank ?? 0))
    .slice(0, HUB_THEME_PICK_COUNT)
}

export function themeDestination(theme: ThemeFortune): ThemeDestination | null {
  return theme.destination ? THEME_DESTINATIONS[theme.destination] : null
}

/** 단가 키 — 테마가 데려가는 화면의 실차감 키. null 은 «복채를 받지 않는다». */
export function themeCostKey(theme: ThemeFortune): FeatureCostKey | null {
  return themeDestination(theme)?.costKey ?? null
}

/**
 * 카드에 찍는 복채 표기.
 * 숫자는 `feature-costs.ts` 에서만 온다 — 이 파일에는 금액이 한 글자도 없다.
 */
export function themeCostLabel(theme: ThemeFortune): string {
  const destination = themeDestination(theme)
  if (!destination) return '준비 중'
  return destination.costKey ? formatFeatureCost(destination.costKey) : '무료'
}

/** 그 복채가 «무료»인가 — 배지 색을 가르는 데만 쓴다. */
export function isFreeTheme(theme: ThemeFortune): boolean {
  const destination = themeDestination(theme)
  if (!destination) return false
  return destination.costKey === null || FEATURE_COST[destination.costKey].free
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

/** 카드 그림 — 전용 썸네일이 생기기 전까지는 카테고리 아이콘을 세운다. */
export function themeImage(theme: ThemeFortune): string {
  return theme.thumbnail ?? THEME_CATEGORIES[theme.category].fallbackImage
}
