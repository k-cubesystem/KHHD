'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from './destiny-targets'
import { calculateManse, calculateDaewoon } from '@/lib/domain/saju/manse'
import { calculateAge } from '@/lib/domain/saju/saju'
import {
  formatManseDetails,
  formatSajuText,
  formatDaewoon,
  calculateElements,
} from '@/lib/utils/manse-formatter'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { saveAnalysisHistory } from './analysis-history'
import { recordFortuneEntry } from './fortune-actions'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { getPromptWithVariables } from '@/lib/utils/prompt-variables'

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
    const elements = calculateElements(manse)

    const sajuText = formatSajuText(manse)
    const manseDetails = formatManseDetails(manse)
    const daewoonText = formatDaewoon(daewoon)

    const elementsText = Object.entries(elements)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')

    const genderLabel = gender === 'male' ? '남성' : '여성'
    const birthTimeLabel = target.birth_time || '시간 미상'

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

    const variables = {
      name: target.name,
      gender: genderLabel,
      birthDate,
      birthTime: birthTimeLabel,
      age: age.toString(),
      saju: sajuText,
      manse: manseDetails,
      elements: elementsText,
      daewoon: daewoonText,
    }

    // DB 프롬프트 조회 → 없으면 하드코딩 fallback
    let prompt: string
    try {
      prompt = await getPromptWithVariables('year2026_analysis', variables)
    } catch {
      prompt = `당신은 대한민국 최고의 사주명리학 전문가입니다.
2026년 병오년(丙午年) - 붉은 말의 해 - 특별 운세를 분석해주세요.

이름: ${target.name}, 성별: ${genderLabel}, 생년월일: ${birthDate}, 나이: ${age}세
사주: ${sajuText}
오행: ${elementsText}
대운: ${daewoonText}

병오년은 火氣가 왕성한 해로 추진력과 변화의 기운이 강합니다.
분기별 흐름, 재물/애정/직업/건강 영역, 최고/주의 달, 행운 키워드, 응원 메시지를 포함하여 JSON으로 응답해주세요.

출력 형식:
{"name":"","summary":"","score":78,"bingoh_meaning":"","quarterly":{"q1":"","q2":"","q3":"","q4":""},"areas":{"wealth":{"score":80,"content":""},"love":{"score":75,"content":""},"career":{"score":85,"content":""},"health":{"score":70,"content":""}},"peak_month":"","caution_month":"","lucky":{"color":"","direction":"","number":6},"message":""}`
    }

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

    // 8. 운세 기록 (가족 구성원인 경우)
    if (target.target_type === 'family') {
      await recordFortuneEntry(target.id, 'NEW_YEAR', (saved as any)?.id ?? target.id).catch(
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
