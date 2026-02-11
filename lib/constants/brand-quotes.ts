/**
 * 청담해화당 브랜드 감성 문구 시스템
 *
 * 브랜드 톤앤매너:
 * - 깊이 있는 통찰
 * - 따뜻한 신비
 * - 절제된 고급
 * - 희망의 여정
 * - 동양적 서정
 */

export const BRAND_QUOTES = {
  // 메인 페이지
  main: {
    hero: "오늘도 당신의 운명이 새롭게 펼쳐집니다",
    subHero: "당신만의 흐름을 따라, 운을 채워가세요",
  },

  // 가족 관리
  family: {
    hero: "함께하는 사람들의 운명을 살펴봅니다",
    subHero: "소중한 이들의 시간이 여기 모입니다",
    empty: "소중한 이들을 추가하고 함께 운의 흐름을 확인하세요",
  },

  // 분석 센터
  analysis: {
    hero: "당신의 운명을 깊이 들여다보는 시간",
    subHero: "오늘 어떤 진실을 마주하고 싶으신가요",
    cheonjiin: "천지인, 세 기운이 만나 당신의 진실을 밝힙니다",
  },

  // 사주 분석
  saju: {
    result: "태어난 순간부터 새겨진, 당신만의 우주",
    fiveElements: "다섯 기운이 만들어낸 당신의 본질",
    fiveElementsBalance: "부족함과 넘침 사이, 균형을 찾아가세요",
    sipSeong: "당신 안의 열 가지 얼굴을 만납니다",
    sipSeongNature: "타고난 성정이 인생을 어떻게 빚어가는지",
    pillars: "하늘과 땅, 그리고 시간이 선물한 기운",
  },

  // 운세 분석
  fortune: {
    today: "오늘 하루, 당신에게 흐르는 기운",
    todayWisdom: "작은 흐름을 알면 큰 파도를 탈 수 있습니다",
    yearly: "한 해의 흐름이 한눈에 펼쳐집니다",
    yearlySeason: "계절마다 다가올 운의 결을 읽어보세요",
    weekly: "일주일의 흐름을 미리 살펴봅니다",
    monthly: "한 달의 운세가 펼쳐집니다",
    category: "당신의 {category}에 어떤 바람이 불어올까요",
    wisdom: "조심할 것과 기대할 것, 그 사이의 지혜",
  },

  // 궁합 분석
  compatibility: {
    hero: "두 사람 사이에 흐르는 보이지 않는 선",
    result: "다름을 이해하고, 같음을 발견하는 시간",
    matrix: "가족 구성원 간의 조화를 한눈에 봅니다",
  },

  // 관상/풍수/손금
  studio: {
    hero: "얼굴과 손금에 새겨진 시간의 이야기",
    fengshui: "공간에 담긴 기운을 읽어냅니다",
    face: "당신의 얼굴에 담긴 운명의 지도",
    palm: "손금이 말해주는 당신의 여정",
  },

  // AI 고민상담
  aiShaman: {
    hero: "깊은 밤, 당신의 고민을 들어드립니다",
    subHero: "때로는 말하는 것만으로도 길이 보입니다",
    empty: "마음 깊은 곳의 이야기를 꺼내보세요",
  },

  // 프로필
  profile: {
    hero: "당신의 시간이 여기 기록됩니다",
    history: "지나온 분석들이 하나의 이야기가 됩니다",
  },

  // 만세력
  manse: {
    hero: "시간의 흐름을 한눈에 펼쳐봅니다",
    calendar: "천 년의 달력 속에서 당신의 날을 찾으세요",
    pillars: "사주팔자의 천간·지지·오행을 전문가 수준으로 분석합니다",
  },

  // 멤버십
  membership: {
    hero: "더 깊은 통찰로 나아가는 문",
    upgrade: "당신의 운명을 더 선명하게 볼 시간입니다",
    premium: "프리미엄 회원만이 누리는 깊이 있는 분석",
  },

  // 설정
  settings: {
    hero: "당신만의 공간을 정돈합니다",
  },

  // 천지인 분석
  cheonjiin: {
    hero: "하늘, 땅, 사람이 조화를 이루는 순간",
    result: "삼재가 만나 이루어진 당신의 운명",
    heaven: "하늘의 명(命)이 말하는 타고난 운명",
    earth: "땅의 기운이 알려주는 환경과 조건",
    human: "사람의 의지로 만들어가는 미래",
  },

  // 공통 상태 메시지
  states: {
    loading: "당신의 운명을 불러오고 있습니다...",
    loadingStars: "별과 별 사이의 시간을 계산하는 중...",
    loadingElements: "오행의 기운을 분석하고 있습니다...",
    error: "잠시 길을 잃었습니다. 다시 시도해주세요",
    errorStars: "별들이 아직 준비되지 않았습니다",
    success: "당신의 운이 한 층 올랐습니다",
    saved: "새로운 통찰이 기록되었습니다",
    empty: "아직 기록된 이야기가 없습니다",
    emptyStart: "첫 번째 분석을 시작해보세요",
  },
} as const;

// 타입 헬퍼
export type BrandQuoteKey = keyof typeof BRAND_QUOTES;
export type BrandQuoteSubKey<T extends BrandQuoteKey> = keyof typeof BRAND_QUOTES[T];
