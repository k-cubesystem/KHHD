/**
 * 해화지기 사주 엔진 - 삼중 용신(三用神) 판별 알고리즘
 * 자평진전 기반: 억부용신 + 조후용신 + 통관용신
 */

import type { SajuData } from '@/lib/domain/saju/saju'
import type { YongsinAnalysis } from '@/lib/domain/saju/saju-analysis'
import type { SipseongMap } from './sipseong'

// ===================== 타입 정의 =====================

export interface EokbuYongsin {
  type: 'eokbu'
  element: string
  huisin: string
  gisin: string
  gusin: string
  hansin: string
  isStrong: boolean
  score: number // 0-100 확신도
  reason: string
}

export interface JohuYongsin {
  type: 'johu'
  element: string
  season: string
  monthZhi: string
  urgency: 'critical' | 'moderate' | 'low'
  score: number
  reason: string
}

export interface TonggwanYongsin {
  type: 'tonggwan'
  element: string
  conflictPair: [string, string]
  isActive: boolean
  score: number
  reason: string
}

export interface TripleYongsinResult {
  eokbu: EokbuYongsin
  johu: JohuYongsin
  tonggwan: TonggwanYongsin
  finalYongsin: string
  finalHuisin: string
  finalGisin: string
  finalGusin: string
  priority: 'eokbu' | 'johu' | 'tonggwan'
  fusionReason: string
  legacy: YongsinAnalysis
}

// ===================== 오행 데이터 =====================

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

const _ZHI_ELEMENT: Record<string, string> = {
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

const SAENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const GEUK: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }
/** X를 생하는 오행 (피생) */
const SAENG_BY: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }
/** X를 극하는 오행 (피극) */
const GEUK_BY: Record<string, string> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }

