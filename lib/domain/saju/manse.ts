/**
 * 만세력(萬歲曆) 계산 라이브러리
 *
 * Enhanced Saju (Four Pillars of Destiny) calculation library
 * with accurate solar term calculations, midnight boundary handling, and DST support.
 *
 * Key Features:
 * 1. **정확한 24절기 계산**: Uses Solar.fromJieQi() for precise solar term times
 *    - 월주(月柱) changes at 절기, not calendar month
 *    - Essential for accurate month pillar determination
 *
 * 2. **자시(子時) 경계 처리**: Traditional midnight boundary (23:00-01:00)
 *    - In traditional Saju, 23:00-24:00 belongs to the next day
 *    - Configurable via useTraditionalMidnight parameter
 *
 * 3. **일광절약시간(DST) 고려**: Timezone and DST aware calculations
 *    - Handles international users with proper timezone conversions
 *    - Korea (Asia/Seoul) doesn't use DST, but useful for global compatibility
 *
 * @packageDocumentation
 */
import { Solar } from 'lunar-javascript'
import { logger } from '@/lib/utils/logger'

export interface SajuPillar {
  gan: string
  ji: string
  ganHan: string
  jiHan: string
  color: string
  label: string
  korean: string // e.g. "갑자"
  ganElement: string // 천간의 오행 (Wood, Fire, Earth, Metal, Water)
  jiElement: string // 지지의 오행 (Wood, Fire, Earth, Metal, Water)
}

export interface SolarTermInfo {
  name: string // 절기 이름
  time: Date // 정확한 절입 시간
}

export interface EnhancedManseResult extends ManseResult {
  solarTerms?: SolarTermInfo[] // 해당 연도의 24절기 정보
  birthSolarTerm?: string // 출생 시점의 가장 가까운 절기
  timeBoundaryAdjusted?: boolean // 자시 경계 조정 여부
  timezone?: string // 적용된 타임존
}

export interface ManseResult {
  year: SajuPillar
  month: SajuPillar
  day: SajuPillar
  time: SajuPillar
}

// Mappings for UI
const GAN_INFO: Record<string, { colorClass: string; element: string; colorName: string }> = {
  甲: { colorClass: 'text-green-600 bg-green-50 border-green-200', element: 'Wood', colorName: '청(靑)' }, // Yang Wood
  乙: { colorClass: 'text-green-600 bg-green-50 border-green-200', element: 'Wood', colorName: '청(靑)' }, // Yin Wood
  丙: { colorClass: 'text-red-600 bg-red-50 border-red-200', element: 'Fire', colorName: '적(赤)' }, // Yang Fire
  丁: { colorClass: 'text-red-600 bg-red-50 border-red-200', element: 'Fire', colorName: '적(赤)' }, // Yin Fire
  戊: { colorClass: 'text-yellow-600 bg-yellow-50 border-yellow-200', element: 'Earth', colorName: '황(黃)' }, // Yang Earth
  己: { colorClass: 'text-yellow-600 bg-yellow-50 border-yellow-200', element: 'Earth', colorName: '황(黃)' }, // Yin Earth
  庚: { colorClass: 'text-gray-600 bg-gray-50 border-gray-200', element: 'Metal', colorName: '백(白)' }, // Yang Metal
  辛: { colorClass: 'text-gray-600 bg-gray-50 border-gray-200', element: 'Metal', colorName: '백(白)' }, // Yin Metal
  壬: { colorClass: 'text-blue-900 bg-blue-50 border-blue-200', element: 'Water', colorName: '흑(黑)' }, // Yang Water
  癸: { colorClass: 'text-blue-900 bg-blue-50 border-blue-200', element: 'Water', colorName: '흑(黑)' }, // Yin Water
}

const JI_INFO: Record<string, { animal: string; element: string }> = {
  子: { animal: '쥐', element: 'Water' },
  丑: { animal: '소', element: 'Earth' },
  寅: { animal: '호랑이', element: 'Wood' },
  卯: { animal: '토끼', element: 'Wood' },
  辰: { animal: '용', element: 'Earth' },
  巳: { animal: '뱀', element: 'Fire' },
  午: { animal: '말', element: 'Fire' },
  未: { animal: '양', element: 'Earth' },
  申: { animal: '원숭이', element: 'Metal' },
  酉: { animal: '닭', element: 'Metal' },
  戌: { animal: '개', element: 'Earth' },
  亥: { animal: '돼지', element: 'Water' },
}

const KOREAN_GAN: Record<string, string> = {
  甲: '갑',
  乙: '을',
  丙: '병',
  丁: '정',
  戊: '무',
  己: '기',
  庚: '경',
  辛: '신',
  壬: '임',
  癸: '계',
}

const KOREAN_JI: Record<string, string> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}

