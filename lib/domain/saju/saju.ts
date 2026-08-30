import { Solar, Lunar } from 'lunar-javascript'

// ======== 에러 타입 ========

/** 생년월일시 입력이 잘못된 경우(존재하지 않는 음력 날짜 등) 던지는 타입 에러 */
export class InvalidBirthInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBirthInputError'
  }
}

// ======== 타입 정의 ========

export interface SajuPillar {
  gan: string // 천간 (e.g., 甲)
  zhi: string // 지지 (e.g., 子)
  ganji: string // 간지 (e.g., 甲子)
  element: string // 오행 (e.g., 木)
  ganElement: string // 천간 오행
  zhiElement: string // 지지 오행
}

export interface SajuData {
  pillars: {
    year: SajuPillar
    month: SajuPillar
    day: SajuPillar
    time: SajuPillar
    hour: SajuPillar // time과 동일
  }
  ganjiList: string[] // [년, 월, 일, 시] 간지 리스트
  elementsDistribution: Record<string, number> // 오행 분포 (e.g., { "木": 2, "火": 1, ... })
  dayMaster: string // 일간 (본인을 나타내는 천간)
  dayMasterElement: string // 일간 오행
  // 추가 필드 (saju-analysis.ts와 호환)
  dayGan: string // dayMaster와 동일
  monthZhi: string // 월지
  yearZhi: string // 연지
  dayZhi: string // 일지
}

export interface DaeunData {
  age: number
  ganji: string
  element: string
  score: number
  description?: string
}

export interface JieqiInfo {
  name: string
  dateString: string
}

// ======== 상수 정의 ========

// 천간 오행 매핑
const GAN_WUXING: Record<string, string> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
}

// 지지 오행 매핑
const ZHI_WUXING: Record<string, string> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}

// 오행 색상 (디자인 시스템 통일)
// 오방색 정본은 /story 리포트 미리보기(components/landing/story/story-report-preview.tsx)와 동일 팔레트.
export const WU_XING_COLORS: Record<string, string> = {
  木: '#4E9A6B', // Green (Wood)
  火: '#C83232', // Red (Fire)
  土: '#C9A84C', // Gold (Earth)
  金: '#D8D2C4', // Silver (Metal)
  水: '#2D5F8A', // Blue (Water)
}

// 오행 한글명
export const WU_XING_NAMES: Record<string, string> = {
  木: '목(木)',
  火: '화(火)',
  土: '토(土)',
  金: '금(金)',
  水: '수(水)',
}

// ======== 핵심 함수 ========

/**
 * 생년월일시 → lunar-javascript Lunar 객체 변환 (양력/음력 공용)
 * 음력 입력은 존재하지 않는 날짜(예: 31일, 없는 30일)일 수 있으므로
 * InvalidBirthInputError로 감싸 명확한 메시지를 전달한다.
 */
export function toLunar(date: string, time: string, isSolar: boolean, isLeapMonth: boolean = false): Lunar {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)

  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) {
    throw new InvalidBirthInputError(`생년월일시 형식이 올바르지 않습니다: ${date} ${time}`)
  }

  try {
    if (isSolar) {
      return Solar.fromYmdHms(y, m, d, hh, mm, 0).getLunar()
    }
    // 음력 윤달은 음(-)월로 전달한다.
    // lunar-javascript 규약(node_modules/lunar-javascript/lunar.js): month<0 = 闰月(윤달).
    //   L974 `(month<0?'闰':'')`, L2826 `isLeap:function(){return this._p.month<0;}`.
    // 윤달 미전달 시 평달로 계산되어 월주(月柱)가 틀린다.
    return Lunar.fromYmdHms(y, isLeapMonth ? -m : m, d, hh, mm, 0)
  } catch (e) {
    throw new InvalidBirthInputError(
      `${isSolar ? '양력' : '음력'} ${date}은(는) 유효하지 않은 날짜입니다: ${
        e instanceof Error ? e.message : String(e)
      }`
    )
  }
}

