'use server'

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { deductTalisman } from '../payment/wallet'
import { saveAnalysisHistory } from '../user/history'
import { recordFortuneEntry } from '@/app/actions/fortune/fortune'
import { logger } from '@/lib/utils/logger'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface WealthAnalysisParams {
  memberId: string
}

interface WealthAnalysisResult {
  success: boolean
  analysis?: string
  error?: string
}

/**
 * 재물운 심층 분석
 * 사주 기반으로 재물운의 흐름, 시기, 방향을 AI가 분석
 */
export async function analyzeWealth(params: WealthAnalysisParams): Promise<WealthAnalysisResult> {
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

    // 5. 해화지기 마스터 엔진으로 프롬프트 조립 (재물 심층 - 산문 출력)
    const { buildMasterPromptForAction } = await import('@/lib/saju-engine/master-prompt-builder')
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
      `재물의 길목을 짚어주듯 산문으로 서술하십시오.
재성(正財·偏財)과 식상의 흐름, 대운에서의 재물 변화,
단기·중기·장기 재물운과 최적 투자 방향을 포함하여 주십시오.`
    )

    // 6. Gemini AI 호출
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
      userId: user.id,
      model: 'gemini-2.0-flash',
      actionType: 'wealth',
    })
    const analysis = result.response.text()

    // 7. 분석 기록 저장 + 운세 미션 체크
    try {
      await saveAnalysisHistory({
        target_id: params.memberId,
        target_name: member.name,
        target_relation: member.relationship || '본인',
        category: 'WEALTH',
        result_json: { analysis },
        summary: '재물운 심층 분석 결과',
        model_used: 'gemini-2.0-flash',
        talisman_cost: WEALTH_ANALYSIS_COST,
      })
    } catch (e) {
      console.error('[WealthAnalysis] Failed to save history:', e)
    }
    await recordFortuneEntry(params.memberId, 'WEALTH', params.memberId).catch(() => {})

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
