/**
 * 해화지기 사주 엔진 - 세운(歲運) & 월운(月運) 계산 모듈
 *
 * 순수 결정론적 사주 수학:
 *  - 세운: 해당 연도의 천간지지 → 원국 사주와 합충형파해 교차 분석 → 5개 카테고리 점수
 *  - 월운: 해당 월의 천간지지 → 원국 + 세운 삼중 교차 분석
 *
 * AI/Gemini 호출 없음. 100% 역학(易學) 수학.
 */

import { Solar } from 'lunar-javascript'
import type { SajuContext } from './context-builder'
import { CHEONGAN_HAP, JIJI_SAMHAP, JIJI_YUKHAP, JIJI_CHUNG, JIJI_HYEONG, JIJI_PA, JIJI_HAE } from './relations'

// ===================== 타입 =====================

export type FortuneCategory = '재물운' | '직업운' | '건강운' | '연애운' | '학업운'

export interface CategoryScore {
  category: FortuneCategory
  score: number // 0-100
  trend: 'excellent' | 'good' | 'neutral' | 'caution' | 'poor'
  label: string
  advice: string
}

export interface PillarInteraction {
  type: '천간합' | '천간충' | '지지합' | '지지충' | '지지형' | '지지파' | '지지해'
  label: string
  effect: 'positive' | 'negative' | 'mixed'
  strength: 'strong' | 'moderate' | 'weak'
  pillarSource: string // 어느 원국 기둥과 교차하는지 ('년주' | '월주' | '일주' | '시주')
}

export interface YearlyFortuneResult {
  year: number
  yearPillar: { gan: string; zhi: string; ganji: string }
  yearElement: string // 세운 오행
  totalScore: number // 0-100 종합 점수
  totalTrend: 'excellent' | 'good' | 'neutral' | 'caution' | 'poor'
  categories: CategoryScore[]
  interactions: PillarInteraction[]
  /** 세운 천간이 일간과 맺는 십성 관계 */
  sipseongRelation: string
  /** 세운이 용신 오행과 맺는 관계 */
  yongsinAffinity: 'beneficial' | 'neutral' | 'harmful'
  keyOpportunityMonths: number[] // 기회의 달 (1-12)
  keyCautionMonths: number[] // 주의 달 (1-12)
  summary: string
  detailText: string
}

export interface MonthlyFortuneResult {
  year: number
  month: number
  monthPillar: { gan: string; zhi: string; ganji: string }
  monthElement: string
  totalScore: number
  totalTrend: 'excellent' | 'good' | 'neutral' | 'caution' | 'poor'
  categories: CategoryScore[]
  interactions: PillarInteraction[]
  /** 월운이 세운과 맺는 관계 */
  saewoonInteraction: string
  summary: string
  detailText: string
  luckyDirection: string
  luckyColor: string
  keyDates: string // 길일 패턴 텍스트
}

// ===================== 내부 상수 =====================

