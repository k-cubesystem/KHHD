/**
 * 24절기 (24 Solar Terms) based seasonal event system
 * Each 절기 runs from its start date until the next 절기 begins.
 * We treat each event window as: startDate to endDate (inclusive).
 */

export type Element = '목' | '화' | '토' | '금' | '수'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export interface SeasonalEvent {
  id: string
  /** Korean name */
  name: string
  /** Hanja */
  hanja: string
  /** Start date (month 1-indexed, day) */
  startMonth: number
  startDay: number
  /** End date (month 1-indexed, day) — day before next 절기 */
  endMonth: number
  endDay: number
  /** 오행 element */
  element: Element
  /** Season */
  season: Season
  /** Special fortune type label shown to user */
  fortuneType: string
  /** Discount percentage during this event (0-100) */
  discountPercent: number
  /** Short description of the 절기's significance */
  description: string
  /** Thematic emoji for the season */
  emoji: string
  /** Bokchae cost override (null = use default with discount applied) */
  bokchaeCost?: number
}

/** 2026 24절기 dates */
export const SEASONAL_EVENTS_2026: SeasonalEvent[] = [
  {
    id: 'sohan',
    name: '소한',
    hanja: '小寒',
    startMonth: 1,
    startDay: 5,
    endMonth: 1,
    endDay: 19,
    element: '수',
    season: 'winter',
    fortuneType: '인내와 지혜운',
    discountPercent: 15,
    description: '작은 추위. 한 해의 첫 절기로 차가운 기운 속에 지혜를 모읍니다.',
    emoji: '❄️',
  },
  {
    id: 'daehan',
    name: '대한',
    hanja: '大寒',
    startMonth: 1,
    startDay: 20,
    endMonth: 2,
    endDay: 3,
    element: '수',
    season: 'winter',
    fortuneType: '극복과 재물운',
    discountPercent: 15,
    description: '큰 추위. 겨울의 절정, 이 시기를 버티는 자에게 봄이 옵니다.',
    emoji: '🌨️',
  },
  {
    id: 'ipchun',
    name: '입춘',
    hanja: '立春',
    startMonth: 2,
    startDay: 4,
    endMonth: 2,
    endDay: 18,
    element: '목',
    season: 'spring',
    fortuneType: '새출발운',
    discountPercent: 25,
    description: '봄의 시작. 새로운 기운이 대지를 뚫고 올라오는 시절입니다.',
    emoji: '🌱',
  },
  {
    id: 'usu',
    name: '우수',
    hanja: '雨水',
    startMonth: 2,
    startDay: 19,
    endMonth: 3,
    endDay: 5,
    element: '목',
    season: 'spring',
    fortuneType: '성장과 건강운',
    discountPercent: 20,
    description: '봄비와 눈녹음. 만물이 깨어나고 생명력이 충만합니다.',
    emoji: '🌧️',
  },
  {
    id: 'gyeongchip',
    name: '경칩',
    hanja: '驚蟄',
    startMonth: 3,
    startDay: 6,
    endMonth: 3,
    endDay: 20,
    element: '목',
    season: 'spring',
    fortuneType: '도전과 용기운',
    discountPercent: 20,
    description: '개구리가 깨어나는 날. 잠들었던 기회가 깨어납니다.',
    emoji: '🐸',
  },
  {
    id: 'chunbun',
    name: '춘분',
    hanja: '春分',
    startMonth: 3,
    startDay: 21,
    endMonth: 4,
    endDay: 4,
    element: '목',
    season: 'spring',
    fortuneType: '새출발운',
    discountPercent: 20,
    description: '낮과 밤의 길이가 같아지는 날. 균형과 조화의 운이 열립니다.',
    emoji: '🌸',
  },
  {
    id: 'cheongmyeong',
    name: '청명',
    hanja: '淸明',
    startMonth: 4,
    startDay: 5,
    endMonth: 4,
    endDay: 19,
    element: '목',
    season: 'spring',
    fortuneType: '명예와 직업운',
    discountPercent: 20,
    description: '하늘이 맑고 밝아지는 시절. 당신의 재능이 빛을 발합니다.',
    emoji: '🌤️',
  },
  {
    id: 'gogu',
    name: '곡우',
    hanja: '穀雨',
    startMonth: 4,
    startDay: 20,
    endMonth: 5,
    endDay: 5,
    element: '토',
    season: 'spring',
    fortuneType: '풍요와 재물운',
    discountPercent: 20,
    description: '봄비가 곡식을 살찌우는 날. 노력의 열매가 맺히기 시작합니다.',
    emoji: '🌾',
  },
  {
    id: 'ipha',
    name: '입하',
    hanja: '立夏',
    startMonth: 5,
    startDay: 6,
    endMonth: 5,
    endDay: 20,
    element: '화',
    season: 'summer',
    fortuneType: '열정과 사업운',
    discountPercent: 20,
    description: '여름의 시작. 뜨거운 기운이 당신의 열정을 불태웁니다.',
    emoji: '☀️',
  },
  {
    id: 'soman',
    name: '소만',
    hanja: '小滿',
    startMonth: 5,
    startDay: 21,
    endMonth: 6,
    endDay: 5,
    element: '화',
    season: 'summer',
    fortuneType: '성취와 만족운',
    discountPercent: 20,
    description: '만물이 가득 차는 시절. 작은 성취들이 쌓여 큰 결실로 이어집니다.',
    emoji: '🌻',
  },
  {
    id: 'mangjong',
    name: '망종',
    hanja: '芒種',
    startMonth: 6,
    startDay: 6,
    endMonth: 6,
    endDay: 20,
    element: '화',
    season: 'summer',
    fortuneType: '노력과 결실운',
    discountPercent: 15,
    description: '씨앗을 뿌리는 최적의 시기. 지금의 노력이 가을의 풍성함을 결정합니다.',
    emoji: '🌿',
  },
  {
    id: 'haji',
    name: '하지',
    hanja: '夏至',
    startMonth: 6,
    startDay: 21,
    endMonth: 7,
    endDay: 6,
    element: '화',
    season: 'summer',
    fortuneType: '최고조 에너지운',
    discountPercent: 25,
    description: '낮이 가장 긴 날. 양의 기운이 극에 달해 모든 일이 활발해집니다.',
    emoji: '🔆',
  },
  {
    id: 'soseo',
    name: '소서',
    hanja: '小暑',
    startMonth: 7,
    startDay: 7,
    endMonth: 7,
    endDay: 22,
    element: '화',
    season: 'summer',
    fortuneType: '여행과 변화운',
    discountPercent: 15,
    description: '작은 더위. 활동적인 기운이 새로운 곳으로의 도전을 응원합니다.',
    emoji: '🌊',
  },
  {
    id: 'daeseo',
    name: '대서',
    hanja: '大暑',
    startMonth: 7,
    startDay: 23,
    endMonth: 8,
    endDay: 6,
    element: '화',
    season: 'summer',
    fortuneType: '강인한 의지운',
    discountPercent: 15,
    description: '한 해 중 가장 더운 시기. 이 열기를 견딘 자에게 큰 운이 따릅니다.',
    emoji: '🔥',
  },
  {
    id: 'ipchu',
    name: '입추',
    hanja: '立秋',
    startMonth: 8,
    startDay: 7,
    endMonth: 8,
    endDay: 22,
    element: '금',
    season: 'autumn',
    fortuneType: '결실과 수확운',
    discountPercent: 20,
    description: '가을의 시작. 봄부터 쌓아온 노력의 결실을 거둘 때입니다.',
    emoji: '🍂',
  },
  {
    id: 'cheoseo',
    name: '처서',
    hanja: '處暑',
    startMonth: 8,
    startDay: 23,
    endMonth: 9,
    endDay: 7,
    element: '금',
    season: 'autumn',
    fortuneType: '정리와 계획운',
    discountPercent: 20,
    description: '더위가 물러가는 시절. 지나간 것들을 정리하고 새 계획을 세우세요.',
    emoji: '🌬️',
  },
  {
    id: 'baengno',
    name: '백로',
    hanja: '白露',
    startMonth: 9,
    startDay: 8,
    endMonth: 9,
    endDay: 22,
    element: '금',
    season: 'autumn',
    fortuneType: '풍요와 결실운',
    discountPercent: 20,
    description: '흰 이슬이 맺히는 시절. 가을의 깊이 속에 풍요로운 기운이 무르익습니다.',
    emoji: '🌕',
  },
  {
    id: 'chubun',
    name: '추분',
    hanja: '秋分',
    startMonth: 9,
    startDay: 23,
    endMonth: 10,
    endDay: 7,
    element: '금',
    season: 'autumn',
    fortuneType: '균형과 관계운',
    discountPercent: 25,
    description: '낮과 밤이 다시 같아지는 날. 인간관계의 균형을 찾는 운이 활성화됩니다.',
    emoji: '🍁',
  },
  {
    id: 'hallo',
    name: '한로',
    hanja: '寒露',
    startMonth: 10,
    startDay: 8,
    endMonth: 10,
    endDay: 22,
    element: '금',
    season: 'autumn',
    fortuneType: '지혜와 학업운',
    discountPercent: 15,
    description: '찬 이슬이 맺히는 시기. 집중력과 학업운이 높아지는 절기입니다.',
    emoji: '📚',
  },
  {
    id: 'sanggang',
    name: '상강',
    hanja: '霜降',
    startMonth: 10,
    startDay: 23,
    endMonth: 11,
    endDay: 6,
    element: '토',
    season: 'autumn',
    fortuneType: '인내와 극복운',
    discountPercent: 15,
    description: '서리가 내리는 시절. 차가운 시련을 이겨낸 자에게 겨울의 행운이 옵니다.',
    emoji: '🌫️',
  },
  {
    id: 'ipdong',
    name: '입동',
    hanja: '立冬',
    startMonth: 11,
    startDay: 7,
    endMonth: 11,
    endDay: 21,
    element: '수',
    season: 'winter',
    fortuneType: '저축과 내실운',
    discountPercent: 20,
    description: '겨울의 시작. 봄을 준비하며 내면의 힘을 기르는 시절입니다.',
    emoji: '🍃',
  },
  {
    id: 'soseol',
    name: '소설',
    hanja: '小雪',
    startMonth: 11,
    startDay: 22,
    endMonth: 12,
    endDay: 6,
    element: '수',
    season: 'winter',
    fortuneType: '인연과 가족운',
    discountPercent: 20,
    description: '작은 눈이 내리는 시절. 따뜻한 인연과 가족의 소중함을 느끼세요.',
    emoji: '❄️',
  },
  {
    id: 'daeseol',
    name: '대설',
    hanja: '大雪',
    startMonth: 12,
    startDay: 7,
    endMonth: 12,
    endDay: 21,
    element: '수',
    season: 'winter',
    fortuneType: '쉼과 재충전운',
    discountPercent: 20,
    description: '큰 눈이 내리는 시절. 충분한 휴식이 내년의 큰 도약을 만듭니다.',
    emoji: '🌨️',
  },
  {
    id: 'dongji',
    name: '동지',
    hanja: '冬至',
    startMonth: 12,
    startDay: 22,
    endMonth: 12,
    endDay: 31,
    element: '수',
    season: 'winter',
    fortuneType: '새로운 빛의 운',
    discountPercent: 30,
    description: '밤이 가장 긴 날. 이날 이후 빛이 늘어나 희망의 기운이 시작됩니다.',
    emoji: '🌟',
  },
]

