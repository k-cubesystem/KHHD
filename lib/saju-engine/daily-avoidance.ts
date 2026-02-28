/**
 * 해화지기 사주 엔진 - 일별 기구신 회피 가이드
 * 기구신(고정) + 오늘 일운 오행 상호작용 → 일별 severity 변동
 */

import type { GigusinWarning } from './warnings'
import { calculateIlwoon, type FlowingPillar } from './dynamic-warnings'

// ===================== 타입 정의 =====================

export type DailySeverity = 'safe' | 'caution' | 'warning' | 'danger'

export interface DailyAvoidanceResult {
  date: string
  dailyPillar: FlowingPillar & { ganElement: string; zhiElement: string }
  severity: DailySeverity
  severityScore: number // 0-100
  severityLabel: string
  avoidColors: string[]
  avoidColorHexes: string[]
  avoidDirections: string[]
  avoidNumbers: number[]
  avoidRelationships: string[]
  dailyAdvice: string[]
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

const SAENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const GEUK: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }
const _GEUK_BY: Record<string, string> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }

/** 일운 오행 vs 기신 오행 관계 → severity 결정 */
function getInteractionSeverity(
  dailyElement: string,
  gisinElement: string
): { severity: DailySeverity; score: number; reason: string } {
  // 같은 오행: 기신 에너지 강화 → danger
  if (dailyElement === gisinElement) {
    return { severity: 'danger', score: 85, reason: '오늘 일운이 기신 오행과 동일하여 부정적 기운이 극대화됩니다' }
  }
  // 일운이 기신을 생함: 기신에 에너지 공급 → warning
  if (SAENG[dailyElement] === gisinElement) {
    return { severity: 'warning', score: 65, reason: '오늘 일운이 기신을 생(生)하여 부정적 기운을 키우고 있습니다' }
  }
  // 기신이 일운을 극함: 기신이 힘을 과시 → warning
  if (GEUK[gisinElement] === dailyElement) {
    return { severity: 'warning', score: 55, reason: '기신이 오늘 일운을 극(剋)하여 위압감이 높습니다' }
  }
  // 일운이 기신을 극함: 기신을 제어 → safe
  if (GEUK[dailyElement] === gisinElement) {
    return { severity: 'safe', score: 15, reason: '오늘 일운이 기신을 제압하여 비교적 안전한 하루입니다' }
  }
  // 기신이 일운을 생함: 기신의 에너지가 흘러나감 → caution
  if (SAENG[gisinElement] === dailyElement) {
    return {
      severity: 'caution',
      score: 35,
      reason: '기신 에너지가 설기(泄氣)되어 약화되나 완전히 사라지지는 않습니다',
    }
  }
  // 그 외
  return { severity: 'caution', score: 40, reason: '기신과 일운이 간접적 관계에 있어 보통 수준의 주의가 필요합니다' }
}

const SEVERITY_LABELS: Record<DailySeverity, string> = {
  safe: '안전',
  caution: '주의',
  warning: '경계',
  danger: '위험',
}

// ===================== 메인 함수 =====================

/**
 * 오늘의 기구신 회피 가이드 계산
 */
export function calculateDailyAvoidance(gigusin: GigusinWarning, date?: Date): DailyAvoidanceResult {
  const d = date || new Date()
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const dailyPillarBase = calculateIlwoon(d)
  const dailyPillar = {
    ...dailyPillarBase,
    ganElement: GAN_ELEMENT[dailyPillarBase.gan] || '木',
    zhiElement: ZHI_ELEMENT[dailyPillarBase.zhi] || '水',
  }

  // 기신 오행과 일운 천간 오행의 상호작용으로 severity 결정
  const { score, reason } = getInteractionSeverity(dailyPillar.ganElement, gigusin.gisinElement)

  // 지지도 가중 (지지 오행이 기신과 같으면 +15, 구신과 같으면 +8)
  let adjustedScore = score
  if (dailyPillar.zhiElement === gigusin.gisinElement) adjustedScore = Math.min(100, adjustedScore + 15)
  else if (dailyPillar.zhiElement === gigusin.gusinElement) adjustedScore = Math.min(100, adjustedScore + 8)

  // 보정된 severity
  const finalSeverity: DailySeverity =
    adjustedScore >= 75 ? 'danger' : adjustedScore >= 50 ? 'warning' : adjustedScore >= 30 ? 'caution' : 'safe'

  // 일별 조언 생성
  const advice: string[] = [reason]
  if (finalSeverity === 'danger' || finalSeverity === 'warning') {
    advice.push(`${gigusin.avoidColors.join('·')} 색상의 옷은 오늘 피하십시오.`)
    advice.push(`${gigusin.avoidDirections.join('·')} 방향으로의 이동을 삼가십시오.`)
  }
  if (finalSeverity === 'danger') {
    advice.push('중요한 계약, 면접, 투자 결정은 내일로 미루십시오.')
  }
  if (finalSeverity === 'caution') {
    advice.push('평소보다 기구신 회피 색상과 방향을 의식하십시오.')
  }

  return {
    date: dateStr,
    dailyPillar,
    severity: finalSeverity,
    severityScore: adjustedScore,
    severityLabel: SEVERITY_LABELS[finalSeverity],
    avoidColors: gigusin.avoidColors,
    avoidColorHexes: gigusin.avoidColorHexes,
    avoidDirections: gigusin.avoidDirections,
    avoidNumbers: gigusin.avoidNumbers,
    avoidRelationships: gigusin.avoidRelationships,
    dailyAdvice: advice,
  }
}
