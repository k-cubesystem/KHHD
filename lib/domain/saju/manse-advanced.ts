/**
 * 만세력 고급 분석 통합 모듈
 *
 * 포함 기능:
 * - 세운(歲運): 년운 계산
 * - 월운(月運): 월별 운세
 * - 신살(神殺): 15가지 신살
 * - 십이운성(十二運星): 12단계 운세
 * - 합충형해: 천간/지지 관계
 * - 공망(空亡): 빈 공간
 * - 일진(日辰): 길흉 판단
 */

import { Solar } from 'lunar-javascript'
import { SajuPillar } from './manse'
import { getSajuData, SajuData } from './saju'

// ========== Helper Functions ==========

const GAN_INFO: Record<string, { colorClass: string; element: string; colorName: string }> = {
  甲: {
    colorClass: 'text-green-600 bg-green-50 border-green-200',
    element: 'Wood',
    colorName: '청(靑)',
  },
  乙: {
    colorClass: 'text-green-600 bg-green-50 border-green-200',
    element: 'Wood',
    colorName: '청(靑)',
  },
  丙: { colorClass: 'text-red-600 bg-red-50 border-red-200', element: 'Fire', colorName: '적(赤)' },
  丁: { colorClass: 'text-red-600 bg-red-50 border-red-200', element: 'Fire', colorName: '적(赤)' },
  戊: {
    colorClass: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    element: 'Earth',
    colorName: '황(黃)',
  },
  己: {
    colorClass: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    element: 'Earth',
    colorName: '황(黃)',
  },
  庚: {
    colorClass: 'text-gray-600 bg-gray-50 border-gray-200',
    element: 'Metal',
    colorName: '백(白)',
  },
  辛: {
    colorClass: 'text-gray-600 bg-gray-50 border-gray-200',
    element: 'Metal',
    colorName: '백(白)',
  },
  壬: {
    colorClass: 'text-blue-900 bg-blue-50 border-blue-200',
    element: 'Water',
    colorName: '흑(黑)',
  },
  癸: {
    colorClass: 'text-blue-900 bg-blue-50 border-blue-200',
    element: 'Water',
    colorName: '흑(黑)',
  },
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
  const ganInfo = GAN_INFO[gan] || {
    colorClass: 'text-gray-800 bg-gray-100',
    element: 'Unknown',
    colorName: '',
  }
  const jiInfo = JI_INFO[ji] || { animal: 'Unknown', element: 'Unknown' }

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

// ========== 세운(歲運) - 년운 ==========

export interface SaewoonInfo {
  year: number
  pillar: SajuPillar
  relation: string // 일간과의 관계
  fortune: 'great' | 'good' | 'normal' | 'bad'
  description: string
}

/**
 * 세운(년운) 계산
 */
export function calculateSaewoon(birthYear: number, targetYear: number): SaewoonInfo {
  // 해당 연도의 간지 계산
  const yearDiff = targetYear - birthYear
  const solar = Solar.fromYmdHms(targetYear, 1, 1, 0, 0, 0)
  const lunar = solar.getLunar()

  const eightChar: any = lunar.getEightChar()
  const yearGan = eightChar.getYearGan()
  const yearJi = eightChar.getYearZhi()

  // 간단한 길흉 판단 (실제로는 더 복잡)
  const ganIndex = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].indexOf(yearGan)
  const fortune = ganIndex % 3 === 0 ? 'good' : ganIndex % 3 === 1 ? 'normal' : 'bad'

  return {
    year: targetYear,
    pillar: createPillar(yearGan, yearJi),
    relation: '비견', // 간단화
    fortune,
    description: `${targetYear}년의 기운`,
  }
}

// ========== 월운(月運) ==========

export interface WorwoonInfo {
  year: number
  month: number
  pillar: SajuPillar
  solarTerm: string
  luck: number // 0-100
}

/**
 * 월운 계산
 */
export function calculateWorwoon(year: number, month: number): WorwoonInfo {
  const solar = Solar.fromYmdHms(year, month, 15, 12, 0, 0)
  const lunar = solar.getLunar()

  const eightChar: any = lunar.getEightChar()
  const monthGan = eightChar.getMonthGan()
  const monthJi = eightChar.getMonthZhi()

  const solarTerms: Record<number, string> = {
    1: '입춘',
    2: '경칩',
    3: '청명',
    4: '입하',
    5: '망종',
    6: '소서',
    7: '입추',
    8: '백로',
    9: '한로',
    10: '입동',
    11: '대설',
    12: '소한',
  }

  return {
    year,
    month,
    pillar: createPillar(monthGan, monthJi),
    solarTerm: solarTerms[month] || '입춘',
    luck: 50 + Math.floor(Math.random() * 30), // 50-80 범위
  }
}

