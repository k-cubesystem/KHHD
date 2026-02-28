/**
 * 해화지기 사주 엔진 - 동적 경고 시스템
 * 원국(고정) 경고 + 대운/세운/월운/일운 교차 연산
 * "시계열 리스크 — 오늘/이번달/올해 실시간 위험도"
 */

import { Solar } from 'lunar-javascript'
import type { SajuData } from '@/lib/domain/saju/saju'
import type { SipseongMap } from './sipseong'
import {
  analyzeWarnings,
  type WarningsResult,
  type GigusinWarning,
  type GongmangResult,
  type SamjaeResult,
} from './warnings'
import type { YongsinAnalysis } from '@/lib/domain/saju/saju-analysis'
import { WONJIN_PAIRS } from './sinsal-extended'

// ===================== 타입 정의 =====================

export interface FlowingPillar {
  gan: string
  zhi: string
}

export interface FlowingLuckPillars {
  daewoon: FlowingPillar | null
  saewoon: FlowingPillar
  worwoon: FlowingPillar
  ilwoon: FlowingPillar
}

export interface TemporalActivation {
  warningType: 'gongmang' | 'samjae' | 'wonjinsal' | 'gigusin' | 'baekhosal'
  temporalSource: 'daewoon' | 'saewoon' | 'worwoon' | 'ilwoon'
  severity: 'low' | 'medium' | 'high'
  riskBonus: number
  title: string
  description: string
  actionAdvice: string
}

export interface DynamicWarningsResult extends WarningsResult {
  flowingPillars: FlowingLuckPillars
  temporalActivations: TemporalActivation[]
  dynamicRiskScore: number
  dynamicRiskLevel: 'low' | 'medium' | 'high' | 'critical'
  dynamicRiskLabel: string
  dynamicUrgentActions: string[]
}

// ===================== 상수 =====================

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

const _ZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const ZHI_KOR: Record<string, string> = {
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

/** 충(沖) 쌍 */
const CHUNG_PAIRS: Record<string, string> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
}

/** 삼재 매핑 */
const SAMJAE_MAP: Record<string, [string, string, string]> = {
  申: ['寅', '卯', '辰'],
  子: ['寅', '卯', '辰'],
  辰: ['寅', '卯', '辰'],
  亥: ['巳', '午', '未'],
  卯: ['巳', '午', '未'],
  未: ['巳', '午', '未'],
  寅: ['申', '酉', '戌'],
  午: ['申', '酉', '戌'],
  戌: ['申', '酉', '戌'],
  巳: ['亥', '子', '丑'],
  酉: ['亥', '子', '丑'],
  丑: ['亥', '子', '丑'],
}

const SOURCE_KR: Record<string, string> = {
  daewoon: '대운',
  saewoon: '세운(올해)',
  worwoon: '월운(이달)',
  ilwoon: '일운(오늘)',
}

// ===================== 일운 계산 =====================

/**
 * 특정 날짜의 일주(日柱) 계산
 */
export function calculateIlwoon(date?: Date): FlowingPillar {
  const d = date || new Date()
  const solar = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, d.getDate(), 12, 0, 0)
  const lunar = solar.getLunar()
  const ec = lunar.getEightChar() as unknown as { getDayGan(): string; getDayZhi(): string }
  return { gan: ec.getDayGan(), zhi: ec.getDayZhi() }
}

/**
 * 특정 연월의 세운·월운 계산
 */
function calcSaewoon(year: number): FlowingPillar {
  const solar = Solar.fromYmdHms(year, 6, 15, 12, 0, 0)
  const ec = solar.getLunar().getEightChar() as unknown as { getYearGan(): string; getYearZhi(): string }
  return { gan: ec.getYearGan(), zhi: ec.getYearZhi() }
}

