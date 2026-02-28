/**
 * 해화지기 통합 위험점수 (URS: Unified Risk Score)
 * 사주 경고(warnings) + 동적 경고(dynamic) + 룰베이스(rule-base) → Late Fusion
 */

import type { WarningsResult } from './warnings'
import type { DynamicWarningsResult } from './dynamic-warnings'
import type { RuleBaseResult, RuleMatchResult } from './rule-base'

// ===================== 타입 =====================

export type URSLevel = 'safe' | 'caution' | 'warning' | 'danger' | 'critical'

export interface URSCategory {
  name: string
  score: number // 0-100
  level: URSLevel
  sources: string[] // 근거 요약
}

export interface UnifiedRiskResult {
  totalScore: number // 0-100
  level: URSLevel
  label: string
  categories: URSCategory[]
  topRisks: string[] // 최우선 경고 3개
  actionItems: string[] // 통합 행동 지침
  fusionBreakdown: {
    staticWeight: number
    dynamicWeight: number
    ruleWeight: number
    staticScore: number
    dynamicScore: number
    ruleScore: number
  }
}

// ===================== 상수 =====================

const LEVEL_LABELS: Record<URSLevel, string> = {
  safe: '안전',
  caution: '주의',
  warning: '경계',
  danger: '위험',
  critical: '긴급',
}

const WEIGHTS = {
  static: 0.35, // 사주 원국 경고 (고정)
  dynamic: 0.4, // 동적 시간축 경고 (대운/세운/일운)
  rule: 0.25, // 룰베이스 고전 판정
}

function scoreToLevel(score: number): URSLevel {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'danger'
  if (score >= 40) return 'warning'
  if (score >= 20) return 'caution'
  return 'safe'
}

// ===================== 카테고리별 분석 =====================

function analyzeStaticCategories(warnings: WarningsResult): URSCategory[] {
  const cats: URSCategory[] = []

  // 기구신
  if (warnings.gigusin) {
    const s = 60 // 기구신 존재 시 기본 위험도
    cats.push({
      name: '기구신',
      score: s,
      level: scoreToLevel(s),
      sources: [`기신: ${warnings.gigusin.gisinElement}`, `구신: ${warnings.gigusin.gusinElement}`],
    })
  }

  // 공망
  if (warnings.gongmang.affectedPillars.length > 0) {
    const s = warnings.gongmang.affectedPillars.length * 25
    cats.push({
      name: '공망',
      score: Math.min(80, s),
      level: scoreToLevel(Math.min(80, s)),
      sources: warnings.gongmang.affectedPillars.map((p) => `${p}주 공망`),
    })
  }

  // 삼재
  if (warnings.samjae.isActive) {
    const s = warnings.samjae.phase === '들삼재' ? 55 : warnings.samjae.phase === '눌삼재' ? 70 : 45
    cats.push({
      name: '삼재',
      score: s,
      level: scoreToLevel(s),
      sources: [`${warnings.samjae.phase} (${warnings.samjae.samjaeYears.join(', ')}년)`],
    })
  }

  // 원진살
  if (warnings.wonjinsal.found) {
    cats.push({
      name: '원진살',
      score: 45,
      level: 'warning',
      sources: warnings.wonjinsal.pairs.map((p) => p),
    })
  }

  // 백호살
  if (warnings.baekhosal.found) {
    cats.push({
      name: '백호살',
      score: 55,
      level: 'warning',
      sources: [`일주 ${warnings.baekhosal.dayPillar} 백호대살`],
    })
  }

  return cats
}

function analyzeDynamicCategories(dynamic: DynamicWarningsResult): URSCategory[] {
  const cats: URSCategory[] = []

  for (const activation of dynamic.temporalActivations) {
    cats.push({
      name: `${activation.warningType}(${activation.temporalSource})`,
      score: activation.riskBonus * 4,
      level: scoreToLevel(activation.riskBonus * 4),
      sources: [activation.description],
    })
  }

  return cats
}

function analyzeRuleCategories(ruleBase: RuleBaseResult): URSCategory[] {
  const cats: URSCategory[] = []
  const negativeCategories = ['이혼수', '재물파탄', '관재구설', '건강위험', '타향살이']

  for (const [category, matches] of Object.entries(ruleBase.categories)) {
    if (!matches || matches.length === 0) continue
    if (!negativeCategories.includes(category)) continue

    const maxConfidence = Math.max(...matches.map((m: RuleMatchResult) => m.confidence))
    const s = Math.round(maxConfidence * 80)
    cats.push({
      name: `[첩경] ${category}`,
      score: s,
      level: scoreToLevel(s),
      sources: matches.map((m: RuleMatchResult) => m.rule.name),
    })
  }

  return cats
}

// ===================== 메인 함수 =====================

export function calculateUnifiedRisk(
  warnings: WarningsResult,
  dynamicWarnings: DynamicWarningsResult | null,
  ruleBase: RuleBaseResult
): UnifiedRiskResult {
  // 1. 개별 점수
  const staticScore = warnings.riskScore
  const dynamicScore = dynamicWarnings?.dynamicRiskScore ?? warnings.riskScore
  const ruleScore =
    ruleBase.strongMatches.length > 0
      ? Math.min(100, ruleBase.strongMatches.length * 20 + 30)
      : ruleBase.matches.length > 0
        ? Math.min(60, ruleBase.matches.length * 10)
        : 0

  // 2. Late Fusion
  const totalScore = Math.round(
    staticScore * WEIGHTS.static + dynamicScore * WEIGHTS.dynamic + ruleScore * WEIGHTS.rule
  )
  const level = scoreToLevel(totalScore)

  // 3. 카테고리 통합
  const allCats: URSCategory[] = [
    ...analyzeStaticCategories(warnings),
    ...(dynamicWarnings ? analyzeDynamicCategories(dynamicWarnings) : []),
    ...analyzeRuleCategories(ruleBase),
  ]
  allCats.sort((a, b) => b.score - a.score)

  // 4. Top 3 risks
  const topRisks = allCats
    .filter((c) => c.score >= 30)
    .slice(0, 3)
    .map((c) => `${c.name}: ${c.sources[0] || ''} (${c.score}점)`)

  // 5. 통합 행동 지침
  const actionItems: string[] = []
  if (warnings.urgentActions) actionItems.push(...warnings.urgentActions.slice(0, 2))
  if (dynamicWarnings?.dynamicUrgentActions) actionItems.push(...dynamicWarnings.dynamicUrgentActions.slice(0, 2))
  // 룰베이스 강력 매치 조언
  for (const m of ruleBase.strongMatches.slice(0, 2)) {
    actionItems.push(`[${m.rule.category}] ${m.rule.conclusion.summary}`)
  }

  return {
    totalScore,
    level,
    label: LEVEL_LABELS[level],
    categories: allCats,
    topRisks,
    actionItems: actionItems.slice(0, 5),
    fusionBreakdown: {
      staticWeight: WEIGHTS.static,
      dynamicWeight: WEIGHTS.dynamic,
      ruleWeight: WEIGHTS.rule,
      staticScore,
      dynamicScore,
      ruleScore,
    },
  }
}
