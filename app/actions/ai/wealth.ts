'use server'

import { createClient } from '@/lib/supabase/server'
import { deductTalisman } from '../payment/wallet'
import { saveAnalysisHistory } from '../user/history'
// recordFortuneEntry는 saveAnalysisHistory 내부에서 자동 호출됨
import { logger } from '@/lib/utils/logger'
import { generateAIContent } from '@/lib/services/ai-client'
import { buildMasterPromptForAction } from '@/lib/saju-engine/master-prompt-builder'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'

interface WealthAnalysisParams {
  memberId: string
}

export interface WealthAnalysisData {
  currentSituation: string
  strengths: string[]
  risks: string[]
  shortTerm: string
  midTerm: string
  longTerm: string
  actionItems: string[]
}

interface WealthAnalysisResult {
  success: boolean
  analysis?: WealthAnalysisData
  error?: string
}

/**
 * 재물운 심층 분석
 * 사주 기반으로 재물운의 흐름, 시기, 방향을 AI가 분석
 */
export async function analyzeWealth(params: WealthAnalysisParams): Promise<WealthAnalysisResult> {
  if (isEdgeEnabled('ai-analysis')) {
    return invokeEdgeSafe('ai-analysis', { action: 'analyzeWealth', ...params })
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // 1. 부적 차감 (재물운 분석 비용: 5 부적)
    const WEALTH_ANALYSIS_COST = 5
    const deductResult = await deductTalisman('wealth_analysis', WEALTH_ANALYSIS_COST)

    if (!deductResult.success) {
      return {
        success: false,
        error: '부적이 부족합니다. 멤버십 페이지에서 충전해주세요.',
      }
    }

    // 2. 가족 구성원 정보 조회
    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .select('*')
      .eq('id', params.memberId)
      .single()

    if (memberError || !member) {
      return { success: false, error: '대상 정보를 찾을 수 없습니다.' }
    }

    // 5. 해화지기 마스터 엔진으로 프롬프트 조립 (재물 심층 - 구조화 JSON)
    const { prompt } = await buildMasterPromptForAction(
      {
        name: member.name,
        birthDate: member.birth_date,
        birthTime: member.birth_time || '00:00',
        gender: (member.gender || 'male') as 'male' | 'female',
        isSolar: member.calendar_type === 'solar',
      },
      'WEALTH_DEEP',
      '',
      '',
      `[지시사항]
- 재성(正財, 정재 = 안정적 수입)과 偏財(편재 = 투자/횡재)의 흐름을 분석하십시오.
- 사주 용어를 사용할 때는 반드시 괄호 안에 쉬운 설명을 추가하십시오.
- 강점과 리스크를 균형있게 다루십시오.
- 구체적인 행동 조언을 포함하십시오.
- 숫자 점수는 사용하지 마십시오.

[출력 형식 (JSON Mandatory)]
{
  "currentSituation": "현재 재물 상태 분석 (대운과 세운 기준, 2~3문장)",
  "strengths": ["재물 관련 강점 1", "강점 2", "강점 3"],
  "risks": ["주의해야 할 재물 리스크 1", "리스크 2", "리스크 3"],
  "shortTerm": "단기 1-3개월 재물 조언 (구체적 행동 포함)",
  "midTerm": "중기 6개월-1년 재물 조언 (구체적 전략 포함)",
  "longTerm": "장기 1년 이상 재물 전략 (방향성 제시)",
  "actionItems": ["지금 바로 할 수 있는 행동 1", "행동 2", "행동 3"]
}`
    )

    // 6. AI 호출
    const result = await generateAIContent({
      featureKey: 'wealth',
      systemPrompt: '당신은 사주 기반 재물운 전문가입니다. 반드시 유효한 JSON만 출력하십시오.',
      userPrompt: prompt,
    })
    const analysis: WealthAnalysisData = JSON.parse(result.text)

    // 7. 분석 기록 저장 (recordFortuneEntry는 saveAnalysisHistory 내부에서 자동 호출됨)
    try {
      await saveAnalysisHistory({
        target_id: params.memberId,
        target_name: member.name,
        target_relation: member.relationship || '본인',
        category: 'WEALTH',
        result_json: analysis,
        summary: '재물운 심층 분석 결과',
        model_used: MODEL_FLASH,
        talisman_cost: WEALTH_ANALYSIS_COST,
      })
    } catch (e) {
      logger.error('[WealthAnalysis] Failed to save history:', e)
    }

    return {
      success: true,
      analysis,
    }
  } catch (error) {
    logger.error('[WealthAnalysis] Error:', error)
    const message = error instanceof Error ? error.message : '재물운 분석 중 오류가 발생했습니다.'
    return {
      success: false,
      error: message,
    }
  }
}