function calcWorwoon(year: number, month: number): FlowingPillar {
  const solar = Solar.fromYmdHms(year, month, 15, 12, 0, 0)
  const ec = solar.getLunar().getEightChar() as unknown as { getMonthGan(): string; getMonthZhi(): string }
  return { gan: ec.getMonthGan(), zhi: ec.getMonthZhi() }
}

/**
 * 현재 시점의 유동 기둥 조합
 */
export function getFlowingLuckPillars(date?: Date): FlowingLuckPillars {
  const d = date || new Date()
  const year = d.getFullYear()
  const month = d.getMonth() + 1

  return {
    daewoon: null, // 대운은 개인 사주에 따라 다르므로 외부에서 주입
    saewoon: calcSaewoon(year),
    worwoon: calcWorwoon(year, month),
    ilwoon: calculateIlwoon(d),
  }
}

// ===================== 교차 검사 함수들 =====================

function checkGongmangCross(gongmang: GongmangResult, pillars: FlowingLuckPillars): TemporalActivation[] {
  const activations: TemporalActivation[] = []
  const gmZhis = [gongmang.zhi1, gongmang.zhi2]

  const checks: Array<{
    source: 'ilwoon' | 'worwoon' | 'saewoon'
    pillar: FlowingPillar | null
    bonus: number
    sev: 'high' | 'medium'
  }> = [
    { source: 'ilwoon', pillar: pillars.ilwoon, bonus: 15, sev: 'high' },
    { source: 'worwoon', pillar: pillars.worwoon, bonus: 10, sev: 'medium' },
    { source: 'saewoon', pillar: pillars.saewoon, bonus: 8, sev: 'medium' },
  ]

  for (const { source, pillar, bonus, sev } of checks) {
    if (pillar && gmZhis.includes(pillar.zhi)) {
      activations.push({
        warningType: 'gongmang',
        temporalSource: source,
        severity: sev,
        riskBonus: bonus,
        title: `${SOURCE_KR[source]} 공망 발동`,
        description: `${SOURCE_KR[source]}의 지지 ${ZHI_KOR[pillar.zhi]}이 공망(${gongmang.zhi1Kor}·${gongmang.zhi2Kor})과 일치합니다.`,
        actionAdvice:
          source === 'ilwoon'
            ? '오늘은 중요한 계약·투자·결혼 등 주요 결정을 전면 보류하십시오.'
            : `이${source === 'worwoon' ? '달' : '해'} 동안 큰 결정은 신중하게 접근하십시오.`,
      })
    }
  }

  return activations
}

function checkSamjaeCross(samjae: SamjaeResult, pillars: FlowingLuckPillars, yearZhi: string): TemporalActivation[] {
  if (!samjae.isActive) return []
  const activations: TemporalActivation[] = []
  const triggers = SAMJAE_MAP[yearZhi]
  if (!triggers) return activations

  // 월운 지지가 삼재 트리거 지지와 일치하면 중첩
  if (pillars.worwoon && triggers.includes(pillars.worwoon.zhi)) {
    activations.push({
      warningType: 'samjae',
      temporalSource: 'worwoon',
      severity: 'medium',
      riskBonus: 8,
      title: '삼재 월 중첩',
      description: `이달 월운(${ZHI_KOR[pillars.worwoon.zhi]})이 삼재 구간과 겹칩니다. ${samjae.phase} 효과가 강화됩니다.`,
      actionAdvice: '이달은 특히 금전 거래, 건강 관리에 각별히 주의하십시오.',
    })
  }

  // 일운 지지가 삼재 트리거 지지와 일치
  if (pillars.ilwoon && triggers.includes(pillars.ilwoon.zhi)) {
    activations.push({
      warningType: 'samjae',
      temporalSource: 'ilwoon',
      severity: 'low',
      riskBonus: 5,
      title: '삼재 일 중첩',
      description: `오늘 일운(${ZHI_KOR[pillars.ilwoon.zhi]})이 삼재 기운과 공명합니다.`,
      actionAdvice: '오늘은 무리한 일정을 피하고 안정적으로 지내십시오.',
    })
  }

  return activations
}