function createPillar(gan: string, ji: string): SajuPillar {
  const ganInfo = GAN_INFO[gan] || { colorClass: 'text-gray-800 bg-gray-100', element: 'Unknown', colorName: '' }
  const jiInfo = JI_INFO[ji] || { animal: 'Unknown', element: 'Unknown' }

  // Combine color name and animal (e.g. "푸른 용" -> "청룡" styling in UI is separate, but label helps)
  // Label example: "푸른 용" (Blue Dragon)
  const colorLabelMap: Record<string, string> = {
    '청(靑)': '푸른',
    '적(赤)': '붉은',
    '황(黃)': '황금',
    '백(白)': '흰',
    '흑(黑)': '검은',
  }

  const label = `${colorLabelMap[ganInfo.colorName] || ''} ${jiInfo.animal}`
  const korean = `${KOREAN_GAN[gan] || gan}${KOREAN_JI[ji] || ji}`

  return {
    gan,
    ji,
    ganHan: gan,
    jiHan: ji,
    color: ganInfo.colorClass,
    label,
    korean,
    ganElement: ganInfo.element,
    jiElement: jiInfo.element,
  }
}

/**
 * 1. 정확한 24절기 계산
 * Gets accurate solar terms (24절기) for a given year
 * Uses lunar-javascript library to calculate precise solar term times
 *
 * Note: lunar-javascript's getEightChar() method already handles
 * solar term boundaries internally for month pillar calculations.
 * This function provides additional visibility into solar term timing.
 *
 * @param year 연도
 * @returns 24절기 정보 배열
 */
const SOLAR_TERM_KEYS: Array<{ korean: string; key: string }> = [
  { korean: '소한', key: '小寒' },
  { korean: '대한', key: '大寒' },
  { korean: '입춘', key: '立春' },
  { korean: '우수', key: '雨水' },
  { korean: '경칩', key: '惊蛰' },
  { korean: '춘분', key: '春分' },
  { korean: '청명', key: '清明' },
  { korean: '곡우', key: '谷雨' },
  { korean: '입하', key: '立夏' },
  { korean: '소만', key: '小满' },
  { korean: '망종', key: '芒种' },
  { korean: '하지', key: '夏至' },
  { korean: '소서', key: '小暑' },
  { korean: '대서', key: '大暑' },
  { korean: '입추', key: '立秋' },
  { korean: '처서', key: '处暑' },
  { korean: '백로', key: '白露' },
  { korean: '추분', key: '秋分' },
  { korean: '한로', key: '寒露' },
  { korean: '상강', key: '霜降' },
  { korean: '입동', key: '立冬' },
  { korean: '소설', key: '小雪' },
  { korean: '대설', key: '大雪' },
  // 당해 12월 동지는 절기표에서 상수 키로 노출된다 (한자 '冬至' 키는 전년도분)
  { korean: '동지', key: 'DONG_ZHI' },
]

export function getSolarTermsForYear(year: number): SolarTermInfo[] {
  const solarTerms: SolarTermInfo[] = []

  try {
    // 연중(6/15) 기준 음력 연도의 절기표는 해당 양력 연도의 24절기 정밀 시각을 모두 포함한다
    const table = Solar.fromYmdHms(year, 6, 15, 12, 0, 0).getLunar().getJieQiTable()

    for (const { korean, key } of SOLAR_TERM_KEYS) {
      const termSolar = table[key]
      if (!termSolar || termSolar.getYear() !== year) continue

      solarTerms.push({
        name: korean,
        time: new Date(
          termSolar.getYear(),
          termSolar.getMonth() - 1,
          termSolar.getDay(),
          termSolar.getHour(),
          termSolar.getMinute(),
          termSolar.getSecond()
        ),
      })
    }
  } catch (error) {
    logger.warn(`Failed to calculate solar terms for year ${year}:`, error)
  }

  return solarTerms
}

/**
 * 3. DST(일광절약시간) 고려
 * Adjusts for Daylight Saving Time if applicable
 * Korea doesn't use DST, but this is useful for international users
 * @param date Date object
 * @param timezone IANA timezone string (e.g., 'Asia/Seoul', 'America/New_York')
 * @returns Adjusted date with DST consideration
 */
export function adjustForDST(date: Date, timezone: string = 'Asia/Seoul'): Date {
  try {
    // Korea (Asia/Seoul) does not observe DST, so this mainly helps international users
    // We use Intl API to handle timezone conversions properly
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const parts = formatter.formatToParts(date)
    const getValue = (type: string) => parts.find((p) => p.type === type)?.value || '0'

    const adjustedDate = new Date(
      parseInt(getValue('year')),
      parseInt(getValue('month')) - 1,
      parseInt(getValue('day')),
      parseInt(getValue('hour')),
      parseInt(getValue('minute')),
      parseInt(getValue('second'))
    )

    return adjustedDate
  } catch (error) {
    logger.warn(`Failed to adjust for DST in timezone ${timezone}:`, error)
    return date // Return original date if timezone conversion fails
  }
}

/**
 * 출생 시점의 가장 가까운 절기 찾기
 * @param birthDate Date object
 * @param solarTerms Array of solar term info
 * @returns Name of the closest solar term
 */