/**
 * 생년월일시를 사주(간지)로 변환합니다.
 * 야자시(23:00~23:59)·절입 경계는 lunar-javascript EightChar가 처리한다.
 * setSect(1) = 야자시 출생의 일주를 다음 날로 계산 (기존 제품 규약 유지).
 * @param date - 'YYYY-MM-DD' 형식
 * @param time - 'HH:mm' 형식
 * @param isSolar - true면 양력, false면 음력
 * @param isLeapMonth - 음력 윤달 여부(isSolar=false일 때만 유효). 기본 false → 기존 호출부 무수정 호환.
 */
export function getSajuData(
  date: string,
  time: string,
  isSolar: boolean = true,
  isLeapMonth: boolean = false
): SajuData {
  const lunar = toLunar(date, time, isSolar, isLeapMonth)
  const eightChar = lunar.getEightChar()
  eightChar.setSect(1)

  const ganjiList = [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()]

  // 오행 분포 계산
  const dist: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }

  ganjiList.forEach((ganji) => {
    const gan = ganji.charAt(0)
    const zhi = ganji.charAt(1)
    const ganElement = GAN_WUXING[gan]
    const zhiElement = ZHI_WUXING[zhi]
    if (ganElement) dist[ganElement]++
    if (zhiElement) dist[zhiElement]++
  })

  const createPillar = (ganjiStr: string): SajuPillar => {
    const gan = ganjiStr.charAt(0)
    const zhi = ganjiStr.charAt(1)
    return {
      gan,
      zhi,
      ganji: ganjiStr,
      element: `${GAN_WUXING[gan]}${ZHI_WUXING[zhi]}`,
      ganElement: GAN_WUXING[gan],
      zhiElement: ZHI_WUXING[zhi],
    }
  }

  const dayPillar = createPillar(eightChar.getDay())

  return {
    pillars: {
      year: createPillar(eightChar.getYear()),
      month: createPillar(eightChar.getMonth()),
      day: dayPillar,
      time: createPillar(eightChar.getTime()),
      hour: createPillar(eightChar.getTime()), // time과 동일
    },
    ganjiList,
    elementsDistribution: dist,
    dayMaster: dayPillar.gan, // 일간 (본인)
    dayMasterElement: dayPillar.ganElement, // 일간 오행
    // 추가 필드
    dayGan: dayPillar.gan,
    monthZhi: createPillar(eightChar.getMonth()).zhi,
    yearZhi: createPillar(eightChar.getYear()).zhi,
    dayZhi: dayPillar.zhi,
  }
}

/**
 * 특정 날짜의 절기 정보를 가져옵니다.
 */
export function getCurrentJieqi(date: string): JieqiInfo | null {
  try {
    const [y, m, d] = date.split('-').map(Number)
    const solar = Solar.fromYmdHms(y, m, d, 12, 0, 0)
    const lunar = solar.getLunar()
    // lunar-javascript 타입 정의가 불완전하여 타입 단언 사용
    const jieqiName = (lunar as unknown as { getJieQi: () => string | null }).getJieQi()

    if (!jieqiName) return null

    return {
      name: jieqiName,
      dateString: date,
    }
  } catch {
    return null
  }
}

/**
 * 대운(大運) 계산 — lunar-javascript EightChar.getYun() 기반
 * 기운(起運) 나이·순행/역행이 절기 거리 기반으로 정확히 계산된다.
 * age는 대운 시작 연도 - 출생 연도(연 나이) — 컨텍스트 빌더의 연도 산술과 일치.
 * @param birthDate - 'YYYY-MM-DD'
 * @param birthTime - 'HH:mm'
 * @param gender - 'M' | 'F'
 * @param isSolar - true면 양력
 */