function checkWonjinsalCross(natalZhis: string[], pillars: FlowingLuckPillars): TemporalActivation[] {
  const activations: TemporalActivation[] = []

  const checks: Array<{ source: 'saewoon' | 'worwoon'; pillar: FlowingPillar | null; bonus: number }> = [
    { source: 'saewoon', pillar: pillars.saewoon, bonus: 10 },
    { source: 'worwoon', pillar: pillars.worwoon, bonus: 8 },
  ]

  for (const { source, pillar, bonus } of checks) {
    if (!pillar) continue
    for (const natalZhi of natalZhis) {
      const isPair = WONJIN_PAIRS.some(
        (pair: string[]) =>
          (pair[0] === natalZhi && pair[1] === pillar.zhi) || (pair[1] === natalZhi && pair[0] === pillar.zhi)
      )
      if (isPair) {
        activations.push({
          warningType: 'wonjinsal',
          temporalSource: source,
          severity: 'medium',
          riskBonus: bonus,
          title: `${SOURCE_KR[source]} 원진살 발동`,
          description: `${SOURCE_KR[source]}(${ZHI_KOR[pillar.zhi]})이 원국 ${ZHI_KOR[natalZhi]}과 원진 관계입니다.`,
          actionAdvice: '대인관계에서 감정 충돌이 발생할 수 있으니 중요 만남은 자제하십시오.',
        })
        break // 한 source당 하나만
      }
    }
  }

  return activations
}

function checkGigusinCross(gigusin: GigusinWarning | null, pillars: FlowingLuckPillars): TemporalActivation[] {
  if (!gigusin) return []
  const activations: TemporalActivation[] = []
  const gisinEl = gigusin.gisinElement
  const gusinEl = gigusin.gusinElement

  const checks: Array<{
    source: 'daewoon' | 'saewoon'
    pillar: FlowingPillar | null
    bonus: number
    sev: 'high' | 'medium'
  }> = [
    { source: 'daewoon', pillar: pillars.daewoon, bonus: 12, sev: 'high' },
    { source: 'saewoon', pillar: pillars.saewoon, bonus: 10, sev: 'medium' },
  ]

  for (const { source, pillar, bonus, sev } of checks) {
    if (!pillar) continue
    const pillarEl = GAN_ELEMENT[pillar.gan]
    if (pillarEl === gisinEl) {
      activations.push({
        warningType: 'gigusin',
        temporalSource: source,
        severity: sev,
        riskBonus: bonus,
        title: `${SOURCE_KR[source]} 기신 중첩`,
        description: `${SOURCE_KR[source]} 천간(${pillar.gan})이 기신 오행(${gigusin.gisinKorean})과 일치합니다. 기저 위험도가 상승합니다.`,
        actionAdvice: `${gigusin.avoidColors.join('·')} 색상과 ${gigusin.avoidDirections.join('·')} 방향을 철저히 피하십시오.`,
      })
    } else if (pillarEl === gusinEl) {
      activations.push({
        warningType: 'gigusin',
        temporalSource: source,
        severity: 'medium',
        riskBonus: bonus - 4,
        title: `${SOURCE_KR[source]} 구신 중첩`,
        description: `${SOURCE_KR[source]} 천간(${pillar.gan})이 구신 오행(${gigusin.gusinKorean})과 일치합니다.`,
        actionAdvice: '기구신 회피 색상과 방향을 평소보다 더 의식하십시오.',
      })
    }
  }

  return activations
}

