'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { deductTalisman } from './wallet-actions'
import { saveAnalysisHistory } from './analysis-history'
import { PROMPTS, injectContext } from '@/lib/prompts/storytelling'
import { FEATURE_KEYS } from '@/lib/constants'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'

const getGeminiModel = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('Google Generative AI API Key is missing')
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })
}

async function getUserProfileAndContext(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return { user: null, profileContext: '게스트 사용자입니다. 일반적인 관점에서 조언해주세요.' }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) return { user, profileContext: '프로필 정보가 없습니다.' }

  const context = `
    - 이름: ${profile.full_name}
    - 직업: ${profile.job || '미입력'}
    - 취미/관심사: ${profile.hobbies || '미입력'}
    - 결혼 여부: ${profile.marital_status || '미입력'}
    - 인생 고민: ${profile.life_philosophy || '미입력'}
    `
  return { user, profileContext: context, profile }
}

// Helper generic analysis function
async function runAnalysis(
  analysisType: string,
  promptKey: keyof typeof PROMPTS,
  variables: Record<string, string>,
  costKey: string,
  saveCategory: string,
  historySummaryMapper: (data: any) => string
) {
  try {
    const model = getGeminiModel()
    const supabase = await createClient()
    const { user, profileContext, profile } = await getUserProfileAndContext(supabase)

    // Deduct Cost (Only if user exists)
    if (user) {
      const deduct = await deductTalisman(costKey as any)
      if (!deduct.success) return deduct
    }

    // Prepare Prompt
    const prompt = injectContext(PROMPTS[promptKey], {
      ...variables,
      USER_CONTEXT: profileContext,
    })

    console.log(`[Analysis Engine] Running ${analysisType}...`)

    // Generate
    const result = await withGeminiRateLimit(() => model.generateContent(prompt))
    const text = result.response.text()
    const data = JSON.parse(text)

    // Save History
    if (user) {
      await saveAnalysisHistory({
        target_id: user.id,
        target_name: profile?.full_name || '본인',
        target_relation: '본인',
        category: saveCategory as any,
        context_mode: analysisType as any,
        result_json: data,
        summary: historySummaryMapper(data),
        score: data.score || data.fortune_score || data.compatibility_score || 80,
        model_used: 'gemini-2.0-flash',
        talisman_cost: 0,
      }).catch((e) => console.error('History Save Error:', e))
    }

    return { success: true, data }
  } catch (error) {
    console.error(`[Analysis Engine] Error in ${analysisType}:`, error)
    const message = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}

// 1. Chonjiin (Masterpiece) Analysis
export async function analyzeChonjiin(
  sajuInfo: string,
  metaInfo: string = '정보 없음',
  concern: string = '전반적인 운세'
) {
  return runAnalysis(
    'CHONJIIN_MASTER',
    'CHONJIIN',
    { SAJU_INFO: sajuInfo, META_INFO: metaInfo, CURRENT_CONCERN: concern },
    FEATURE_KEYS.SAJU_PREMIUM,
    'SAJU',
    (data) => data.summary || '천지인 통합 분석 결과'
  )
}

// 2. Relationship Analysis
export async function analyzeRelationship(
  myInfo: string,
  partnerInfo: string,
  relationType: string
) {
  return runAnalysis(
    'RELATIONSHIP',
    'RELATIONSHIP',
    { MY_INFO: myInfo, PARTNER_INFO: partnerInfo, RELATION_TYPE: relationType },
    FEATURE_KEYS.COMPATIBILITY,
    'COMPATIBILITY',
    (data) => `${relationType} 관계 분석: ${data.score}점`
  )
}

// 3. Period Luck (Weekly/Monthly)
export async function analyzePeriodLuck(
  sajuInfo: string,
  periodType: '이번 주' | '이번 달',
  targetDate: string
) {
  // Fixed: calling runAnalysis with string first argument
  const analysisTypeStr = periodType === '이번 주' ? 'PERIOD_WEEKLY' : 'PERIOD_MONTHLY'
  return runAnalysis(
    analysisTypeStr,
    'PERIOD',
    { SAJU_INFO: sajuInfo, PERIOD_TYPE: periodType, TARGET_DATE: targetDate },
    FEATURE_KEYS.SAJU_BASIC,
    'SAJU',
    (data) => `${periodType} 운세: ${data.fortune_score || 85}점`
  )
}

// 4. 2026 Special Analysis
export async function analyzeYear2026(sajuInfo: string) {
  return runAnalysis(
    'YEAR_2026_SPECIAL',
    'YEAR_2026',
    { SAJU_INFO: sajuInfo },
    FEATURE_KEYS.SAJU_PREMIUM,
    'SAJU',
    (data) => `2026년 병오년 운세`
  )
}