export function calculateDaeun(
  birthDate: string,
  birthTime: string,
  gender: 'M' | 'F',
  isSolar: boolean = true,
  isLeapMonth: boolean = false
): DaeunData[] {
  const lunar = toLunar(birthDate, birthTime, isSolar, isLeapMonth)
  const eightChar = lunar.getEightChar()
  eightChar.setSect(1)

  const dayGan = eightChar.getDayGan()
  const dayMasterElement = GAN_WUXING[dayGan]

  const yun = eightChar.getYun(gender === 'M' ? 1 : 0)
  const birthYear = lunar.getSolar().getYear()

  // index 0은 대운 시작 전(원국) 구간이므로 제외하고 10개 대운 사용
  return yun
    .getDaYun(11)
    .slice(1)
    .map((daYun) => {
      const ganji = daYun.getGanZhi()
      const element = GAN_WUXING[ganji.charAt(0)]
      const score = calculateDaeunScore(dayMasterElement, element)
      return {
        age: daYun.getStartYear() - birthYear,
        ganji,
        element,
        score,
        description: getDaeunDescription(score),
      }
    })
}

/**
 * 대운 점수 계산 (일간 오행과 대운 천간 오행의 십성 카테고리 기반, 결정론적)
 */
function calculateDaeunScore(dayMasterElement: string, daeunElement: string): number {
  // 오행 상생 관계: 木→火→土→金→水→木
  const shengCycle = ['木', '火', '土', '金', '水']

  // 오행 상극 관계: 木→土, 土→水, 水→火, 火→金, 金→木
  const keMap: Record<string, string> = {
    木: '土',
    土: '水',
    水: '火',
    火: '金',
    金: '木',
  }

  const dayIndex = shengCycle.indexOf(dayMasterElement)

  // 같은 오행 (비겁)
  if (dayMasterElement === daeunElement) return 72
  // 생아 (식상 - 내가 낳는 오행)
  if (shengCycle[(dayIndex + 1) % 5] === daeunElement) return 78
  // 생나 (인성 - 나를 낳는 오행)
  if (shengCycle[(dayIndex + 4) % 5] === daeunElement) return 85
  // 극아 (관성 - 나를 극하는 오행)
  if (keMap[daeunElement] === dayMasterElement) return 60
  // 극나 (재성 - 내가 극하는 오행)
  if (keMap[dayMasterElement] === daeunElement) return 68

  return 70
}

/**
 * 대운 점수에 따른 설명 생성
 */
function getDaeunDescription(score: number): string {
  if (score >= 90) return '최상의 운기! 모든 일이 순조롭게 풀립니다.'
  if (score >= 80) return '좋은 운기입니다. 적극적으로 도전하세요.'
  if (score >= 70) return '평균 이상의 운기. 꾸준히 노력하면 성과가 있습니다.'
  if (score >= 60) return '보통의 운기. 무리하지 않는 것이 좋습니다.'
  if (score >= 50) return '조심이 필요한 시기. 건강과 인간관계에 주의하세요.'
  return '어려운 시기. 인내하며 때를 기다리세요.'
}

/**
 * 오행 균형 분석
 */
export function analyzeElementBalance(distribution: Record<string, number>): {
  strongest: string
  weakest: string
  lacking: string[]
  excess: string[]
  advice: string
} {
  const entries = Object.entries(distribution)
  const sorted = entries.sort((a, b) => b[1] - a[1])

  const strongest = sorted[0][0]
  const weakest = sorted[sorted.length - 1][0]
  const lacking = entries.filter(([, v]) => v === 0).map(([k]) => k)
  const excess = entries.filter(([, v]) => v >= 4).map(([k]) => k)

  let advice = ''
  if (lacking.length > 0) {
    advice = `${lacking.map((e) => WU_XING_NAMES[e]).join(', ')} 기운이 부족합니다. 해당 오행을 보충하는 것이 좋습니다.`
  } else if (excess.length > 0) {
    advice = `${excess.map((e) => WU_XING_NAMES[e]).join(', ')} 기운이 과다합니다. 균형을 위해 설기(洩氣)가 필요합니다.`
  } else {
    advice = '오행이 비교적 균형을 이루고 있습니다.'
  }

  return { strongest, weakest, lacking, excess, advice }
}

/**
 * 나이 계산 (만 나이)
 */
export function calculateAge(birthDate: string): number {
  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number)
  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()

  let age = todayYear - birthYear

  // 생일이 아직 안 지났으면 -1
  if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
    age--
  }

  return age
}