/** Element Korean display labels */
export const ELEMENT_LABELS: Record<Element, { label: string; color: string; bgColor: string }> = {
  목: { label: '木 목', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10 border-emerald-400/30' },
  화: { label: '火 화', color: 'text-red-400', bgColor: 'bg-red-400/10 border-red-400/30' },
  토: { label: '土 토', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  금: { label: '金 금', color: 'text-[#D4AF37]', bgColor: 'bg-[#D4AF37]/10 border-[#D4AF37]/30' },
  수: { label: '水 수', color: 'text-blue-400', bgColor: 'bg-blue-400/10 border-blue-400/30' },
}

export const SEASON_LABELS: Record<Season, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
}

/**
 * Returns the currently active 절기 event for a given date.
 * Falls back to null if somehow out of range (shouldn't happen with complete calendar).
 */
export function getCurrentSeasonalEvent(date: Date = new Date()): SeasonalEvent | null {
  const month = date.getMonth() + 1
  const day = date.getDate()

  for (const event of SEASONAL_EVENTS_2026) {
    if (isDateInRange(month, day, event.startMonth, event.startDay, event.endMonth, event.endDay)) {
      return event
    }
  }
  return null
}

/**
 * Returns the next upcoming 절기 event (starts after the current date).
 */
export function getUpcomingSeasonalEvent(date: Date = new Date()): SeasonalEvent | null {
  const month = date.getMonth() + 1
  const day = date.getDate()

  // Sort by start date
  const sorted = [...SEASONAL_EVENTS_2026].sort((a, b) => {
    const aVal = a.startMonth * 100 + a.startDay
    const bVal = b.startMonth * 100 + b.startDay
    return aVal - bVal
  })

  for (const event of sorted) {
    const eventStart = event.startMonth * 100 + event.startDay
    const current = month * 100 + day
    if (eventStart > current) {
      return event
    }
  }
  return null
}

/**
 * Returns the date object for when the current event ends (23:59:59 on endDay).
 */
export function getEventEndDate(event: SeasonalEvent, year = 2026): Date {
  const d = new Date(year, event.endMonth - 1, event.endDay, 23, 59, 59)
  return d
}

/**
 * Returns the date object for when an event starts.
 */
export function getEventStartDate(event: SeasonalEvent, year = 2026): Date {
  return new Date(year, event.startMonth - 1, event.startDay, 0, 0, 0)
}

function isDateInRange(
  month: number,
  day: number,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): boolean {
  const current = month * 100 + day
  const start = startMonth * 100 + startDay
  const end = endMonth * 100 + endDay
  return current >= start && current <= end
}

/**
 * Calculates discounted bokchae cost.
 */
export function getDiscountedCost(baseCost: number, discountPercent: number): number {
  return Math.max(1, Math.round(baseCost * (1 - discountPercent / 100)))
}