const GAN_ELEMENT: Record<string, string> = {
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

const ZHI_ELEMENT: Record<string, string> = {
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

/** 오행 상생: A 생 B */
const SAENG: Record<string, string> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
}

/** 오행 상극: A 극 B */
const GEUK: Record<string, string> = {
  木: '土',
  火: '金',
  土: '水',
  金: '木',
  水: '火',
}

/** 천간 음양 (0=양, 1=음) */
const GAN_YINYANG: Record<string, number> = {
  甲: 0,
  乙: 1,
  丙: 0,
  丁: 1,
  戊: 0,
  己: 1,
  庚: 0,
  辛: 1,
  壬: 0,
  癸: 1,
}

/** 오행별 대표 방위/색 */
const ELEMENT_DIRECTION: Record<string, string> = {
  木: '동쪽',
  火: '남쪽',
  土: '중앙',
  金: '서쪽',
  水: '북쪽',
}
const ELEMENT_COLOR: Record<string, string> = {
  木: '청색·녹색',
  火: '적색·주황',
  土: '황색·갈색',
  金: '백색·은색',
  水: '흑색·남색',
}

/** 십이운성 테이블 (일간 기준) — 강약 점수 매핑 */
const SIBJIUNSEONG_SCORE: Record<string, number> = {
  장생: 8,
  목욕: 6,
  관대: 7,
  건록: 9,
  제왕: 10,
  쇠: 5,
  병: 3,
  사: 2,
  묘: 1,
  절: 0,
  태: 3,
  양: 5,
}

const SIBJIUNSEONG_TABLE: Record<string, Record<string, string>> = {
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
  乙: {
    午: '장생',
    巳: '목욕',
    辰: '관대',
    卯: '건록',
    寅: '제왕',
    丑: '쇠',
    子: '병',
    亥: '사',
    戌: '묘',
    酉: '절',
    申: '태',
    未: '양',
  },
  丙: {
    寅: '장생',
    卯: '목욕',
    辰: '관대',
    巳: '건록',
    午: '제왕',
    未: '쇠',
    申: '병',
    酉: '사',
    戌: '묘',
    亥: '절',
    子: '태',
    丑: '양',
  },
  丁: {
    酉: '장생',
    申: '목욕',
    未: '관대',
    午: '건록',
    巳: '제왕',
    辰: '쇠',
    卯: '병',
    寅: '사',
    丑: '묘',
    子: '절',
    亥: '태',
    戌: '양',
  },
  戊: {
    寅: '장생',
    卯: '목욕',
    辰: '관대',
    巳: '건록',
    午: '제왕',
    未: '쇠',
    申: '병',
    酉: '사',
    戌: '묘',
    亥: '절',
    子: '태',
    丑: '양',
  },
  己: {
    酉: '장생',
    申: '목욕',
    未: '관대',
    午: '건록',
    巳: '제왕',
    辰: '쇠',
    卯: '병',
    寅: '사',
    丑: '묘',
    子: '절',
    亥: '태',
    戌: '양',
  },
  庚: {
    巳: '장생',
    午: '목욕',
    未: '관대',
    申: '건록',
    酉: '제왕',
    戌: '쇠',
    亥: '병',
    子: '사',
    丑: '묘',
    寅: '절',
    卯: '태',
    辰: '양',
  },
  辛: {
    子: '장생',
    亥: '목욕',
    戌: '관대',
    酉: '건록',
    申: '제왕',
    未: '쇠',
    午: '병',
    巳: '사',
    辰: '묘',
    卯: '절',
    寅: '태',
    丑: '양',
  },
  壬: {
    申: '장생',
    酉: '목욕',
    戌: '관대',
    亥: '건록',
    子: '제왕',
    丑: '쇠',
    寅: '병',
    卯: '사',
    辰: '묘',
    巳: '절',
    午: '태',
    未: '양',
  },
  癸: {
    卯: '장생',
    寅: '목욕',
    丑: '관대',
    子: '건록',
    亥: '제왕',
    戌: '쇠',
    酉: '병',
    申: '사',
    未: '묘',
    午: '절',
    巳: '태',
    辰: '양',
  },
}

/** 천간 지반(지지에서의) 십이운성 조회 */
function getSibjiunseong(dayMaster: string, zhi: string): string {
  return SIBJIUNSEONG_TABLE[dayMaster]?.[zhi] ?? '태'
}

// ===================== 간지 계산 =====================

/**
 * lunar-javascript 라이브러리로 특정 연도의 세운 간지 계산.
 * 양력 6월 15일 기준 (절기 중간)
 */
export function getYearPillar(year: number): { gan: string; zhi: string; ganji: string } {
  const solar = Solar.fromYmdHms(year, 6, 15, 12, 0, 0)
  const ec = solar.getLunar().getEightChar() as unknown as {
    getYearGan(): string
    getYearZhi(): string
    getYear(): string
  }
  const gan = ec.getYearGan()
  const zhi = ec.getYearZhi()
  return { gan, zhi, ganji: gan + zhi }
}

/**
 * lunar-javascript 라이브러리로 특정 연월의 월운 간지 계산.
 * 해당 월 15일 기준
 */
export function getMonthPillar(year: number, month: number): { gan: string; zhi: string; ganji: string } {
  const solar = Solar.fromYmdHms(year, month, 15, 12, 0, 0)
  const ec = solar.getLunar().getEightChar() as unknown as {
    getMonthGan(): string
    getMonthZhi(): string
    getMonth(): string
  }
  const gan = ec.getMonthGan()
  const zhi = ec.getMonthZhi()
  return { gan, zhi, ganji: gan + zhi }
}

// ===================== 십성(십성) 관계 계산 =====================

/**
 * 일간(dayMaster)과 타 천간(otherGan) 사이의 십성 명칭 반환
 */
function getSipseongRelation(dayMaster: string, otherGan: string): string {
  if (dayMaster === otherGan) return '비견'

  const dmEl = GAN_ELEMENT[dayMaster]
  const otEl = GAN_ELEMENT[otherGan]
  const dmYY = GAN_YINYANG[dayMaster]
  const otYY = GAN_YINYANG[otherGan]
  const sameYY = dmYY === otYY

  if (otEl === dmEl) return sameYY ? '비견' : '겁재'

  // 내가 생하는 오행 (식상)
  if (SAENG[dmEl] === otEl) return sameYY ? '식신' : '상관'

  // 내가 극하는 오행 (재성)
  if (GEUK[dmEl] === otEl) return sameYY ? '편재' : '정재'

  // 나를 극하는 오행 (관성)
  if (GEUK[otEl] === dmEl) return sameYY ? '편관' : '정관'

  // 나를 생하는 오행 (인성)
  if (SAENG[otEl] === dmEl) return sameYY ? '편인' : '정인'

  return '?'
}

// ===================== 합충형파해 교차 검사 =====================

interface InteractionCheckResult {
  interactions: PillarInteraction[]
  positiveCount: number
  negativeCount: number
  strongNegative: boolean // 충·형 등 강력 부정 있는지
}

/**
 * 세운 또는 월운의 간지와 원국 4기둥을 교차하여
 * 합충형파해 목록을 반환
 */
function checkInteractions(
  flowGan: string,
  flowZhi: string,
  natalPillars: Array<{ gan: string; zhi: string; label: string }>
): InteractionCheckResult {
  const interactions: PillarInteraction[] = []
  let positiveCount = 0
  let negativeCount = 0
  let strongNegative = false

  for (const natal of natalPillars) {
    // --- 천간합 ---
    const hapInfo = CHEONGAN_HAP[flowGan]
    if (hapInfo && hapInfo.partner === natal.gan) {
      interactions.push({
        type: '천간합',
        label: hapInfo.label,
        effect: 'positive',
        strength: 'strong',
        pillarSource: natal.label,
      })
      positiveCount += 2
    }

    // --- 천간충 ---
    const CHEONGAN_CHUNG: Record<string, string> = {
      甲: '庚',
      庚: '甲',
      乙: '辛',
      辛: '乙',
      丙: '壬',
      壬: '丙',
      丁: '癸',
      癸: '丁',
    }
    if (CHEONGAN_CHUNG[flowGan] === natal.gan) {
      interactions.push({
        type: '천간충',
        label: `${flowGan}${natal.gan}충`,
        effect: 'negative',
        strength: 'moderate',
        pillarSource: natal.label,
      })
      negativeCount += 1
    }

    // --- 지지육합 ---
    const ykhFound = JIJI_YUKHAP.find(
      (y) => (y.zhis[0] === flowZhi && y.zhis[1] === natal.zhi) || (y.zhis[1] === flowZhi && y.zhis[0] === natal.zhi)
    )
    if (ykhFound) {
      interactions.push({
        type: '지지합',
        label: ykhFound.label,
        effect: 'positive',
        strength: 'strong',
        pillarSource: natal.label,
      })
      positiveCount += 2
    }

    // --- 지지충 ---
    if (JIJI_CHUNG[flowZhi] === natal.zhi) {
      interactions.push({
        type: '지지충',
        label: `${flowZhi}${natal.zhi}충`,
        effect: 'negative',
        strength: 'strong',
        pillarSource: natal.label,
      })
      negativeCount += 2
      strongNegative = true
    }

    // --- 지지형 ---
    for (const hyeong of JIJI_HYEONG) {
      if (hyeong.zhis.includes(flowZhi) && hyeong.zhis.includes(natal.zhi) && flowZhi !== natal.zhi) {
        interactions.push({
          type: '지지형',
          label: hyeong.label,
          effect: 'negative',
          strength: 'strong',
          pillarSource: natal.label,
        })
        negativeCount += 2
        strongNegative = true
        break
      }
    }

    // --- 지지파 ---
    const paFound = JIJI_PA.find(
      ([z1, z2]) => (z1 === flowZhi && z2 === natal.zhi) || (z2 === flowZhi && z1 === natal.zhi)
    )
    if (paFound) {
      interactions.push({
        type: '지지파',
        label: `${flowZhi}${natal.zhi}파`,
        effect: 'mixed',
        strength: 'moderate',
        pillarSource: natal.label,
      })
      negativeCount += 1
    }

    // --- 지지해 ---
    const haeFound = JIJI_HAE.find(
      ([z1, z2]) => (z1 === flowZhi && z2 === natal.zhi) || (z2 === flowZhi && z1 === natal.zhi)
    )
    if (haeFound) {
      interactions.push({
        type: '지지해',
        label: `${flowZhi}${natal.zhi}해`,
        effect: 'negative',
        strength: 'weak',
        pillarSource: natal.label,
      })
      negativeCount += 1
    }
  }

  return { interactions, positiveCount, negativeCount, strongNegative }
}

// 지지삼합 검사 (3개 기둥 + 유동 1개)
function checkSamhapBonus(flowZhi: string, natalZhis: string[]): number {
  let bonus = 0
  for (const samhap of JIJI_SAMHAP) {
    const combined = [...natalZhis, flowZhi]
    const matchCount = samhap.zhis.filter((z) => combined.includes(z)).length
    if (matchCount >= 3) bonus += 15
    else if (matchCount === 2 && samhap.zhis.includes(flowZhi)) bonus += 8
  }
  return bonus
}

// ===================== 용신 친화도 계산 =====================

function calcYongsinAffinity(
  flowElement: string,
  yongsin: string | null,
  gisin: string | null
): 'beneficial' | 'neutral' | 'harmful' {
  if (!yongsin) return 'neutral'
  if (flowElement === yongsin) return 'beneficial'
  if (SAENG[yongsin] === flowElement) return 'beneficial' // 용신을 생하는 오행
  if (gisin && (flowElement === gisin || SAENG[gisin] === flowElement)) return 'harmful'
  return 'neutral'
}

// ===================== 카테고리 점수 계산 =====================

interface BaseScoreInput {
  positiveCount: number
  negativeCount: number
  strongNegative: boolean
  samhapBonus: number
  yongsinAffinity: 'beneficial' | 'neutral' | 'harmful'
  sipseongRelation: string // 세운 천간의 십성
  dayMasterStrength: number // 0-100 신강/신약 점수
  sibjiunseongScore: number // 0-10 십이운성 점수
}

function buildCategoryScores(input: BaseScoreInput): CategoryScore[] {
  const {
    positiveCount,
    negativeCount,
    strongNegative,
    samhapBonus,
    yongsinAffinity,
    sipseongRelation,
    dayMasterStrength,
    sibjiunseongScore,
  } = input

  // 기저 점수: 합충형파해 결과로 계산
  const baseRaw = 50 + positiveCount * 8 - negativeCount * 8 + samhapBonus
  const yongsinMod = yongsinAffinity === 'beneficial' ? 12 : yongsinAffinity === 'harmful' ? -12 : 0
  const sijMod = ((sibjiunseongScore - 5) / 5) * 10 // -10 ~ +10
  let base = Math.min(95, Math.max(20, baseRaw + yongsinMod + sijMod))

  // 강력 부정 충/형이 있으면 전체 천장 80으로 제한
  if (strongNegative) base = Math.min(base, 78)

  // 십성별 카테고리 조정 가중치
  // [재물, 직업, 건강, 연애, 학업]
  const sipseongWeights: Record<string, number[]> = {
    비견: [0, 5, 5, -5, 0],
    겁재: [-10, 5, 0, -10, 0],
    식신: [10, 5, 10, 5, 10],
    상관: [5, -5, 0, 10, 5],
    편재: [15, 10, 0, 5, 0],
    정재: [10, 5, 5, 0, 0],
    편관: [-5, 10, -5, -5, 0],
    정관: [0, 15, 0, 10, 0],
    편인: [0, 0, 5, -5, 15],
    정인: [0, 5, 5, 0, 15],
  }
  const weights = sipseongWeights[sipseongRelation] ?? [0, 0, 0, 0, 0]

  const CATEGORIES: FortuneCategory[] = ['재물운', '직업운', '건강운', '연애운', '학업운']

  return CATEGORIES.map((cat, i) => {
    // 신강(점수 높음) 사주는 관성/상관이 직업운에 더 유리
    let extraMod = 0
    if (cat === '건강운') {
      // 건강은 십이운성 영향이 큼
      extraMod = sijMod * 0.8
    }
    if (cat === '직업운' && dayMasterStrength < 40) {
      // 신약이면 관성이 부담 → 직업운 감점
      if (sipseongRelation === '편관' || sipseongRelation === '정관') extraMod -= 5
    }

    const rawScore = Math.round(base + weights[i] + extraMod)
    const score = Math.min(98, Math.max(15, rawScore))
    const trend = scoreTrend(score)
    return { category: cat, score, trend, label: trendLabel(trend), advice: buildAdvice(cat, trend, sipseongRelation) }
  })
}

function scoreTrend(score: number): CategoryScore['trend'] {
  if (score >= 80) return 'excellent'
  if (score >= 65) return 'good'
  if (score >= 45) return 'neutral'
  if (score >= 30) return 'caution'
  return 'poor'
}

function trendLabel(trend: CategoryScore['trend']): string {
  const map: Record<CategoryScore['trend'], string> = {
    excellent: '대길(大吉)',
    good: '길(吉)',
    neutral: '평(平)',
    caution: '주의(注意)',
    poor: '흉(凶)',
  }
  return map[trend]
}

function buildAdvice(cat: FortuneCategory, trend: CategoryScore['trend'], sipseong: string): string {
  const adviceMap: Record<FortuneCategory, Record<CategoryScore['trend'], string>> = {
    재물운: {
      excellent: '투자·확장에 유리한 시기. 과감한 결단이 결실을 맺습니다.',
      good: '안정적인 수익이 기대됩니다. 꾸준히 관리하면 성과가 납니다.',
      neutral: '재물 변동이 크지 않습니다. 현상 유지에 집중하십시오.',
      caution: '충동적 지출과 투기성 투자를 삼가십시오.',
      poor: '재물 손실 위험이 있습니다. 중요 계약·투자를 미루십시오.',
    },
    직업운: {
      excellent: '승진·이직·창업 모두 길한 시기. 기회를 놓치지 마십시오.',
      good: '직업적 성과가 인정받습니다. 꾸준한 노력이 빛을 발합니다.',
      neutral: '현 위치를 지키는 것이 최선입니다.',
      caution: '직장 내 갈등·부침에 주의하십시오. 상사와의 마찰을 피하세요.',
      poor: '직업 변동 리스크가 높습니다. 새로운 시작보다 내실 다지기를 권합니다.',
    },
    건강운: {
      excellent: '체력이 충만합니다. 적극적인 활동이 건강을 강화합니다.',
      good: '건강 상태가 양호합니다. 규칙적인 생활 습관을 유지하십시오.',
      neutral: '특별한 건강 변화는 없습니다. 무리하지 마십시오.',
      caution: '과로와 스트레스에 주의하십시오. 소화기·호흡기 관리를 권합니다.',
      poor: '건강에 적신호가 우려됩니다. 정기검진과 충분한 휴식이 필요합니다.',
    },
    연애운: {
      excellent: '인연의 기운이 강합니다. 새로운 만남이나 결실이 기대됩니다.',
      good: '관계가 성숙해지는 시기. 표현을 아끼지 마십시오.',
      neutral: '연애운에 큰 변화는 없습니다.',
      caution: '오해와 갈등이 생기기 쉽습니다. 감정적 충돌을 피하십시오.',
      poor: '이별·다툼의 기운이 있습니다. 성급한 결정을 자제하십시오.',
    },
    학업운: {
      excellent: '집중력과 기억력이 최고조입니다. 시험·자격증 도전에 최적기.',
      good: '꾸준히 노력하면 좋은 성과를 거둡니다.',
      neutral: '학업에 큰 변화는 없습니다. 기초를 다지십시오.',
      caution: '집중력이 흐트러지기 쉽습니다. 학습 환경을 정비하십시오.',
      poor: '학업 성취가 어려운 시기입니다. 무리한 시험 도전보다 준비를 더하십시오.',
    },
  }
  return adviceMap[cat]?.[trend] ?? ''
}

// ===================== 기회/주의 월 계산 (세운 전용) =====================

/**
 * 12개 월 중 세운 지지와 합이 되는 달(기회) / 충이 되는 달(주의)을 찾는다.
 */
function findKeyMonths(yearZhi: string, year: number): { opportunity: number[]; caution: number[] } {
  const opportunity: number[] = []
  const caution: number[] = []

  for (let m = 1; m <= 12; m++) {
    const mp = getMonthPillar(year, m)
    // 육합 또는 삼합
    const isYukhap = JIJI_YUKHAP.some(
      (y) => (y.zhis[0] === yearZhi && y.zhis[1] === mp.zhi) || (y.zhis[1] === yearZhi && y.zhis[0] === mp.zhi)
    )
    const isSamhap = JIJI_SAMHAP.some((s) => s.zhis.includes(yearZhi) && s.zhis.includes(mp.zhi))
    if (isYukhap || isSamhap) opportunity.push(m)
    // 충
    if (JIJI_CHUNG[yearZhi] === mp.zhi) caution.push(m)
  }

  return { opportunity, caution }
}

// ===================== 서사 텍스트 생성 =====================

function buildYearSummary(
  yearPillar: { gan: string; zhi: string; ganji: string },
  yearElement: string,
  sipseongRelation: string,
  totalScore: number,
  yongsinAffinity: 'beneficial' | 'neutral' | 'harmful',
  interactions: PillarInteraction[]
): string {
  const trend = scoreTrend(totalScore)
  const trendKor: Record<string, string> = {
    excellent: '매우 길한 해',
    good: '순조로운 해',
    neutral: '평범한 해',
    caution: '주의가 필요한 해',
    poor: '어려움이 예상되는 해',
  }

  const hapList = interactions.filter((i) => i.effect === 'positive').map((i) => i.label)
  const chungList = interactions.filter((i) => i.type === '지지충' || i.type === '천간충').map((i) => i.label)
  const hyeongList = interactions.filter((i) => i.type === '지지형').map((i) => i.label)

  const yongsinText =
    yongsinAffinity === 'beneficial'
      ? `세운 오행(${yearElement})이 용신(用神)과 합치하여 개운(開運) 에너지가 강합니다.`
      : yongsinAffinity === 'harmful'
        ? `세운 오행(${yearElement})이 기신(忌神)과 일치하여 주의가 요구됩니다.`
        : `세운 오행(${yearElement})은 용신과 중립 관계입니다.`

  const parts: string[] = [
    `${yearPillar.ganji}년은 ${trendKor[trend]}로 분류됩니다.`,
    `세운 천간 ${yearPillar.gan}은 일간과 ${sipseongRelation} 관계를 형성합니다.`,
    yongsinText,
  ]

  if (hapList.length > 0) parts.push(`원국과 합(合) 작용: ${hapList.join(', ')} — 화합과 성취의 기운.`)
  if (chungList.length > 0) parts.push(`충(沖) 발생: ${chungList.join(', ')} — 변동·이사·직업 변화 가능성.`)
  if (hyeongList.length > 0) parts.push(`형(刑) 발생: ${hyeongList.join(', ')} — 관재구설·건강 주의.`)

  return parts.join(' ')
}

function buildMonthSummary(
  monthPillar: { gan: string; zhi: string; ganji: string },
  monthElement: string,
  sipseongRelation: string,
  totalScore: number,
  saewoonInteraction: string,
  interactions: PillarInteraction[]
): string {
  const trend = scoreTrend(totalScore)
  const trendKor: Record<string, string> = {
    excellent: '길한 달',
    good: '순조로운 달',
    neutral: '평범한 달',
    caution: '주의할 달',
    poor: '어려운 달',
  }

  const parts: string[] = [
    `${monthPillar.ganji}월은 ${trendKor[trend]}입니다.`,
    `월운 천간 ${monthPillar.gan}은 일간과 ${sipseongRelation} 관계.`,
  ]

  if (saewoonInteraction) parts.push(`세운과의 관계: ${saewoonInteraction}.`)

  const chungList = interactions.filter((i) => i.type === '지지충').map((i) => i.label)
  const hapList = interactions.filter((i) => i.effect === 'positive').map((i) => i.label)
  if (hapList.length > 0) parts.push(`합(合): ${hapList.join(', ')} — 도움과 협력이 따릅니다.`)
  if (chungList.length > 0) parts.push(`충(沖): ${chungList.join(', ')} — 변동에 유의하십시오.`)

  return parts.join(' ')
}

function buildYearDetailText(result: Omit<YearlyFortuneResult, 'detailText'>): string {
  const catTexts = result.categories.map((c) => `• ${c.category}(${c.label} ${c.score}점): ${c.advice}`).join('\n')

  const opMonths =
    result.keyOpportunityMonths.length > 0
      ? `기회의 달: ${result.keyOpportunityMonths.map((m) => `${m}월`).join(', ')}`
      : '특별한 기회의 달 없음'
  const caMonths =
    result.keyCautionMonths.length > 0
      ? `주의 달: ${result.keyCautionMonths.map((m) => `${m}월`).join(', ')}`
      : '특별한 주의 달 없음'

  return [
    `[${result.year}년 ${result.yearPillar.ganji} 세운 상세]`,
    result.summary,
    '',
    '[카테고리별 운세]',
    catTexts,
    '',
    `[월별 에너지 흐름] ${opMonths} | ${caMonths}`,
  ].join('\n')
}

function buildMonthDetailText(result: Omit<MonthlyFortuneResult, 'detailText'>): string {
  const catTexts = result.categories.map((c) => `• ${c.category}(${c.label} ${c.score}점): ${c.advice}`).join('\n')

  return [
    `[${result.year}년 ${result.month}월 ${result.monthPillar.ganji} 월운 상세]`,
    result.summary,
    '',
    '[카테고리별 운세]',
    catTexts,
    '',
    `행운 방향: ${result.luckyDirection} | 행운 색: ${result.luckyColor}`,
    `길일 패턴: ${result.keyDates}`,
  ].join('\n')
}

// 세운·월운 간 교차 텍스트
function describeSaewoonMoonthInteraction(
  yearZhi: string,
  monthZhi: string,
  yearGan: string,
  monthGan: string
): string {
  const parts: string[] = []

  // 지지 관계
  if (JIJI_CHUNG[yearZhi] === monthZhi) {
    parts.push(`세운(${yearZhi})과 월운(${monthZhi}) 충(沖) — 이달 세운 기운이 흔들림`)
  } else {
    const ykhFound = JIJI_YUKHAP.find(
      (y) => (y.zhis[0] === yearZhi && y.zhis[1] === monthZhi) || (y.zhis[1] === yearZhi && y.zhis[0] === monthZhi)
    )
    if (ykhFound) parts.push(`세운·월운 육합(${ykhFound.label}) — 두 기운이 협력하여 길한 달`)
  }

  // 천간 합
  const hapInfo = CHEONGAN_HAP[yearGan]
  if (hapInfo && hapInfo.partner === monthGan) {
    parts.push(`세운·월운 천간합(${hapInfo.label}) — 사업·인간관계에서 귀인 등장`)
  }

  return parts.join('; ') || '세운과 월운이 중립 관계'
}

// ===================== 메인 Export 함수 =====================

/**
 * 세운(歲運) 계산
 *
 * @param ctx - buildSajuContext()로 생성된 사주 컨텍스트
 * @param year - 분석할 연도 (e.g., 2026)
 */
export function calculateYearlyFortune(ctx: SajuContext, year: number): YearlyFortuneResult {
  const { sajuData } = ctx
  const { pillars, dayMaster } = sajuData

  const yearPillar = getYearPillar(year)
  const yearElement = GAN_ELEMENT[yearPillar.gan] ?? ZHI_ELEMENT[yearPillar.zhi] ?? '土'

  // 원국 4기둥 배열
  const natalPillars = [
    { gan: pillars.year.gan, zhi: pillars.year.zhi, label: '년주' },
    { gan: pillars.month.gan, zhi: pillars.month.zhi, label: '월주' },
    { gan: pillars.day.gan, zhi: pillars.day.zhi, label: '일주' },
    { gan: pillars.time.gan, zhi: pillars.time.zhi, label: '시주' },
  ]

  // 합충형파해 교차 검사
  const { interactions, positiveCount, negativeCount, strongNegative } = checkInteractions(
    yearPillar.gan,
    yearPillar.zhi,
    natalPillars
  )

  // 삼합 보너스
  const natalZhis = natalPillars.map((p) => p.zhi)
  const samhapBonus = checkSamhapBonus(yearPillar.zhi, natalZhis)

  // 십성 관계
  const sipseongRelation = getSipseongRelation(dayMaster, yearPillar.gan)

  // 용신 친화도
  const yongsin = ctx.analysis.tripleYongsin?.finalYongsin ?? ctx.analysis.yongsin?.yongsin ?? null
  const gisin = ctx.analysis.tripleYongsin?.finalGisin ?? ctx.analysis.yongsin?.gisinKorean ?? null
  const yongsinAffinity = calcYongsinAffinity(yearElement, yongsin, gisin)

  // 십이운성 (세운 지지에서 일간의 에너지)
  const sibjiunseongName = getSibjiunseong(dayMaster, yearPillar.zhi)
  const sibjiunseongScore = SIBJIUNSEONG_SCORE[sibjiunseongName] ?? 5

  // 신강/신약 점수
  const dayMasterStrength = ctx.analysis.sipseong.bodyStrengthScore ?? 50

  // 카테고리 점수
  const categories = buildCategoryScores({
    positiveCount,
    negativeCount,
    strongNegative,
    samhapBonus,
    yongsinAffinity,
    sipseongRelation,
    dayMasterStrength,
    sibjiunseongScore,
  })

  const totalScore = Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length)
  const totalTrend = scoreTrend(totalScore)

  // 기회/주의 달
  const { opportunity: keyOpportunityMonths, caution: keyCautionMonths } = findKeyMonths(yearPillar.zhi, year)

  const summary = buildYearSummary(yearPillar, yearElement, sipseongRelation, totalScore, yongsinAffinity, interactions)

  const partial: Omit<YearlyFortuneResult, 'detailText'> = {
    year,
    yearPillar,
    yearElement,
    totalScore,
    totalTrend,
    categories,
    interactions,
    sipseongRelation,
    yongsinAffinity,
    keyOpportunityMonths,
    keyCautionMonths,
    summary,
  }

  return { ...partial, detailText: buildYearDetailText(partial) }
}

