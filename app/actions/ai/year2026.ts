'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { calculateManse, calculateDaewoon } from '@/lib/domain/saju/manse'
import { calculateAge } from '@/lib/domain/saju/saju'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { saveAnalysisHistory } from '../user/history'
import { recordFortuneEntry, getSelfFamilyMemberId } from '../fortune/fortune'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { buildMasterPromptForAction } from '@/lib/saju-engine/master-prompt-builder'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'

export interface Year2026Result {
  name: string
  summary: string
  bingoh_meaning: string
  quarterly: {
    q1: string
    q2: string
    q3: string
    q4: string
  }
  areas: {
    wealth: { outlook: '좋음' | '보통' | '주의'; content: string }
    love: { outlook: '좋음' | '보통' | '주의'; content: string }
    career: { outlook: '좋음' | '보통' | '주의'; content: string }
    health: { outlook: '좋음' | '보통' | '주의'; content: string }
  }
  peak_month: string
  caution_month: string
  lucky: {
    color: string
    direction: string
    number: number
  }
  message: string
}

export async function analyzeYear2026Action(targetId: string): Promise<{
  success: boolean
  data?: Year2026Result
  error?: string
  cached?: boolean
}> {
  if (isEdgeEnabled('ai-analysis')) {
    return invokeEdgeSafe('ai-analysis', { action: 'analyzeYear2026', targetId })
  }
  try {
    // 1. 인증 확인
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    // 2. 대상 정보 조회
    const target = await getDestinyTarget(targetId)
    if (!target) {
      return { success: false, error: '대상 정보를 찾을 수 없습니다.' }
    }
    if (!target.birth_date) {
      return {
        success: false,
        error: '생년월일 정보가 없습니다. 운세 분석을 위해 생년월일을 먼저 입력해주세요.',
      }
    }

    // 3. 30일 캐시 확인
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: cached } = await supabase
      .from('analysis_history')
      .select('result_json, created_at')
      .eq('user_id', user.id)
      .eq('target_id', targetId)
      .eq('category', 'NEW_YEAR')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (cached?.result_json) {
      return {
        success: true,
        data: cached.result_json as Year2026Result,
        cached: true,
      }
    }

    // 4. 사주 계산
    const birthDate = target.birth_date
    const birthTime = target.birth_time || '12:00'
    const gender = target.gender || 'male'

    const manse = calculateManse(birthDate, birthTime)
    const age = calculateAge(birthDate)
    const daewoon = calculateDaewoon(birthDate, birthTime, gender, age)

    // 5. Gemini 호출
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return { success: false, error: 'AI 서비스 설정 오류입니다.' }
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    })

    // 해화지기 마스터 엔진으로 프롬프트 조립
    const { prompt } = await buildMasterPromptForAction(
      {
        name: target.name,
        birthDate,
        birthTime: target.birth_time || '12:00',
        gender: (gender || 'male') as 'male' | 'female',
        isSolar: target.calendar_type !== 'lunar',
      },
      'YEARLY_FORTUNE',
      '',
      '2026년 병오년(丙午年) - 붉은 말의 해. 火氣가 왕성한 해로 추진력과 변화의 기운이 강합니다.',
      `[지시사항]
- 숫자 점수는 사용하지 마십시오. 대신 outlook 필드에 "좋음", "보통", "주의" 중 하나를 사용하십시오.
- 사주 용어를 사용할 때는 괄호 안에 쉬운 설명을 추가하십시오.
- 분기별 운세는 구체적으로 작성하십시오: 무엇을 하면 좋은지, 무엇을 피해야 하는지 명시하십시오.
- 강점과 약점을 균형있게 다루십시오.

[출력 형식 (JSON Mandatory)]
{"name":"${target.name}","summary":"한 줄 요약 (명확한 현대 한국어)","bingoh_meaning":"병오년이 이 사주에 미치는 영향 설명","quarterly":{"q1":"1분기: 하면 좋은 것 + 피해야 할 것을 구체적으로","q2":"2분기: 구체적 행동 지침 포함","q3":"3분기: 구체적 행동 지침 포함","q4":"4분기: 구체적 행동 지침 포함"},"areas":{"wealth":{"outlook":"좋음|보통|주의","content":"재물운 분석 + 구체적 조언"},"love":{"outlook":"좋음|보통|주의","content":"애정운 분석 + 구체적 조언"},"career":{"outlook":"좋음|보통|주의","content":"직업운 분석 + 구체적 조언"},"health":{"outlook":"좋음|보통|주의","content":"건강운 분석 + 구체적 조언"}},"peak_month":"최고의 달","caution_month":"주의할 달","lucky":{"color":"행운색","direction":"길한 방향","number":6},"message":"현실적이고 격려가 되는 한마디"}`
    )

    const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
      userId: user.id,
      model: MODEL_FLASH,
      actionType: 'year2026',
    })
    const text = result.response.text()
    const data = JSON.parse(text) as Year2026Result

    // 7. 기록 저장
    const saved = await saveAnalysisHistory({
      target_id: targetId,
      target_name: target.name,
      target_relation: target.relation_type,
      category: 'NEW_YEAR',
      context_mode: 'GENERAL',
      result_json: data,
      summary: data.summary || `2026년 병오년 신년운세`,
      model_used: MODEL_FLASH,
      talisman_cost: 0,
    }).catch((e) => {
      logger.error('History Save Error:', e)
      return { success: false }
    })

    // 8. 운세 기록 (본인/가족 모두 미션 체크)
    const fortuneMemberId =
      target.target_type === 'family' ? target.id : await getSelfFamilyMemberId().catch(() => null)
    if (fortuneMemberId) {
      await recordFortuneEntry(fortuneMemberId, 'NEW_YEAR', (saved as { id?: string })?.id ?? fortuneMemberId).catch(
        () => {}
      )
    }

    return { success: true, data }
  } catch (error) {
    logger.error('[Year2026Action] Error:', error)
    const message = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}
