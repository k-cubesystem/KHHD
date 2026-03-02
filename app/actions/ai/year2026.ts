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

export interface Year2026Result {
  name: string
  summary: string
  score: number
  bingoh_meaning: string
  quarterly: {
    q1: string
    q2: string
    q3: string
    q4: string
  }
  areas: {
    wealth: { score: number; content: string }
    love: { score: number; content: string }
    career: { score: number; content: string }
    health: { score: number; content: string }
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
      model: 'gemini-2.0-flash',
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
      `[출력 형식 (JSON Mandatory)]
{"name":"${target.name}","summary":"한 줄 요약","score":78,"bingoh_meaning":"병오년의 기운 설명","quarterly":{"q1":"1분기 운세","q2":"2분기 운세","q3":"3분기 운세","q4":"4분기 운세"},"areas":{"wealth":{"score":80,"content":"재물운"},"love":{"score":75,"content":"애정운"},"career":{"score":85,"content":"직업운"},"health":{"score":70,"content":"건강운"}},"peak_month":"최고의 달","caution_month":"주의 달","lucky":{"color":"행운색","direction":"길한 방향","number":6},"message":"응원 메시지"}`
    )

    const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
      userId: user.id,
      model: 'gemini-2.0-flash',
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
      score: data.score,
      model_used: 'gemini-2.0-flash',
      talisman_cost: 0,
    }).catch((e) => {
      console.error('History Save Error:', e)
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
    console.error('[Year2026Action] Error:', error)
    const message = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}
