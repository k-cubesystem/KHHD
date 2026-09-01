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
import { calculateSipseong } from '@/lib/saju-engine/sipseong'

// ========== Helper Functions ==========

const GAN_INFO: Record<string, { colorClass: string; element: string; colorName: string }> = {
  甲: {
    colorClass: 'text-bok-sprout bg-bok-sprout/10 border-bok-sprout/30',
    element: 'Wood',
    colorName: '청(靑)',
  },
  乙: {
    colorClass: 'text-bok-sprout bg-bok-sprout/10 border-bok-sprout/30',
    element: 'Wood',
    colorName: '청(靑)',
  },
  丙: {
    colorClass: 'text-obangsaek-red bg-obangsaek-red/10 border-obangsaek-red/30',
    element: 'Fire',
    colorName: '적(赤)',
  },
  丁: {
    colorClass: 'text-obangsaek-red bg-obangsaek-red/10 border-obangsaek-red/30',
    element: 'Fire',
    colorName: '적(赤)',
  },
  戊: {
    colorClass: 'text-gold-500 bg-gold-500/10 border-gold-500/30',
    element: 'Earth',
    colorName: '황(黃)',
  },
  己: {
    colorClass: 'text-gold-500 bg-gold-500/10 border-gold-500/30',
    element: 'Earth',
    colorName: '황(黃)',
  },
  庚: {
    colorClass: 'text-ink-primary bg-white/[0.08] border-white/20',
    element: 'Metal',
    colorName: '백(白)',
  },
  辛: {
    colorClass: 'text-ink-primary bg-white/[0.08] border-white/20',
    element: 'Metal',
    colorName: '백(白)',
  },
  壬: {
    colorClass: 'text-obangsaek-blue bg-obangsaek-blue/10 border-obangsaek-blue/30',
    element: 'Water',
    colorName: '흑(黑)',
  },
  癸: {
    colorClass: 'text-obangsaek-blue bg-obangsaek-blue/10 border-obangsaek-blue/30',
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
    colorClass: 'text-ink-primary bg-white/[0.06]',
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

/** 십성별 세운 길흉 판정 (결정론적 간이 기준) */
const FORTUNE_BY_SIPSEONG: Record<string, SaewoonInfo['fortune']> = {
  정인: 'great',
  정관: 'good',
  정재: 'good',
  식신: 'good',
  비견: 'normal',
  편재: 'normal',
  편인: 'normal',
  겁재: 'bad',
  상관: 'bad',
  편관: 'bad',
}

/**
 * 세운(년운) 계산
 * 년간지는 1월 1일이 아니라 입춘(立春) 기준으로 바뀐다 —
 * 연중(6/15) 시점의 절기 기반 년주 조회로 해당 연도 간지를 확정한다.
 * @param dayGan 일간 — 전달 시 일간 대비 십성 관계·길흉을 결정론적으로 산출
 */
export function calculateSaewoon(_birthYear: number, targetYear: number, dayGan?: string): SaewoonInfo {
  const solar = Solar.fromYmdHms(targetYear, 6, 15, 12, 0, 0)
  const eightChar = solar.getLunar().getEightChar()
  const yearGan = eightChar.getYearGan()
  const yearJi = eightChar.getYearZhi()

  const relation = dayGan ? calculateSipseong(dayGan, yearGan, false) : '미정'
  const fortune: SaewoonInfo['fortune'] = FORTUNE_BY_SIPSEONG[relation] ?? 'normal'

  return {
    year: targetYear,
    pillar: createPillar(yearGan, yearJi),
    relation,
    fortune,
    description: `${targetYear}년 ${yearGan}${yearJi}년의 기운${relation !== '미정' ? ` — 일간 기준 ${relation}運` : ''}`,
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

/** 십성별 월운 점수 (결정론적 간이 기준, 0-100) */
const LUCK_BY_SIPSEONG: Record<string, number> = {
  정인: 85,
  정관: 78,
  식신: 76,
  정재: 75,
  비견: 70,
  편인: 70,
  편재: 68,
  상관: 62,
  겁재: 60,
  편관: 58,
}

/**
 * 월운 계산
 * @param dayGan 일간 — 전달 시 월간 대비 십성 관계로 점수를 결정론적으로 산출
 */
export function calculateWorwoon(year: number, month: number, dayGan?: string): WorwoonInfo {
  const solar = Solar.fromYmdHms(year, month, 15, 12, 0, 0)
  const eightChar = solar.getLunar().getEightChar()
  const monthGan = eightChar.getMonthGan()
  const monthJi = eightChar.getMonthZhi()

  const solarTerms: Record<number, string> = {
    1: '소한',
    2: '입춘',
    3: '경칩',
    4: '청명',
    5: '입하',
    6: '망종',
    7: '소서',
    8: '입추',
    9: '백로',
    10: '한로',
    11: '입동',
    12: '대설',
  }

  const relation = dayGan ? calculateSipseong(dayGan, monthGan, false) : ''
  const luck = LUCK_BY_SIPSEONG[relation] ?? 65

  return {
    year,
    month,
    pillar: createPillar(monthGan, monthJi),
    solarTerm: solarTerms[month] || '입춘',
    luck,
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
  golanGwasu: boolean // 고란살
  jangseong: boolean // 장성
  taiji: boolean // 태극귀인
  wongjin: boolean // 원진살
}

// ----- 신살 조견표 (표준 정의) -----

/** 삼합 기준 역마: 申子辰→寅, 寅午戌→申, 巳酉丑→亥, 亥卯未→巳 */
const YEOKMA_MAP: Record<string, string> = {
  申: '寅',
  子: '寅',
  辰: '寅',
  寅: '申',
  午: '申',
  戌: '申',
  巳: '亥',
  酉: '亥',
  丑: '亥',
  亥: '巳',
  卯: '巳',
  未: '巳',
}

/** 삼합 기준 화개: 寅午戌→戌, 申子辰→辰, 巳酉丑→丑, 亥卯未→未 */
const HWAGAE_MAP: Record<string, string> = {
  寅: '戌',
  午: '戌',
  戌: '戌',
  申: '辰',
  子: '辰',
  辰: '辰',
  巳: '丑',
  酉: '丑',
  丑: '丑',
  亥: '未',
  卯: '未',
  未: '未',
}

/** 삼합 기준 도화: 申子辰→酉, 寅午戌→卯, 巳酉丑→午, 亥卯未→子 */
const DOHWA_MAP: Record<string, string> = {
  申: '酉',
  子: '酉',
  辰: '酉',
  寅: '卯',
  午: '卯',
  戌: '卯',
  巳: '午',
  酉: '午',
  丑: '午',
  亥: '子',
  卯: '子',
  未: '子',
}

/** 천을귀인: 일간 → 귀인 지지 */
const CHEONEUL_MAP: Record<string, string[]> = {
  甲: ['丑', '未'],
  戊: ['丑', '未'],
  庚: ['丑', '未'],
  乙: ['子', '申'],
  己: ['子', '申'],
  丙: ['亥', '酉'],
  丁: ['亥', '酉'],
  辛: ['寅', '午'],
  壬: ['巳', '卯'],
  癸: ['巳', '卯'],
}

/** 월덕귀인: 월지 삼합국 → 해당 천간이 원국 천간에 존재 */
const WOLDEOK_MAP: Record<string, string> = {
  寅: '丙',
  午: '丙',
  戌: '丙',
  申: '壬',
  子: '壬',
  辰: '壬',
  亥: '甲',
  卯: '甲',
  未: '甲',
  巳: '庚',
  酉: '庚',
  丑: '庚',
}

/** 일덕: 특정 일주(간지) */
const ILDEOK_DAYS = ['甲寅', '丙辰', '戊辰', '庚辰', '壬戌']

/** 문창귀인: 일간 → 지지 */
const MUNCHANG_MAP: Record<string, string> = {
  甲: '巳',
  乙: '午',
  丙: '申',
  丁: '酉',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯',
}

/** 학당귀인: 일간 → 장생 지지 */
const HAKDANG_MAP: Record<string, string> = {
  甲: '亥',
  乙: '午',
  丙: '寅',
  丁: '酉',
  戊: '寅',
  己: '酉',
  庚: '巳',
  辛: '子',
  壬: '申',
  癸: '卯',
}

/** 양인: 양간(陽干)만 해당, 일간 → 겁재 왕지 */
const YANGIN_MAP: Record<string, string> = {
  甲: '卯',
  丙: '午',
  戊: '午',
  庚: '酉',
  壬: '子',
}

/** 장성: 년지/일지 삼합국 → 왕지 */
const JANGSEONG_MAP: Record<string, string> = {
  寅: '午',
  午: '午',
  戌: '午',
  巳: '酉',
  酉: '酉',
  丑: '酉',
  申: '子',
  子: '子',
  辰: '子',
  亥: '卯',
  卯: '卯',
  未: '卯',
}

/** 태극귀인: 일간 → 지지 */
const TAIJI_MAP: Record<string, string[]> = {
  甲: ['子', '午'],
  乙: ['子', '午'],
  丙: ['卯', '酉'],
  丁: ['卯', '酉'],
  戊: ['辰', '戌', '丑', '未'],
  己: ['辰', '戌', '丑', '未'],
  庚: ['寅', '亥'],
  辛: ['寅', '亥'],
  壬: ['巳', '申'],
  癸: ['巳', '申'],
}

/** 고란살: 특정 일주(간지), 전통적으로 여성 명식에 적용 */
const GORAN_DAYS = ['甲寅', '乙巳', '丁巳', '戊申', '辛亥']

function allBranches(saju: SajuData): string[] {
  return [saju.pillars.year.zhi, saju.pillars.month.zhi, saju.pillars.day.zhi, saju.pillars.time.zhi]
}

function allStems(saju: SajuData): string[] {
  return [saju.pillars.year.gan, saju.pillars.month.gan, saju.pillars.day.gan, saju.pillars.time.gan]
}

/**
 * 고급 신살 계산 — 년지/일지 기준 삼합 신살 + 일간 기준 귀인 (표준 조견표)
 */
export function calculateAdvancedSinsal(saju: SajuData, gender: 'male' | 'female'): SinsalAdvanced {
  const dayGan = saju.pillars.day.gan
  const dayJi = saju.pillars.day.zhi
  const yearJi = saju.pillars.year.zhi
  const monthJi = saju.pillars.month.zhi
  const dayGanji = saju.pillars.day.ganji
  const branches = allBranches(saju)
  const stems = allStems(saju)

  const hasTrineSinsal = (map: Record<string, string>): boolean => {
    const targets = [map[yearJi], map[dayJi]].filter((t): t is string => Boolean(t))
    return targets.some((t) => branches.includes(t))
  }

  const woldeokGan = WOLDEOK_MAP[monthJi]
  const cheoneulJis = CHEONEUL_MAP[dayGan] ?? []
  const munchangJi = MUNCHANG_MAP[dayGan]
  const hakdangJi = HAKDANG_MAP[dayGan]
  const yanginJi = YANGIN_MAP[dayGan]
  const taijiJis = TAIJI_MAP[dayGan] ?? []

  return {
    yeokma: hasTrineSinsal(YEOKMA_MAP),
    cheonEulGwiin: cheoneulJis.some((ji) => branches.includes(ji)),
    hwagae: hasTrineSinsal(HWAGAE_MAP),
    dohwa: hasTrineSinsal(DOHWA_MAP),
    woldeokGwiin: woldeokGan !== undefined && stems.includes(woldeokGan),
    ildeokGwiin: ILDEOK_DAYS.includes(dayGanji),
    munchangGwiin: munchangJi !== undefined && branches.includes(munchangJi),
    hakdangGwiin: hakdangJi !== undefined && branches.includes(hakdangJi),
    yukhae: hasYukhae(saju),
    yangin: yanginJi !== undefined && branches.includes(yanginJi),
    golanGwasu: gender === 'female' && GORAN_DAYS.includes(dayGanji),
    jangseong: hasTrineSinsal(JANGSEONG_MAP),
    taiji: taijiJis.some((ji) => branches.includes(ji)),
    wongjin: hasWongjin(saju),
  }
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
  const jis = [saju.pillars.year.zhi, saju.pillars.month.zhi, saju.pillars.day.zhi, saju.pillars.time.zhi]

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
  const jis = [saju.pillars.year.zhi, saju.pillars.month.zhi, saju.pillars.day.zhi, saju.pillars.time.zhi]

  for (const pair of pairs) {
    if (jis.includes(pair[0]) && jis.includes(pair[1])) {
      return true
    }
  }
  return false
}

// ========== 십이운성(十二運星) ==========

export type WoonSung = '장생' | '목욕' | '관대' | '건록' | '제왕' | '쇠' | '병' | '사' | '묘' | '절' | '태' | '양'

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

const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const WOONSUNG_ORDER: WoonSung[] = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양']

/** 십이운성 장생 시작 지지: 양간 순행, 음간 역행 (표준 60갑자 조견표와 동치) */
const CHANGSAENG_START: Record<string, { start: string; forward: boolean }> = {
  甲: { start: '亥', forward: true },
  乙: { start: '午', forward: false },
  丙: { start: '寅', forward: true },
  丁: { start: '酉', forward: false },
  戊: { start: '寅', forward: true },
  己: { start: '酉', forward: false },
  庚: { start: '巳', forward: true },
  辛: { start: '子', forward: false },
  壬: { start: '申', forward: true },
  癸: { start: '卯', forward: false },
}

function getWoonSung(gan: string, ji: string): WoonSung {
  const rule = CHANGSAENG_START[gan]
  const jiIdx = ZHI_ORDER.indexOf(ji)
  if (!rule || jiIdx < 0) return '양'

  const startIdx = ZHI_ORDER.indexOf(rule.start)
  const offset = rule.forward ? (jiIdx - startIdx + 12) % 12 : (startIdx - jiIdx + 12) % 12
  return WOONSUNG_ORDER[offset]
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
  const jis = [saju.pillars.year.zhi, saju.pillars.month.zhi, saju.pillars.day.zhi, saju.pillars.time.zhi]

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
  const yearGongmang = findGongmang(saju.pillars.year.gan, saju.pillars.year.zhi)
  const dayGongmang = findGongmang(saju.pillars.day.gan, saju.pillars.day.zhi)

  const allJis = [saju.pillars.year.zhi, saju.pillars.month.zhi, saju.pillars.day.zhi, saju.pillars.time.zhi]

  const affected = allJis.filter((ji) => yearGongmang.includes(ji) || dayGongmang.includes(ji))

  return {
    yearGongmang,
    dayGongmang,
    hasGongmang: affected.length > 0,
    affectedPillars: affected,
  }
}

/**
 * 순중공망(旬中空亡) — 해당 순(旬)의 시작 지지에서 10·11번째 지지가 공망
 * (예: 庚午일 → 甲子旬이 아닌 甲寅旬... 순 시작 = (지지 - 천간) mod 12 → 戌亥 공망)
 */
function findGongmang(gan: string, ji: string): string[] {
  const gans = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

  const ganIdx = gans.indexOf(gan)
  const jiIdx = ZHI_ORDER.indexOf(ji)
  if (ganIdx < 0 || jiIdx < 0) return []

  const sunStartZhiIdx = (((jiIdx - ganIdx) % 12) + 12) % 12
  return [ZHI_ORDER[(sunStartZhiIdx + 10) % 12], ZHI_ORDER[(sunStartZhiIdx + 11) % 12]]
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
  gender: 'male' | 'female',
  isSolar: boolean = true
): ManseAdvancedResult {
  const saju = getSajuData(birthDate, birthTime, isSolar)
  const [year] = birthDate.split('-').map(Number)
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  return {
    saewoon: calculateSaewoon(year, currentYear, saju.dayGan),
    worwoon: calculateWorwoon(currentYear, currentMonth, saju.dayGan),
    sinsal: calculateAdvancedSinsal(saju, gender),
    sibiWoonSung: calculateSibiWoonSung(saju),
    jijiRelations: analyzeJijiRelations(saju),
    gongmang: calculateGongmang(saju),
  }
}