// ========== 신살(神殺) 15가지 ==========

export interface SinsalAdvanced {
  // 기존 4가지
  yeokma: boolean // 역마살
  cheonEulGwiin: boolean // 천을귀인
  hwagae: boolean // 화개살
  dohwa: boolean // 도화살

  // 추가 신살
  woldeokGwiin: boolean // 월덕귀인
  ildeokGwiin: boolean // 일덕귀인
  munchangGwiin: boolean // 문창귀인
  hakdangGwiin: boolean // 학당귀인
  yukhae: boolean // 육해
  yangin: boolean // 양인
  golanGwasu: boolean // 고란과숙
  jangseong: boolean // 장성
  hyugye: boolean // 휴계
  taiji: boolean // 태극귀인
  wongjin: boolean // 원진살
}

/**
 * 고급 신살 계산
 */
export function calculateAdvancedSinsal(saju: SajuData, gender: 'male' | 'female'): SinsalAdvanced {
  const dayJi = saju.pillars.day.zhi
  const yearJi = saju.pillars.year.zhi

  return {
    yeokma: hasYeokma(saju),
    cheonEulGwiin: hasCheonEulGwiin(saju),
    hwagae: hasHwagae(saju),
    dohwa: hasDohwa(saju),
    woldeokGwiin: dayJi === '甲' || dayJi === '庚',
    ildeokGwiin: yearJi === '甲' || yearJi === '庚',
    munchangGwiin: dayJi === '巳' || dayJi === '午',
    hakdangGwiin: dayJi === '亥' || dayJi === '子',
    yukhae: hasYukhae(saju),
    yangin: dayJi === '子' || dayJi === '午',
    golanGwasu: gender === 'female' && (dayJi === '寅' || dayJi === '申'),
    jangseong: yearJi === '巳' || yearJi === '亥',
    hyugye: dayJi === '辰' || dayJi === '戌',
    taiji: dayJi === '子' || dayJi === '午' || dayJi === '卯' || dayJi === '酉',
    wongjin: hasWongjin(saju),
  }
}

function hasYeokma(saju: SajuData): boolean {
  const ji = saju.pillars.day.zhi
  return ['寅', '申', '巳', '亥'].includes(ji)
}

function hasCheonEulGwiin(saju: SajuData): boolean {
  const gan = saju.pillars.day.gan
  const ji = saju.pillars.day.zhi
  const pairs: Record<string, string[]> = {
    甲: ['丑', '未'],
    乙: ['子', '申'],
    丙: ['亥', '酉'],
    丁: ['亥', '酉'],
    戊: ['丑', '未'],
  }
  return pairs[gan]?.includes(ji) || false
}

function hasHwagae(saju: SajuData): boolean {
  const ji = saju.pillars.day.zhi
  return ['辰', '戌', '丑', '未'].includes(ji)
}

function hasDohwa(saju: SajuData): boolean {
  const ji = saju.pillars.day.zhi
  return ['子', '午', '卯', '酉'].includes(ji)
}

function hasYukhae(saju: SajuData): boolean {
  const pairs = [
    ['子', '未'],
    ['丑', '午'],
    ['寅', '巳'],
    ['卯', '辰'],
    ['申', '亥'],
    ['酉', '戌'],
  ]
  const jis = [
    saju.pillars.year.zhi,
    saju.pillars.month.zhi,
    saju.pillars.day.zhi,
    saju.pillars.time.zhi,
  ]

  for (const pair of pairs) {
    if (jis.includes(pair[0]) && jis.includes(pair[1])) {
      return true
    }
  }
  return false
}

function hasWongjin(saju: SajuData): boolean {
  const pairs = [
    ['子', '午'],
    ['丑', '未'],
    ['寅', '申'],
    ['卯', '酉'],
    ['辰', '戌'],
    ['巳', '亥'],
  ]
  const jis = [
    saju.pillars.year.zhi,
    saju.pillars.month.zhi,
    saju.pillars.day.zhi,
    saju.pillars.time.zhi,
  ]

  for (const pair of pairs) {
    if (jis.includes(pair[0]) && jis.includes(pair[1])) {
      return true
    }
  }
  return false
}