/**
 * 월운(月運) 계산
 *
 * @param ctx - buildSajuContext()로 생성된 사주 컨텍스트
 * @param year - 분석할 연도
 * @param month - 분석할 월 (1-12)
 */
export function calculateMonthlyFortune(ctx: SajuContext, year: number, month: number): MonthlyFortuneResult {
  const { sajuData } = ctx
  const { pillars, dayMaster } = sajuData

  const monthPillar = getMonthPillar(year, month)
  const yearPillar = getYearPillar(year)
  const monthElement = GAN_ELEMENT[monthPillar.gan] ?? ZHI_ELEMENT[monthPillar.zhi] ?? '土'

  // 원국 4기둥 + 세운 기둥을 모두 교차 대상으로
  const natalPillars = [
    { gan: pillars.year.gan, zhi: pillars.year.zhi, label: '년주' },
    { gan: pillars.month.gan, zhi: pillars.month.zhi, label: '월주' },
    { gan: pillars.day.gan, zhi: pillars.day.zhi, label: '일주' },
    { gan: pillars.time.gan, zhi: pillars.time.zhi, label: '시주' },
    { gan: yearPillar.gan, zhi: yearPillar.zhi, label: '세운' }, // 세운도 포함
  ]

  const { interactions, positiveCount, negativeCount, strongNegative } = checkInteractions(
    monthPillar.gan,
    monthPillar.zhi,
    natalPillars
  )

  const natalZhis = natalPillars.map((p) => p.zhi)
  const samhapBonus = checkSamhapBonus(monthPillar.zhi, natalZhis)

  const sipseongRelation = getSipseongRelation(dayMaster, monthPillar.gan)

  const yongsin = ctx.analysis.tripleYongsin?.finalYongsin ?? ctx.analysis.yongsin?.yongsin ?? null
  const gisin = ctx.analysis.tripleYongsin?.finalGisin ?? ctx.analysis.yongsin?.gisinKorean ?? null
  const yongsinAffinity = calcYongsinAffinity(monthElement, yongsin, gisin)

  const sibjiunseongName = getSibjiunseong(dayMaster, monthPillar.zhi)
  const sibjiunseongScore = SIBJIUNSEONG_SCORE[sibjiunseongName] ?? 5

  const dayMasterStrength = ctx.analysis.sipseong.bodyStrengthScore ?? 50

  const categories = buildCategoryScores({
    positiveCount,
    negativeCount,
    strongNegative,
    samhapBonus,
    yongsinAffinity,
    sipseongRelation,
    dayMasterStrength,
    sibjiunseongScore,
  })

  const totalScore = Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length)
  const totalTrend = scoreTrend(totalScore)

  // 세운-월운 교차 서술
  const saewoonInteraction = describeSaewoonMoonthInteraction(
    yearPillar.zhi,
    monthPillar.zhi,
    yearPillar.gan,
    monthPillar.gan
  )

  // 행운 방향/색 — 용신 오행 기준, 없으면 월운 오행
  const luckyEl = yongsin ?? monthElement
  const luckyDirection = ELEMENT_DIRECTION[luckyEl] ?? '동쪽'
  const luckyColor = ELEMENT_COLOR[luckyEl] ?? '청색'

  // 길일 패턴: 월운 지지와 삼합·육합이 되는 일간지지 나열
  const luckyZhis = JIJI_SAMHAP.filter((s) => s.zhis.includes(monthPillar.zhi)).flatMap((s) =>
    s.zhis.filter((z) => z !== monthPillar.zhi)
  )
  const luckyYukhap = JIJI_YUKHAP.filter((y) => y.zhis.includes(monthPillar.zhi)).flatMap((y) =>
    y.zhis.filter((z) => z !== monthPillar.zhi)
  )
  const allLucky = [...new Set([...luckyZhis, ...luckyYukhap])]
  const keyDates =
    allLucky.length > 0 ? `일지(日支)가 ${allLucky.join('·')}인 날이 이달의 길일` : '특별한 길일 패턴 없음'

  const summary = buildMonthSummary(
    monthPillar,
    monthElement,
    sipseongRelation,
    totalScore,
    saewoonInteraction,
    interactions
  )

  const partial: Omit<MonthlyFortuneResult, 'detailText'> = {
    year,
    month,
    monthPillar,
    monthElement,
    totalScore,
    totalTrend,
    categories,
    interactions,
    saewoonInteraction,
    summary,
    luckyDirection,
    luckyColor,
    keyDates,
  }

  return { ...partial, detailText: buildMonthDetailText(partial) }
}