function checkBaekhoSalCross(baekhoFound: boolean, dayZhi: string, pillars: FlowingLuckPillars): TemporalActivation[] {
  if (!baekhoFound) return []
  const activations: TemporalActivation[] = []

  // 일운 지지가 원국 일지와 충이면 사고 위험 증폭
  if (pillars.ilwoon && CHUNG_PAIRS[dayZhi] === pillars.ilwoon.zhi) {
    activations.push({
      warningType: 'baekhosal',
      temporalSource: 'ilwoon',
      severity: 'high',
      riskBonus: 12,
      title: '백호대살 + 일충 위험',
      description: `오늘 일운(${ZHI_KOR[pillars.ilwoon.zhi]})이 원국 일지(${ZHI_KOR[dayZhi]})와 충(沖)을 이룹니다. 백호대살과 겹쳐 사고·충돌 위험이 극대화됩니다.`,
      actionAdvice: '오늘은 위험한 활동, 장거리 운전, 격렬한 운동을 절대 삼가십시오.',
    })
  }

  return activations
}

// ===================== 메인 함수 =====================

/**
 * 동적 경고 분석: 원국 경고 + 유동 운(대운/세운/월운/일운) 교차 연산
 */
export function analyzeDynamicWarnings(
  sajuData: SajuData,
  yongsin: YongsinAnalysis | null,
  sipseong: SipseongMap,
  flowingPillars?: FlowingLuckPillars
): DynamicWarningsResult {
  // 1) 정적 원국 경고 먼저
  const staticWarnings = analyzeWarnings(sajuData, yongsin, sipseong)

  // 2) 유동 기둥 (없으면 현재 시점 자동 계산)
  const pillars = flowingPillars || getFlowingLuckPillars()

  // 3) 교차 검사
  const allActivations: TemporalActivation[] = []

  // 공망 x 유동 기둥
  allActivations.push(...checkGongmangCross(staticWarnings.gongmang, pillars))

  // 삼재 x 월운/일운
  allActivations.push(...checkSamjaeCross(staticWarnings.samjae, pillars, sajuData.pillars.year.zhi))

  // 원진살 x 세운/월운
  const natalZhis = [
    sajuData.pillars.year.zhi,
    sajuData.pillars.month.zhi,
    sajuData.pillars.day.zhi,
    sajuData.pillars.time.zhi,
  ]
  allActivations.push(...checkWonjinsalCross(natalZhis, pillars))

  // 기구신 x 대운/세운
  allActivations.push(...checkGigusinCross(staticWarnings.gigusin, pillars))

  // 백호대살 x 일운 충
  allActivations.push(...checkBaekhoSalCross(staticWarnings.baekhosal.found, sajuData.pillars.day.zhi, pillars))

  // 4) 동적 점수 계산
  const bonusSum = allActivations.reduce((sum, a) => sum + a.riskBonus, 0)
  const compoundBonus = allActivations.length >= 6 ? 15 : allActivations.length >= 4 ? 10 : 0
  const highAndBase = allActivations.some((a) => a.severity === 'high') && staticWarnings.riskScore >= 50 ? 5 : 0

  const dynamicRiskScore = Math.min(100, staticWarnings.riskScore + bonusSum + compoundBonus + highAndBase)

  const dynamicRiskLevel: 'low' | 'medium' | 'high' | 'critical' =
    dynamicRiskScore < 25 ? 'low' : dynamicRiskScore < 50 ? 'medium' : dynamicRiskScore < 75 ? 'high' : 'critical'

  const riskLabels: Record<string, string> = { low: '안정', medium: '주의', high: '경계', critical: '위기' }

  // 5) 긴급 행동 지침 (상위 severity 우선)
  const sortedActivations = [...allActivations].sort((a, b) => {
    const sevOrder = { high: 0, medium: 1, low: 2 }
    return sevOrder[a.severity] - sevOrder[b.severity]
  })

  const dynamicUrgentActions = [
    ...staticWarnings.urgentActions,
    ...sortedActivations.slice(0, 3).map((a) => a.actionAdvice),
  ].slice(0, 5)

  return {
    ...staticWarnings,
    flowingPillars: pillars,
    temporalActivations: allActivations,
    dynamicRiskScore,
    dynamicRiskLevel,
    dynamicRiskLabel: riskLabels[dynamicRiskLevel],
    dynamicUrgentActions,
  }
}