// ========== 십이운성(十二運星) ==========

export type WoonSung =
  | '장생'
  | '목욕'
  | '관대'
  | '건록'
  | '제왕'
  | '쇠'
  | '병'
  | '사'
  | '묘'
  | '절'
  | '태'
  | '양'

export interface SibiWoonSungInfo {
  year: WoonSung
  month: WoonSung
  day: WoonSung
  time: WoonSung
  overall: WoonSung
  strength: number // 0-100
}

/**
 * 십이운성 계산
 */
export function calculateSibiWoonSung(saju: SajuData): SibiWoonSungInfo {
  const dayGan = saju.pillars.day.gan

  const yearWS = getWoonSung(dayGan, saju.pillars.year.zhi)
  const monthWS = getWoonSung(dayGan, saju.pillars.month.zhi)
  const dayWS = getWoonSung(dayGan, saju.pillars.day.zhi)
  const timeWS = getWoonSung(dayGan, saju.pillars.time.zhi)

  // 종합 판정 (가장 강한 운성)
  const allWS = [yearWS, monthWS, dayWS, timeWS]
  const strongestWS = determineStrongestWoonSung(allWS)

  return {
    year: yearWS,
    month: monthWS,
    day: dayWS,
    time: timeWS,
    overall: strongestWS,
    strength: calculateWoonSungStrength(allWS),
  }
}

function getWoonSung(gan: string, ji: string): WoonSung {
  // 간단화된 십이운성 매핑
  const mapping: Record<string, Record<string, WoonSung>> = {
    甲: {
      亥: '장생',
      子: '목욕',
      丑: '관대',
      寅: '건록',
      卯: '제왕',
      辰: '쇠',
      巳: '병',
      午: '사',
      未: '묘',
      申: '절',
      酉: '태',
      戌: '양',
    },
    // 다른 천간들도 유사하게 매핑 (간소화)
  }

  return mapping[gan]?.[ji] || '양'
}

function determineStrongestWoonSung(wsList: WoonSung[]): WoonSung {
  const strength: Record<WoonSung, number> = {
    장생: 100,
    건록: 90,
    제왕: 100,
    관대: 80,
    쇠: 50,
    병: 40,
    사: 30,
    묘: 20,
    절: 10,
    태: 60,
    양: 70,
    목욕: 40,
  }

  let strongest = wsList[0]
  let maxStrength = strength[wsList[0]] || 0

  for (const ws of wsList) {
    if ((strength[ws] || 0) > maxStrength) {
      maxStrength = strength[ws] || 0
      strongest = ws
    }
  }

  return strongest
}

function calculateWoonSungStrength(wsList: WoonSung[]): number {
  const strength: Record<WoonSung, number> = {
    장생: 100,
    건록: 90,
    제왕: 100,
    관대: 80,
    쇠: 50,
    병: 40,
    사: 30,
    묘: 20,
    절: 10,
    태: 60,
    양: 70,
    목욕: 40,
  }

  const total = wsList.reduce((sum, ws) => sum + (strength[ws] || 0), 0)
  return Math.floor(total / wsList.length)
}

// ========== 합충형해(合沖刑害) ==========

export interface Relations {
  hap: string[] // 합
  chung: string[] // 충
  hyung: string[] // 형
  hae: string[] // 해
  samhap: string[] // 삼합
}

/**
 * 지지 합충형해 계산
 */
export function analyzeJijiRelations(saju: SajuData): Relations {
  const jis = [
    saju.pillars.year.zhi,
    saju.pillars.month.zhi,
    saju.pillars.day.zhi,
    saju.pillars.time.zhi,
  ]

  return {
    hap: findHap(jis),
    chung: findChung(jis),
    hyung: findHyung(jis),
    hae: findHae(jis),
    samhap: findSamhap(jis),
  }
}

function findHap(jis: string[]): string[] {
  const pairs: [string, string][] = [
    ['子', '丑'],
    ['寅', '亥'],
    ['卯', '戌'],
    ['辰', '酉'],
    ['巳', '申'],
    ['午', '未'],
  ]

  const result: string[] = []
  for (const [a, b] of pairs) {
    if (jis.includes(a) && jis.includes(b)) {
      result.push(`${a}${b}합`)
    }
  }
  return result
}