function findClosestSolarTerm(birthDate: Date, solarTerms: SolarTermInfo[]): string {
  if (solarTerms.length === 0) return ''

  let closest = solarTerms[0]
  let minDiff = Math.abs(birthDate.getTime() - solarTerms[0].time.getTime())

  for (const term of solarTerms) {
    const diff = Math.abs(birthDate.getTime() - term.time.getTime())
    if (diff < minDiff) {
      minDiff = diff
      closest = term
    }
  }

  return closest.name
}

/**
 * Calculates the Four Pillars (Saju) from a given Gregorian date and time.
 * Enhanced version with accurate solar term calculations, midnight boundary handling, and DST support.
 * @param dateStr Format: YYYY-MM-DD
 * @param timeStr Format: HH:mm (optional, defaults to 00:00)
 * @param timezone IANA timezone string (optional, defaults to 'Asia/Seoul')
 * @param useTraditionalMidnight Use traditional midnight boundary (23:00 = next day) - defaults to true
 */
export function calculateManse(
  dateStr: string,
  timeStr: string = '00:00',
  timezone: string = 'Asia/Seoul',
  useTraditionalMidnight: boolean = true
): EnhancedManseResult {
  // Parse input
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  // 3. DST Adjustment (birthSolarTerm 판정용)
  const birthDate = adjustForDST(new Date(year, month - 1, day, hour, minute, 0), timezone)

  // 야자시(23:00~)·절입 경계는 lunar-javascript EightChar가 내부 처리한다.
  // 수동 +1일 시프트는 년주·월주·시간(時干)을 오염시키므로 사용하지 않는다.
  // NOTE: 진태양시·KST절입 보정 미적용 — 정책 결정 필요 (PRD)
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
  const lunar = solar.getLunar()

  // Get Eight Characters (사주팔자)
  // setSect(1) = 야자시 출생의 일주를 다음 날로 계산 (기존 제품 규약 유지)
  const eightChar = lunar.getEightChar()
  eightChar.setSect(useTraditionalMidnight ? 1 : 2)
  const timeBoundaryAdjusted = useTraditionalMidnight && hour === 23

  // 1. Get accurate solar terms for the birth year
  const solarTerms = getSolarTermsForYear(year)
  const birthSolarTerm = findClosestSolarTerm(birthDate, solarTerms)

  // Build result with enhanced information
  const result: EnhancedManseResult = {
    year: createPillar(eightChar.getYearGan(), eightChar.getYearZhi()),
    month: createPillar(eightChar.getMonthGan(), eightChar.getMonthZhi()),
    day: createPillar(eightChar.getDayGan(), eightChar.getDayZhi()),
    time: createPillar(eightChar.getTimeGan(), eightChar.getTimeZhi()),
    solarTerms,
    birthSolarTerm,
    timeBoundaryAdjusted,
    timezone,
  }

  return result
}

/**
 * Legacy calculateManse function for backward compatibility
 * Returns basic ManseResult without enhanced features
 */
export function calculateManseBasic(dateStr: string, timeStr: string = '00:00'): ManseResult {
  const enhanced = calculateManse(dateStr, timeStr)
  return {
    year: enhanced.year,
    month: enhanced.month,
    day: enhanced.day,
    time: enhanced.time,
  }
}

/**
 * 대운(大運) 인터페이스
 */
export interface DaewoonPeriod {
  pillar: SajuPillar
  startAge: number
  endAge: number
  startYear: number
  endYear: number
  isCurrent: boolean
}

/**
 * 대운(大運) 계산 - 10년 단위 운세 주기
 * Enhanced version using accurate solar term calculations
 * @param birthDate 생년월일 (YYYY-MM-DD)
 * @param birthTime 생시 (HH:mm)
 * @param gender 성별 ('male' | 'female')
 * @param currentAge 현재 나이 (만 나이)
 * @param timezone IANA timezone string (optional, defaults to 'Asia/Seoul')
 */
export function calculateDaewoon(
  birthDate: string,
  birthTime: string,
  gender: 'male' | 'female',
  currentAge: number,
  _timezone: string = 'Asia/Seoul'
): DaewoonPeriod[] {
  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number)
  const [hour, minute] = birthTime.split(':').map(Number)

  // 기운(起運) 나이·순행/역행은 lunar-javascript getYun()이 절기 거리 기반으로 계산한다
  const solar = Solar.fromYmdHms(birthYear, birthMonth, birthDay, hour, minute, 0)
  const eightChar = solar.getLunar().getEightChar()
  eightChar.setSect(1)

  const yun = eightChar.getYun(gender === 'male' ? 1 : 0)

  // index 0은 대운 시작 전(원국) 구간이므로 제외하고 10개 대운 사용
  return yun
    .getDaYun(11)
    .slice(1)
    .map((daYun) => {
      const ganji = daYun.getGanZhi()
      const startAge = daYun.getStartYear() - birthYear
      const endAge = startAge + 9

      return {
        pillar: createPillar(ganji.charAt(0), ganji.charAt(1)),
        startAge,
        endAge,
        startYear: daYun.getStartYear(),
        endYear: daYun.getEndYear(),
        isCurrent: currentAge >= startAge && currentAge <= endAge,
      }
    })
}
