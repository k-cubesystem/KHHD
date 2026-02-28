/**
 * 해화지기 사주 엔진 - 메인 Export
 * 전 세계 최고 수준의 AI 사주 분석 엔진
 */

export { analyzeRelations, CHEONGAN_HAP, JIJI_SAMHAP, JIJI_CHUNG } from './relations'
export type { RelationResult } from './relations'
export { analyzeSipseong, calculateSipseong, buildSipseongNarrative, GAN_MULSANG, SIPSEONG_MODERN } from './sipseong'
export type { SipseongMap } from './sipseong'
export { buildMulsangLandscape, describeMulsangInteraction, getElementInteraction, ZHI_MULSANG } from './mulssangron'
export { analyzeSibjiunseong, SIBJIUNSEONG_INFO } from './sibjiunseong'
export type { SibjiunseongResult } from './sibjiunseong'
export { calculateExtendedSinsal, SINSAL_MODERN } from './sinsal-extended'
export type { SinsalResult } from './sinsal-extended'
export { buildSajuContext, getAnalysisTypeGuide } from './context-builder'
export type { SajuContext, PersonInfo, AnalysisType } from './context-builder'
export { buildMasterPromptForAction, buildUserContextText } from './master-prompt-builder'
export { analyzeTripleYongsin, buildTripleYongsinText } from './yongsin'
export type { TripleYongsinResult, EokbuYongsin, JohuYongsin, TonggwanYongsin } from './yongsin'
export { analyzeWarnings } from './warnings'
export { evaluateAllRules, buildRuleContextText } from './rule-base'
export type { SajuRule, RuleMatchResult, RuleBaseResult } from './rule-base'
export { calculateUnifiedRisk } from './unified-risk'
export type { UnifiedRiskResult, URSLevel, URSCategory } from './unified-risk'
export { analyzeDynamicWarnings, calculateIlwoon, getFlowingLuckPillars } from './dynamic-warnings'
export { calculateDailyAvoidance } from './daily-avoidance'
export type { DailyAvoidanceResult, DailySeverity } from './daily-avoidance'
export type { DynamicWarningsResult, FlowingLuckPillars, FlowingPillar, TemporalActivation } from './dynamic-warnings'
export type {
  WarningsResult,
  GigusinWarning,
  GongmangResult,
  SamjaeResult,
  WonjinsalResult,
  BaekhoResult,
  DayMasterWeaknessResult,
  SipseongExcessResult,
} from './warnings'