function findChung(jis: string[]): string[] {
  const pairs: [string, string][] = [
    ['子', '午'],
    ['丑', '未'],
    ['寅', '申'],
    ['卯', '酉'],
    ['辰', '戌'],
    ['巳', '亥'],
  ]

  const result: string[] = []
  for (const [a, b] of pairs) {
    if (jis.includes(a) && jis.includes(b)) {
      result.push(`${a}${b}충`)
    }
  }
  return result
}

function findHyung(jis: string[]): string[] {
  const triads: string[][] = [
    ['寅', '巳', '申'],
    ['丑', '戌', '未'],
    ['子', '卯'],
  ]

  const result: string[] = []
  for (const triad of triads) {
    const matches = triad.filter((ji) => jis.includes(ji))
    if (matches.length >= 2) {
      result.push(`${matches.join('')}형`)
    }
  }
  return result
}

function findHae(jis: string[]): string[] {
  const pairs: [string, string][] = [
    ['子', '未'],
    ['丑', '午'],
    ['寅', '巳'],
    ['卯', '辰'],
    ['申', '亥'],
    ['酉', '戌'],
  ]

  const result: string[] = []
  for (const [a, b] of pairs) {
    if (jis.includes(a) && jis.includes(b)) {
      result.push(`${a}${b}해`)
    }
  }
  return result
}

function findSamhap(jis: string[]): string[] {
  const triads: [string, string, string, string][] = [
    ['申', '子', '辰', '수'],
    ['寅', '午', '戌', '화'],
    ['巳', '酉', '丑', '금'],
    ['亥', '卯', '未', '목'],
  ]

  const result: string[] = []
  for (const [a, b, c, element] of triads) {
    const matches = [a, b, c].filter((ji) => jis.includes(ji))
    if (matches.length === 3) {
      result.push(`${element}국삼합`)
    }
  }
  return result
}

// ========== 공망(空亡) ==========

export interface GongmangInfo {
  yearGongmang: string[]
  dayGongmang: string[]
  hasGongmang: boolean
  affectedPillars: string[]
}

/**
 * 공망 계산
 */
export function calculateGongmang(saju: SajuData): GongmangInfo {
  const yearPair = getGapjaPair(saju.pillars.year.gan, saju.pillars.year.zhi)
  const dayPair = getGapjaPair(saju.pillars.day.gan, saju.pillars.day.zhi)

  const yearGongmang = findGongmang(yearPair)
  const dayGongmang = findGongmang(dayPair)

  const allJis = [
    saju.pillars.year.zhi,
    saju.pillars.month.zhi,
    saju.pillars.day.zhi,
    saju.pillars.time.zhi,
  ]

  const affected = allJis.filter((ji) => yearGongmang.includes(ji) || dayGongmang.includes(ji))

  return {
    yearGongmang,
    dayGongmang,
    hasGongmang: affected.length > 0,
    affectedPillars: affected,
  }
}

function getGapjaPair(gan: string, ji: string): number {
  const gans = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const jis = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

  const ganIdx = gans.indexOf(gan)
  const jiIdx = jis.indexOf(ji)

  // 60갑자 중 몇 번째인지 계산
  return ganIdx * 6 + Math.floor(jiIdx / 2)
}

function findGongmang(pairIndex: number): string[] {
  const jis = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

  // 공망은 60갑자 중 마지막 2개 지지
  const startIdx = (pairIndex * 2) % 12
  const gongmangIdx1 = (startIdx + 10) % 12
  const gongmangIdx2 = (startIdx + 11) % 12

  return [jis[gongmangIdx1], jis[gongmangIdx2]]
}

// ========== 통합 분석 결과 ==========

export interface ManseAdvancedResult {
  saewoon: SaewoonInfo
  worwoon: WorwoonInfo
  sinsal: SinsalAdvanced
  sibiWoonSung: SibiWoonSungInfo
  jijiRelations: Relations
  gongmang: GongmangInfo
}

/**
 * 만세력 고급 분석 통합 함수
 */
export function analyzeManseAdvanced(
  birthDate: string,
  birthTime: string,
  gender: 'male' | 'female'
): ManseAdvancedResult {
  const saju = getSajuData(birthDate, birthTime, true)
  const [year] = birthDate.split('-').map(Number)
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  return {
    saewoon: calculateSaewoon(year, currentYear),
    worwoon: calculateWorwoon(currentYear, currentMonth),
    sinsal: calculateAdvancedSinsal(saju, gender),
    sibiWoonSung: calculateSibiWoonSung(saju),
    jijiRelations: analyzeJijiRelations(saju),
    gongmang: calculateGongmang(saju),
  }
}
