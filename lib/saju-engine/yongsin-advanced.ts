/**
 * 해화지기 사주 엔진 - 5단계 용신 정밀 판정
 * 1. 격국용신: 종격/전왕격이면 격국에서 직접 도출
 * 2. 조후용신: 궁통보감 기반 10천간 x 12월지 = 120 패턴
 * 3. 억부용신: 신강→설기, 신약→생부
 * 4. 통관용신: 교전 오행 사이 중재
 * 5. 병약용신: 삼합 국세의 병을 치료
 *
 * COMMERCIALIZATION: Observability(구조화 에러) + Cost Efficiency(정적 테이블, 런타임 비용 0)
 */

import type { SajuData } from '@/lib/domain/saju/saju'
import type { SipseongMap } from './sipseong'

// ===================== 타입 정의 =====================

export interface YongsinResult {
  finalYongsin: string      // 최종 용신 오행 (예: '木')
  priority: string          // 어떤 용신이 적용됐는지 (예: '조후용신')
  johuYongsin: JohuDetail | null
  eokbuYongsin: EokbuDetail
  tonggwanYongsin: TonggwanDetail | null
  byeongyakYongsin: ByeongyakDetail | null
  huisin: string            // 희신 오행
  gisin: string             // 기신 오행
  gusin: string             // 구신 오행
  hansin: string            // 한신 오행
  recommendation: string    // 개운법 (색상, 방위, 음식)
  detailReason: string      // AI에 전달할 상세 판정 근거
}

export interface JohuDetail {
  element: string
  urgency: 'critical' | 'moderate' | 'low'
  source: string // 궁통보감 출처 근거
  ganCandidates: string[] // 조후 천간 후보 (우선순위)
}

export interface EokbuDetail {
  element: string
  direction: '설기' | '생부' | '중화보충'
  reason: string
}

export interface TonggwanDetail {
  element: string
  conflictPair: [string, string]
  reason: string
}

export interface ByeongyakDetail {
  element: string
  disease: string // 병의 정체
  cure: string    // 약의 역할
  reason: string
}

// ===================== 오행 기본 상수 =====================

const GAN_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

const ZHI_ELEMENT: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土',
  巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金',
  戌: '土', 亥: '水',
}

const SAENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const GEUK: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }
const SAENG_BY: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }
const GEUK_BY: Record<string, string> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }
const ELEMENT_KR: Record<string, string> = { 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' }
const ALL_ELEMENTS = ['木', '火', '土', '金', '水'] as const

// ===================== 오행별 색상/방위/음식 =====================

const ELEMENT_COLOR: Record<string, string> = {
  木: '초록색·청색', 火: '빨간색·주황색', 土: '노란색·갈색', 金: '흰색·금색·은색', 水: '검정색·남색',
}
const ELEMENT_DIRECTION: Record<string, string> = {
  木: '동쪽', 火: '남쪽', 土: '중앙', 金: '서쪽', 水: '북쪽',
}
const ELEMENT_FOOD: Record<string, string> = {
  木: '푸른 잎채소·신맛(식초, 매실)', 火: '쓴맛 식품(커피, 다크초콜릿)',
  土: '단맛·곡류(현미, 고구마)', 金: '매운맛·흰색 식품(무, 배, 도라지)',
  水: '짠맛·해산물(미역, 다시마, 조개)',
}

// ===================== 궁통보감 조후용신 120 패턴 테이블 =====================
// 일간(天干) x 월지(地支) → 조후 천간 후보 (우선순위 배열)

const GUNGTONG_TABLE: Record<string, Record<string, string[]>> = {
  甲: {
    子: ['丙', '庚', '丁'], 丑: ['丙', '庚', '丁'], 寅: ['丙', '癸'],
    卯: ['丙', '癸', '庚'], 辰: ['壬', '庚'], 巳: ['癸', '丁', '庚'],
    午: ['癸', '丁', '庚'], 未: ['癸', '丁', '庚'], 申: ['丁', '甲', '丙'],
    酉: ['丁', '甲', '丙'], 戌: ['甲', '壬', '丁'], 亥: ['庚', '丁', '丙'],
  },
  乙: {
    子: ['丙'], 丑: ['丙'], 寅: ['丙', '癸'],
    卯: ['丙', '癸'], 辰: ['癸', '丙'], 巳: ['癸', '丙'],
    午: ['癸', '丙'], 未: ['癸', '丙'], 申: ['丙', '癸'],
    酉: ['丙', '癸'], 戌: ['丙', '癸'], 亥: ['丙'],
  },
  丙: {
    子: ['壬', '甲'], 丑: ['壬', '甲'], 寅: ['壬', '庚'],
    卯: ['壬', '庚'], 辰: ['壬', '甲'], 巳: ['壬', '庚'],
    午: ['壬', '庚'], 未: ['壬', '庚'], 申: ['壬', '甲'],
    酉: ['壬', '甲'], 戌: ['甲', '壬'], 亥: ['甲', '壬'],
  },
  丁: {
    子: ['甲', '庚'], 丑: ['甲', '庚'], 寅: ['甲', '庚'],
    卯: ['甲', '庚'], 辰: ['甲', '庚'], 巳: ['甲', '庚'],
    午: ['甲', '壬'], 未: ['甲', '壬'], 申: ['甲', '庚'],
    酉: ['甲', '庚'], 戌: ['甲', '庚'], 亥: ['甲', '庚'],
  },
  戊: {
    子: ['丙', '甲'], 丑: ['丙', '甲'], 寅: ['丙', '甲', '癸'],
    卯: ['丙', '甲', '癸'], 辰: ['甲', '癸', '丙'], 巳: ['甲', '癸'],
    午: ['壬', '甲', '癸'], 未: ['癸', '丙', '甲'], 申: ['丙', '癸'],
    酉: ['丙', '癸'], 戌: ['甲', '癸', '丙'], 亥: ['甲', '丙'],
  },
  己: {
    子: ['丙', '甲'], 丑: ['丙', '甲'], 寅: ['甲', '丙', '癸'],
    卯: ['甲', '丙', '癸'], 辰: ['甲', '癸', '丙'], 巳: ['癸', '丙'],
    午: ['癸', '丙'], 未: ['癸', '丙'], 申: ['丙', '癸'],
    酉: ['丙', '癸'], 戌: ['甲', '癸', '丙'], 亥: ['甲', '丙', '壬'],
  },
  庚: {
    子: ['丁', '甲'], 丑: ['丁', '甲', '丙'], 寅: ['丁', '甲', '丙'],
    卯: ['丁', '甲'], 辰: ['甲', '丁', '壬'], 巳: ['壬', '丁', '甲'],
    午: ['壬', '癸'], 未: ['壬', '丁'], 申: ['丁', '甲'],
    酉: ['壬', '甲', '丁'], 戌: ['甲', '壬', '丁'], 亥: ['丁', '甲', '丙'],
  },
  辛: {
    子: ['壬', '丙'], 丑: ['壬', '丙', '戊'], 寅: ['壬', '甲', '丙'],
    卯: ['壬', '甲'], 辰: ['壬', '甲'], 巳: ['壬', '甲', '癸'],
    午: ['壬', '癸', '庚'], 未: ['壬', '庚', '癸'], 申: ['壬', '甲'],
    酉: ['壬', '甲'], 戌: ['壬', '甲'], 亥: ['壬', '丙'],
  },
  壬: {
    子: ['戊', '丙'], 丑: ['丙', '甲'], 寅: ['戊', '丙', '庚'],
    卯: ['戊', '辛'], 辰: ['甲', '庚'], 巳: ['壬', '辛', '庚'],
    午: ['壬', '庚', '辛'], 未: ['辛', '甲'], 申: ['戊', '丁'],
    酉: ['甲', '戊'], 戌: ['甲', '丙'], 亥: ['戊', '丙', '庚'],
  },
  癸: {
    子: ['丙', '辛'], 丑: ['丙', '辛', '甲'], 寅: ['辛', '壬'],
    卯: ['庚', '辛'], 辰: ['丙', '辛', '甲'], 巳: ['辛', '甲'],
    午: ['庚', '辛', '壬'], 未: ['庚', '辛', '壬'], 申: ['丁', '丙'],
    酉: ['辛', '丙'], 戌: ['辛', '甲', '丙'], 亥: ['丙', '辛', '戊'],
  },
}

// ===================== 월지 계절·조후 긴급도 매핑 =====================

interface SeasonInfo {
  season: string
  urgency: 'critical' | 'moderate' | 'low'
  description: string
}

const MONTH_SEASON: Record<string, SeasonInfo> = {
  子: { season: '한겨울(仲冬)', urgency: 'critical', description: '극한의 추위, 조후(暖)가 절대적' },
  丑: { season: '늦겨울(季冬)', urgency: 'critical', description: '얼어붙은 땅, 해동의 불이 급선무' },
  寅: { season: '초봄(孟春)', urgency: 'low', description: '봄기운이 시작, 조후 필요도 낮음' },
  卯: { season: '한봄(仲春)', urgency: 'low', description: '목기 왕성, 조후보다 억부 우선' },
  辰: { season: '늦봄(季春)', urgency: 'moderate', description: '습한 토기, 조습(調濕)이 필요' },
  巳: { season: '초여름(孟夏)', urgency: 'moderate', description: '화기 상승, 수기 보충 필요' },
  午: { season: '한여름(仲夏)', urgency: 'critical', description: '극양의 정점, 수기가 절대적' },
  未: { season: '늦여름(季夏)', urgency: 'critical', description: '토왕사절기, 습열이 극심' },
  申: { season: '초가을(孟秋)', urgency: 'low', description: '금기 시작, 한난 안정' },
  酉: { season: '한가을(仲秋)', urgency: 'low', description: '금기 정점, 조후 필요도 낮음' },
  戌: { season: '늦가을(季秋)', urgency: 'moderate', description: '조토(燥土), 수기 보충 필요' },
  亥: { season: '초겨울(孟冬)', urgency: 'critical', description: '수기 시작, 한기가 강해짐' },
}

// ===================== 삼합국 판별 (병약용신용) =====================

interface SamhapGuk {
  name: string
  zhis: [string, string, string]
  element: string
}

const SAMHAP_GUKS: SamhapGuk[] = [
  { name: '수국(水局)', zhis: ['申', '子', '辰'], element: '水' },
  { name: '목국(木局)', zhis: ['亥', '卯', '未'], element: '木' },
  { name: '화국(火局)', zhis: ['寅', '午', '戌'], element: '火' },
  { name: '금국(金局)', zhis: ['巳', '酉', '丑'], element: '金' },
]

// ===================== 방합국 판별 (병약용신용) =====================

interface BanghapGuk {
  name: string
  zhis: [string, string, string]
  element: string
}

const BANGHAP_GUKS: BanghapGuk[] = [
  { name: '동방목국', zhis: ['寅', '卯', '辰'], element: '木' },
  { name: '남방화국', zhis: ['巳', '午', '未'], element: '火' },
  { name: '서방금국', zhis: ['申', '酉', '戌'], element: '金' },
  { name: '북방수국', zhis: ['亥', '子', '丑'], element: '水' },
]

// ===================== 종격 판별 =====================

interface GekgukJudgment {
  isSpecial: boolean
  type: '종왕격' | '종강격' | '종아격' | '종재격' | '종살격' | '전왕격' | '일반격'
  followElement: string | null // 종격이 따라가는 오행
  reason: string
}

function judgeSpecialGekguk(sajuData: SajuData, sipseong: SipseongMap): GekgukJudgment {
  const dayEl = GAN_ELEMENT[sajuData.dayMaster] || '木'
  const dist = sajuData.elementsDistribution
  const { bodyStrengthScore, distribution } = sipseong

  const allZhis = [
    sajuData.pillars.year.zhi,
    sajuData.pillars.month.zhi,
    sajuData.pillars.day.zhi,
    sajuData.pillars.time.zhi,
  ]

  // 비겁+인성 합계
  const myForce =
    (distribution['비견'] || 0) + (distribution['겁재'] || 0) +
    (distribution['편인'] || 0) + (distribution['정인'] || 0)
  // 식상 합계
  const sikForce = (distribution['식신'] || 0) + (distribution['상관'] || 0)
  // 재성 합계
  const jaeForce = (distribution['편재'] || 0) + (distribution['정재'] || 0)
  // 관성 합계
  const gwanForce = (distribution['편관'] || 0) + (distribution['정관'] || 0)

  // 극강 신강 (bodyStrengthScore >= 80) → 종왕격 후보
  if (bodyStrengthScore >= 80 && myForce >= 5) {
    return {
      isSpecial: true,
      type: '종왕격',
      followElement: dayEl,
      reason: `비겁·인성이 ${myForce}개로 압도적 — 일간 ${dayEl} 세력을 거스를 수 없어 종왕격 성립`,
    }
  }

  // 종강격: 인성이 극단적으로 강한 경우
  const inForce = (distribution['편인'] || 0) + (distribution['정인'] || 0)
  if (bodyStrengthScore >= 75 && inForce >= 4) {
    return {
      isSpecial: true,
      type: '종강격',
      followElement: SAENG_BY[dayEl],
      reason: `인성이 ${inForce}개로 압도적 — 일간을 생하는 ${ELEMENT_KR[SAENG_BY[dayEl]]}의 세력이 사주를 지배`,
    }
  }

  // 극약 신약 (bodyStrengthScore <= 15) → 종아/종재/종살격 후보
  if (bodyStrengthScore <= 15) {
    if (sikForce >= 3) {
      return {
        isSpecial: true,
        type: '종아격',
        followElement: SAENG[dayEl],
        reason: `식상이 ${sikForce}개로 압도 + 신약 극심 — 일간이 식상(${ELEMENT_KR[SAENG[dayEl]]})을 따르는 종아격`,
      }
    }
    if (jaeForce >= 3) {
      return {
        isSpecial: true,
        type: '종재격',
        followElement: GEUK[dayEl],
        reason: `재성이 ${jaeForce}개로 압도 + 신약 극심 — 일간이 재성(${ELEMENT_KR[GEUK[dayEl]]})을 따르는 종재격`,
      }
    }
    if (gwanForce >= 3) {
      return {
        isSpecial: true,
        type: '종살격',
        followElement: GEUK_BY[dayEl],
        reason: `관성이 ${gwanForce}개로 압도 + 신약 극심 — 일간이 관살(${ELEMENT_KR[GEUK_BY[dayEl]]})을 따르는 종살격`,
      }
    }
  }

  // 전왕격: 한 오행이 6개 이상
  for (const el of ALL_ELEMENTS) {
    if ((dist[el] || 0) >= 6) {
      return {
        isSpecial: true,
        type: '전왕격',
        followElement: el,
        reason: `${ELEMENT_KR[el]}(${el})이 ${dist[el]}개로 사주를 완전 지배 — 전왕격 성립`,
      }
    }
  }

  return { isSpecial: false, type: '일반격', followElement: null, reason: '특수격국 아님' }
}

// ===================== 1단계: 격국용신 =====================

function calcGekgukYongsin(
  sajuData: SajuData,
  sipseong: SipseongMap
): { element: string; reason: string } | null {
  const judgment = judgeSpecialGekguk(sajuData, sipseong)
  if (!judgment.isSpecial || !judgment.followElement) return null

  // 종격에서는 격국이 따라가는 오행을 그대로 용신으로 사용
  return {
    element: judgment.followElement,
    reason: `[격국용신] ${judgment.type} — ${judgment.reason}. 용신: ${ELEMENT_KR[judgment.followElement]}(${judgment.followElement})`,
  }
}

// ===================== 2단계: 조후용신 (궁통보감 120 패턴) =====================

function calcJohuYongsinAdvanced(sajuData: SajuData): JohuDetail | null {
  const dayMaster = sajuData.dayMaster
  const monthZhi = sajuData.pillars.month.zhi

  const candidates = GUNGTONG_TABLE[dayMaster]?.[monthZhi]
  if (!candidates || candidates.length === 0) return null

  const seasonInfo = MONTH_SEASON[monthZhi]
  if (!seasonInfo) return null

  // 첫 번째 후보의 오행이 조후용신
  const primaryGan = candidates[0]
  const element = GAN_ELEMENT[primaryGan] || '火'

  return {
    element,
    urgency: seasonInfo.urgency,
    source: `궁통보감: ${dayMaster}일간 ${monthZhi}월(${seasonInfo.season}) — 1순위 ${primaryGan}, 2순위 ${candidates[1] || '없음'}`,
    ganCandidates: candidates,
  }
}

// ===================== 3단계: 억부용신 =====================

function calcEokbuYongsinAdvanced(sajuData: SajuData, sipseong: SipseongMap): EokbuDetail {
  const dayEl = GAN_ELEMENT[sajuData.dayMaster] || '木'
  const { strengthAssessment, bodyStrengthScore } = sipseong
  const dist = sajuData.elementsDistribution

  if (strengthAssessment === '중화') {
    // 가장 부족한 오행 보충
    const sorted = ALL_ELEMENTS.map((el) => ({ el, cnt: dist[el] || 0 })).sort((a, b) => a.cnt - b.cnt)
    return {
      element: sorted[0].el,
      direction: '중화보충',
      reason: `중화 사주(${bodyStrengthScore}%) — ${ELEMENT_KR[sorted[0].el]}(${sorted[0].el}) 기운이 가장 부족(${sorted[0].cnt}개)하여 보충`,
    }
  }

  if (strengthAssessment === '신강') {
    // 신강: 설기(식상) 우선 → 극기(관성) 보조
    const sikEl = SAENG[dayEl]
    const gwanEl = GEUK_BY[dayEl]
    const sikCnt = dist[sikEl] || 0

    if (sikCnt < 2) {
      return {
        element: sikEl,
        direction: '설기',
        reason: `신강 사주(${bodyStrengthScore}%) — ${ELEMENT_KR[sikEl]}(식상)으로 과잉 에너지를 설기하여 균형을 회복`,
      }
    }
    return {
      element: gwanEl,
      direction: '설기',
      reason: `신강 사주(${bodyStrengthScore}%) — 식상이 이미 ${sikCnt}개 있어 ${ELEMENT_KR[gwanEl]}(관성)으로 직접 제어`,
    }
  }

  // 신약: 생부(인성) 우선 → 비겁 보조
  const inEl = SAENG_BY[dayEl]
  const inCnt = dist[inEl] || 0

  if (inCnt < 2) {
    return {
      element: inEl,
      direction: '생부',
      reason: `신약 사주(${bodyStrengthScore}%) — ${ELEMENT_KR[inEl]}(인성)으로 일간의 힘을 생부(生扶)`,
    }
  }
  return {
    element: dayEl,
    direction: '생부',
    reason: `신약 사주(${bodyStrengthScore}%) — 인성이 이미 ${inCnt}개 있어 ${ELEMENT_KR[dayEl]}(비겁)으로 직접 보강`,
  }
}

// ===================== 4단계: 통관용신 =====================

const TONGGWAN_MAP: Record<string, Record<string, string>> = {
  木: { 土: '火' }, 火: { 金: '土' }, 土: { 水: '金' }, 金: { 木: '水' }, 水: { 火: '木' },
}

function calcTonggwanYongsinAdvanced(sajuData: SajuData): TonggwanDetail | null {
  const dist = sajuData.elementsDistribution
  let maxConflict = 0
  let bestPair: [string, string] = ['', '']
  let bestMediator = ''

  for (const attacker of ALL_ELEMENTS) {
    const target = GEUK[attacker]
    const aCnt = dist[attacker] || 0
    const tCnt = dist[target] || 0

    // 교전 조건: 양쪽 모두 3개 이상 (또는 합계 6 이상)
    if (aCnt >= 2 && tCnt >= 2 && aCnt + tCnt >= 6) {
      const conflict = aCnt + tCnt
      if (conflict > maxConflict) {
        maxConflict = conflict
        bestPair = [attacker, target]
        bestMediator = TONGGWAN_MAP[attacker]?.[target] || ''
      }
    }
  }

  if (!bestMediator || maxConflict === 0) return null

  return {
    element: bestMediator,
    conflictPair: bestPair,
    reason: `${ELEMENT_KR[bestPair[0]]}(${dist[bestPair[0]]}개)과 ${ELEMENT_KR[bestPair[1]]}(${dist[bestPair[1]]}개)이 교전 — ${ELEMENT_KR[bestMediator]}(${bestMediator})이 양측을 소통시켜 흐름을 회복`,
  }
}

// ===================== 5단계: 병약용신 =====================

function calcByeongyakYongsin(sajuData: SajuData): ByeongyakDetail | null {
  const dist = sajuData.elementsDistribution
  const allZhis = [
    sajuData.pillars.year.zhi,
    sajuData.pillars.month.zhi,
    sajuData.pillars.day.zhi,
    sajuData.pillars.time.zhi,
  ]

  // 삼합국 체크
  for (const guk of SAMHAP_GUKS) {
    const matchCount = guk.zhis.filter((z) => allZhis.includes(z)).length
    if (matchCount >= 2) {
      const gukEl = guk.element
      const gukCnt = dist[gukEl] || 0

      // 삼합국 오행이 4개 이상이면 "병"으로 판단
      if (gukCnt >= 4) {
        const cure = GEUK_BY[gukEl] // 병을 극하는 오행이 약
        return {
          element: cure,
          disease: `${guk.name} 삼합으로 ${ELEMENT_KR[gukEl]}(${gukEl})이 ${gukCnt}개로 범람`,
          cure: `${ELEMENT_KR[cure]}(${cure})가 과잉 ${ELEMENT_KR[gukEl]}을 제어하는 약(藥)의 역할`,
          reason: `[병약용신] ${guk.name} 성립 — ${ELEMENT_KR[gukEl]} ${gukCnt}개 과잉은 병(病), ${ELEMENT_KR[cure]}가 약(藥)`,
        }
      }
    }
  }

  // 방합국 체크
  for (const guk of BANGHAP_GUKS) {
    const matchCount = guk.zhis.filter((z) => allZhis.includes(z)).length
    if (matchCount >= 2) {
      const gukEl = guk.element
      const gukCnt = dist[gukEl] || 0

      if (gukCnt >= 4) {
        const cure = GEUK_BY[gukEl]
        return {
          element: cure,
          disease: `${guk.name} 방합으로 ${ELEMENT_KR[gukEl]}(${gukEl})이 ${gukCnt}개로 범람`,
          cure: `${ELEMENT_KR[cure]}(${cure})가 과잉 ${ELEMENT_KR[gukEl]}을 제어`,
          reason: `[병약용신] ${guk.name} 성립 — ${ELEMENT_KR[gukEl]} ${gukCnt}개 과잉은 병, ${ELEMENT_KR[cure]}가 약`,
        }
      }
    }
  }

  // 단일 오행 5개 이상 (합국 없이도 병)
  for (const el of ALL_ELEMENTS) {
    if ((dist[el] || 0) >= 5) {
      const cure = GEUK_BY[el]
      return {
        element: cure,
        disease: `${ELEMENT_KR[el]}(${el})이 합국 없이 ${dist[el]}개로 독주`,
        cure: `${ELEMENT_KR[cure]}(${cure})로 과잉 기운을 억제`,
        reason: `[병약용신] ${ELEMENT_KR[el]} ${dist[el]}개 독주는 병, ${ELEMENT_KR[cure]}가 약`,
      }
    }
  }

  return null
}

// ===================== 5단계 융합 판정 =====================

function fusePriority(
  gekgukResult: { element: string; reason: string } | null,
  johu: JohuDetail | null,
  eokbu: EokbuDetail,
  tonggwan: TonggwanDetail | null,
  byeongyak: ByeongyakDetail | null,
  dayElement: string
): { finalElement: string; priority: string; detailReason: string } {
  const reasons: string[] = []

  // 1순위: 격국용신 (종격/전왕격)
  if (gekgukResult) {
    reasons.push(gekgukResult.reason)
    return {
      finalElement: gekgukResult.element,
      priority: '격국용신',
      detailReason: reasons.join('\n'),
    }
  }

  // 2순위: 조후용신 (한난이 극단적일 때)
  if (johu && johu.urgency === 'critical') {
    reasons.push(`[조후용신] ${johu.source} — 긴급도: ${johu.urgency}`)
    reasons.push(`[억부용신] ${eokbu.reason}`)

    // 조후와 억부가 일치하면 최상
    if (johu.element === eokbu.element) {
      reasons.push('=> 조후와 억부가 동일 오행을 지목 — 최상의 합치')
    }

    return {
      finalElement: johu.element,
      priority: '조후용신',
      detailReason: reasons.join('\n'),
    }
  }

  // 3순위: 병약용신 (삼합국세의 병)
  if (byeongyak) {
    reasons.push(byeongyak.reason)
    reasons.push(`[억부용신] ${eokbu.reason}`)
    return {
      finalElement: byeongyak.element,
      priority: '병약용신',
      detailReason: reasons.join('\n'),
    }
  }

  // 4순위: 통관용신 (교전이 일간을 직격)
  if (tonggwan) {
    const [a, b] = tonggwan.conflictPair
    if (a === dayElement || b === dayElement) {
      reasons.push(`[통관용신] ${tonggwan.reason}`)
      reasons.push(`[억부용신] ${eokbu.reason}`)
      return {
        finalElement: tonggwan.element,
        priority: '통관용신',
        detailReason: reasons.join('\n'),
      }
    }
  }

  // 5순위 (기본): 억부용신
  reasons.push(`[억부용신] ${eokbu.reason}`)
  if (johu) {
    reasons.push(`[참고: 조후용신] ${johu.source} (긴급도: ${johu.urgency})`)
  }
  if (tonggwan) {
    reasons.push(`[참고: 통관용신] ${tonggwan.reason}`)
  }

  return {
    finalElement: eokbu.element,
    priority: '억부용신',
    detailReason: reasons.join('\n'),
  }
}

// ===================== 개운법 생성 =====================

function buildRecommendation(finalEl: string, huisin: string, gisin: string): string {
  const parts: string[] = []

  parts.push(`[색상] ${ELEMENT_COLOR[finalEl] || ''} 계열을 주로 사용하고, 희신인 ${ELEMENT_COLOR[huisin] || ''}도 활용하세요.`)
  parts.push(`[방위] ${ELEMENT_DIRECTION[finalEl] || ''} 방향이 길방(吉方)입니다. 책상·침대를 이 방위에 배치하세요.`)
  parts.push(`[음식] ${ELEMENT_FOOD[finalEl] || ''}을 자주 섭취하세요.`)
  parts.push(`[피할 것] ${ELEMENT_COLOR[gisin] || ''} 계열과 ${ELEMENT_DIRECTION[gisin] || ''} 방위는 기신이므로 과도한 노출을 피하세요.`)

  return parts.join(' ')
}

// ===================== 메인 함수 =====================

/**
 * 5단계 용신 정밀 판정
 * 격국 → 조후 → 억부 → 통관 → 병약 순서로 평가하여 최종 용신 결정
 */
export function analyzeYongsinAdvanced(
  sajuData: SajuData,
  sipseong: SipseongMap
): YongsinResult {
  const dayElement = GAN_ELEMENT[sajuData.dayMaster] || '木'

  // 5단계 개별 분석
  const gekgukResult = calcGekgukYongsin(sajuData, sipseong)
  const johu = calcJohuYongsinAdvanced(sajuData)
  const eokbu = calcEokbuYongsinAdvanced(sajuData, sipseong)
  const tonggwan = calcTonggwanYongsinAdvanced(sajuData)
  const byeongyak = calcByeongyakYongsin(sajuData)

  // 융합 판정
  const { finalElement, priority, detailReason } = fusePriority(
    gekgukResult,
    johu,
    eokbu,
    tonggwan,
    byeongyak,
    dayElement
  )

  // 희신·기신·구신·한신 결정
  const huisin = SAENG_BY[finalElement] || '水'
  const gisin = GEUK_BY[finalElement] || '金'
  const gusin = SAENG_BY[gisin] || '土'
  const remaining = ALL_ELEMENTS.filter(
    (e) => e !== finalElement && e !== huisin && e !== gisin && e !== gusin
  )
  const hansin = remaining[0] || '土'

  const recommendation = buildRecommendation(finalElement, huisin, gisin)

  return {
    finalYongsin: finalElement,
    priority,
    johuYongsin: johu,
    eokbuYongsin: eokbu,
    tonggwanYongsin: tonggwan,
    byeongyakYongsin: byeongyak,
    huisin,
    gisin,
    gusin,
    hansin,
    recommendation,
    detailReason,
  }
}

/**
 * 5단계 용신 분석 결과를 AI 프롬프트 텍스트로 변환
 */
export function buildAdvancedYongsinText(result: YongsinResult): string {
  const lines: string[] = [
    '### 용신(用神) — 5단계 정밀 판정',
    `최종 용신: ${ELEMENT_KR[result.finalYongsin]}(${result.finalYongsin}) [${result.priority}]`,
  ]

  // 조후용신 상세
  if (result.johuYongsin) {
    const j = result.johuYongsin
    lines.push(`[조후용신] ${ELEMENT_KR[j.element]}(${j.element}) — ${j.source}`)
    lines.push(`  긴급도: ${j.urgency} | 천간 후보: ${j.ganCandidates.join(', ')}`)
  }

  // 억부용신 상세
  const e = result.eokbuYongsin
  lines.push(`[억부용신] ${ELEMENT_KR[e.element]}(${e.element}) — ${e.reason}`)

  // 통관용신 상세
  if (result.tonggwanYongsin) {
    const t = result.tonggwanYongsin
    lines.push(`[통관용신] ${ELEMENT_KR[t.element]}(${t.element}) — ${t.reason}`)
  }

  // 병약용신 상세
  if (result.byeongyakYongsin) {
    const b = result.byeongyakYongsin
    lines.push(`[병약용신] ${ELEMENT_KR[b.element]}(${b.element}) — 병: ${b.disease} / 약: ${b.cure}`)
  }

  // 오신 표시
  lines.push(
    `희신: ${ELEMENT_KR[result.huisin]} | 기신: ${ELEMENT_KR[result.gisin]} | 구신: ${ELEMENT_KR[result.gusin]} | 한신: ${ELEMENT_KR[result.hansin]}`
  )

  // 개운법
  lines.push(`개운법: ${result.recommendation}`)

  // 판정 근거
  lines.push('--- 판정 근거 ---')
  lines.push(result.detailReason)

  return lines.join('\n')
}

/**
 * 궁통보감 조후용신 테이블 조회 (외부에서 직접 사용 가능)
 */
export function lookupGungtongTable(dayMaster: string, monthZhi: string): string[] | null {
  return GUNGTONG_TABLE[dayMaster]?.[monthZhi] || null
}

/**
 * 특수격국 판별 (외부에서 직접 사용 가능)
 */
export function judgeSpecialGekgukExternal(
  sajuData: SajuData,
  sipseong: SipseongMap
): GekgukJudgment {
  return judgeSpecialGekguk(sajuData, sipseong)
}

// 타입 재export
export type { GekgukJudgment, SeasonInfo, SamhapGuk }