const ELEMENT_KR: Record<string, string> = { 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' }
const ALL_ELEMENTS = ['木', '火', '土', '金', '水']

// ===================== 1. 억부용신 =====================

function calcEokbu(sajuData: SajuData, sipseong: SipseongMap): EokbuYongsin {
  const dayEl = GAN_ELEMENT[sajuData.dayMaster] || '木'
  const { strengthAssessment, bodyStrengthScore } = sipseong
  const isStrong = strengthAssessment === '신강'
  const isNeutral = strengthAssessment === '중화'

  let element: string
  let reason: string
  let score: number

  if (isNeutral) {
    // 중화일 때는 가장 부족한 오행
    const sorted = ALL_ELEMENTS.map((el) => ({
      el,
      cnt: sajuData.elementsDistribution[el] || 0,
    })).sort((a, b) => a.cnt - b.cnt)
    element = sorted[0].el
    reason = `중화 사주이나 ${ELEMENT_KR[element]} 기운이 가장 부족하여 보충합니다.`
    score = 40
  } else if (isStrong) {
    // 신강 → 설기(식상) > 극기(관성) > 소기(재성)
    const sikEl = SAENG[dayEl]! // 식상
    const gwanEl = GEUK_BY[dayEl]! // 관성(나를 극하는)
    const _jaeEl = GEUK[dayEl]! // 재성(내가 극하는)

    // 식상이 없거나 적으면 식상, 많으면 관성
    const sikCnt = sajuData.elementsDistribution[sikEl] || 0
    if (sikCnt < 2) {
      element = sikEl
      reason = `신강 사주 — ${ELEMENT_KR[sikEl]}(식상)으로 에너지를 소모·발산시켜 균형을 맞춥니다.`
    } else {
      element = gwanEl
      reason = `신강 사주 — 식상이 이미 있어 ${ELEMENT_KR[gwanEl]}(관성)으로 직접 제어합니다.`
    }
    score = 70 + Math.min(20, Math.abs(bodyStrengthScore - 50))
  } else {
    // 신약 → 생아(인성) > 조아(비겁)
    const inEl = SAENG_BY[dayEl]! // 인성(나를 생하는)
    const biEl = dayEl // 비겁(같은 오행)

    const inCnt = sajuData.elementsDistribution[inEl] || 0
    if (inCnt < 2) {
      element = inEl
      reason = `신약 사주 — ${ELEMENT_KR[inEl]}(인성)으로 일간의 힘을 북돋습니다.`
    } else {
      element = biEl
      reason = `신약 사주 — 인성은 이미 있어 ${ELEMENT_KR[biEl]}(비겁)으로 직접 돕습니다.`
    }
    score = 70 + Math.min(20, Math.abs(bodyStrengthScore - 50))
  }

  const huisin = SAENG_BY[element]!
  const gisin = GEUK_BY[element]!
  const gusin = SAENG_BY[gisin]!
  const hansin = ALL_ELEMENTS.find((e) => e !== element && e !== huisin && e !== gisin && e !== gusin) || '土'

  return { type: 'eokbu', element, huisin, gisin, gusin, hansin, isStrong, score, reason }
}

// ===================== 2. 조후용신 =====================

/** 월지→계절 + 조후 필요 오행 */
const JOHU_MAP: Record<string, { season: string; element: string; urgency: 'critical' | 'moderate' | 'low' }> = {
  子: { season: '한겨울', element: '火', urgency: 'critical' },
  丑: { season: '늦겨울', element: '火', urgency: 'critical' },
  寅: { season: '초봄', element: '火', urgency: 'low' }, // 봄은 조후 약함
  卯: { season: '한봄', element: '火', urgency: 'low' },
  辰: { season: '늦봄', element: '水', urgency: 'moderate' },
  巳: { season: '초여름', element: '水', urgency: 'moderate' },
  午: { season: '한여름', element: '水', urgency: 'critical' },
  未: { season: '늦여름', element: '水', urgency: 'critical' },
  申: { season: '초가을', element: '火', urgency: 'low' },
  酉: { season: '한가을', element: '火', urgency: 'low' },
  戌: { season: '늦가을', element: '水', urgency: 'moderate' },
  亥: { season: '초겨울', element: '火', urgency: 'critical' },
}

/** 특수 조후: 특정 일간+월지 조합 */
const SPECIAL_JOHU: Record<string, Record<string, { element: string; reason: string }>> = {
  甲: {
    子: { element: '火', reason: '甲木이 한겨울에 태어나면 반드시 丙火(태양)가 필요합니다' },
    丑: { element: '火', reason: '甲木이 얼어붙은 땅에서는 丙火의 온기가 급선무입니다' },
  },
  丙: {
    子: { element: '木', reason: '丙火가 한겨울에 태어나면 壬水와 만나 기제(旣濟)를 이루고, 木의 통관이 필요합니다' },
    亥: { element: '木', reason: '丙火가 겨울 물에 빠지면 木이 다리를 놓아주어야 합니다' },
  },
  庚: {
    午: { element: '水', reason: '庚金이 한여름 불에 녹으니 壬水의 냉각과 己土의 보호가 동시에 필요합니다' },
    巳: { element: '水', reason: '庚金이 초여름 화기에 노출되면 水로 식혀야 합니다' },
  },
  壬: {
    午: { element: '金', reason: '壬水가 한여름에 태어나면 金의 생조(生助)로 수원을 확보해야 합니다' },
  },
}

function calcJohu(sajuData: SajuData): JohuYongsin {
  const monthZhi = sajuData.pillars.month.zhi
  const dayMaster = sajuData.dayMaster

  // 특수 조후 먼저 체크
  const special = SPECIAL_JOHU[dayMaster]?.[monthZhi]
  if (special) {
    const base = JOHU_MAP[monthZhi] || { season: '미상', urgency: 'moderate' as const }
    return {
      type: 'johu',
      element: special.element,
      season: base.season,
      monthZhi,
      urgency: 'critical',
      score: 85,
      reason: special.reason,
    }
  }

  const base = JOHU_MAP[monthZhi]
  if (!base) {
    return {
      type: 'johu',
      element: '火',
      season: '미상',
      monthZhi,
      urgency: 'low',
      score: 20,
      reason: '월지 정보 부족으로 기본 조후를 적용합니다.',
    }
  }

  const scoreMap = { critical: 80, moderate: 50, low: 20 }
  const reason =
    base.urgency === 'critical'
      ? `${base.season} 출생 — 한난(寒暖)이 극단적이므로 ${ELEMENT_KR[base.element]}(${base.element})로 온도 조절이 급선무입니다.`
      : base.urgency === 'moderate'
        ? `${base.season} 출생 — ${ELEMENT_KR[base.element]}(${base.element})로 조습(調濕) 보정이 필요합니다.`
        : `${base.season} 출생 — 한난이 극단적이지 않아 조후 필요도가 낮습니다.`

  return {
    type: 'johu',
    element: base.element,
    season: base.season,
    monthZhi,
    urgency: base.urgency,
    score: scoreMap[base.urgency],
    reason,
  }
}

// ===================== 3. 통관용신 =====================

/** 통관 맵: A극B일 때 중재 오행 */
const TONGGWAN_MAP: Record<string, Record<string, string>> = {
  木: { 土: '火' }, // 木극土 → 火가 통관 (木生火, 火生土)
  火: { 金: '土' }, // 火극金 → 土가 통관
  土: { 水: '金' }, // 土극水 → 金이 통관
  金: { 木: '水' }, // 金극木 → 水가 통관
  水: { 火: '木' }, // 水극火 → 木이 통관
}

function calcTonggwan(sajuData: SajuData): TonggwanYongsin {
  const dist = sajuData.elementsDistribution

  // 3개 이상인 오행 쌍 중 상극 관계 찾기
  let maxConflict = 0
  let bestPair: [string, string] = ['', '']
  let bestMediator = ''

  for (const attacker of ALL_ELEMENTS) {
    const target = GEUK[attacker]!
    const aCnt = dist[attacker] || 0
    const tCnt = dist[target] || 0

    if (aCnt >= 3 && tCnt >= 3) {
      const conflict = aCnt + tCnt
      if (conflict > maxConflict) {
        maxConflict = conflict
        bestPair = [attacker, target]
        bestMediator = TONGGWAN_MAP[attacker]?.[target] || ''
      }
    }
  }

  if (!bestMediator || maxConflict === 0) {
    return {
      type: 'tonggwan',
      element: '',
      conflictPair: ['', ''],
      isActive: false,
      score: 0,
      reason: '사주 내 교전(극) 상태가 발견되지 않아 통관용신이 필요하지 않습니다.',
    }
  }

  return {
    type: 'tonggwan',
    element: bestMediator,
    conflictPair: bestPair,
    isActive: true,
    score: 60 + Math.min(20, (maxConflict - 6) * 5),
    reason: `${ELEMENT_KR[bestPair[0]]}(${dist[bestPair[0]]}개)과 ${ELEMENT_KR[bestPair[1]]}(${dist[bestPair[1]]}개)이 교전 중 — ${ELEMENT_KR[bestMediator]}이 중재하여 기운을 소통시킵니다.`,
  }
}

// ===================== 융합(Fusion) =====================

function fusionPriority(
  eokbu: EokbuYongsin,
  johu: JohuYongsin,
  tonggwan: TonggwanYongsin,
  dayElement: string
): { priority: 'eokbu' | 'johu' | 'tonggwan'; reason: string } {
  // 1) 조후 긴급 시 최우선
  if (johu.urgency === 'critical' && johu.score >= 70) {
    if (johu.element === eokbu.element) {
      return { priority: 'johu', reason: `조후와 억부가 동일한 ${ELEMENT_KR[johu.element]}을 지목 — 최상의 합치` }
    }
    return {
      priority: 'johu',
      reason: `한난조습이 극단적이므로 조후(${ELEMENT_KR[johu.element]})가 억부보다 우선합니다`,
    }
  }

  // 2) 통관 교전이 일간을 직격
  if (tonggwan.isActive) {
    const [a, b] = tonggwan.conflictPair
    if (a === dayElement || b === dayElement) {
      return {
        priority: 'tonggwan',
        reason: `교전이 일간(${ELEMENT_KR[dayElement]})을 직격하므로 통관(${ELEMENT_KR[tonggwan.element]})이 급선무`,
      }
    }
  }

  // 3) 기본: 억부
  return { priority: 'eokbu', reason: `일반적 상황에서 억부(${ELEMENT_KR[eokbu.element]})가 기본 용신입니다` }
}

// ===================== 메인 함수 =====================

export function analyzeTripleYongsin(sajuData: SajuData, sipseong: SipseongMap): TripleYongsinResult {
  const dayElement = GAN_ELEMENT[sajuData.dayMaster] || '木'

  const eokbu = calcEokbu(sajuData, sipseong)
  const johu = calcJohu(sajuData)
  const tonggwan = calcTonggwan(sajuData)

  const { priority, reason: fusionReason } = fusionPriority(eokbu, johu, tonggwan, dayElement)

  // 최종 용신 결정
  let finalYongsin: string
  if (priority === 'johu') finalYongsin = johu.element
  else if (priority === 'tonggwan') finalYongsin = tonggwan.element
  else finalYongsin = eokbu.element

  const finalHuisin = SAENG_BY[finalYongsin] || '水'
  const finalGisin = GEUK_BY[finalYongsin] || '金'
  const finalGusin = SAENG_BY[finalGisin] || '土'

  // 레거시 호환
  const legacy: YongsinAnalysis = {
    yongsin: finalYongsin,
    yongsinKorean: ELEMENT_KR[finalYongsin] || '목',
    huisin: finalHuisin,
    huisinKorean: ELEMENT_KR[finalHuisin] || '수',
    gisin: finalGisin,
    gisinKorean: ELEMENT_KR[finalGisin] || '금',
    yongsinReason: fusionReason,
    recommendation: `${ELEMENT_KR[finalYongsin]} 기운을 활용하고, ${ELEMENT_KR[finalGisin]}을 피하십시오. 희신 ${ELEMENT_KR[finalHuisin]}과 함께 활용하면 효과가 극대화됩니다.`,
  }

  return {
    eokbu,
    johu,
    tonggwan,
    finalYongsin,
    finalHuisin,
    finalGisin,
    finalGusin,
    priority,
    fusionReason,
    legacy,
  }
}

/**
 * 삼중 용신 분석 결과를 AI 프롬프트 텍스트로 변환
 */
export function buildTripleYongsinText(result: TripleYongsinResult): string {
  const lines: string[] = [
    '### 용신(用神) — 삼중 분석',
    `[억부용신] ${ELEMENT_KR[result.eokbu.element]}(${result.eokbu.element}) — ${result.eokbu.reason}`,
    `[조후용신] ${ELEMENT_KR[result.johu.element]}(${result.johu.element}) — ${result.johu.reason}`,
  ]

  if (result.tonggwan.isActive) {
    lines.push(
      `[통관용신] ${ELEMENT_KR[result.tonggwan.element]}(${result.tonggwan.element}) — ${result.tonggwan.reason}`
    )
  } else {
    lines.push('[통관용신] 해당 없음 — 교전 미발생')
  }

  lines.push(
    `→ 최종 용신: ${ELEMENT_KR[result.finalYongsin]}(${result.finalYongsin}) — ${result.fusionReason}`,
    `  희신: ${ELEMENT_KR[result.finalHuisin]} | 기신: ${ELEMENT_KR[result.finalGisin]} | 구신: ${ELEMENT_KR[result.finalGusin]}`
  )

  return lines.join('\n')
}
