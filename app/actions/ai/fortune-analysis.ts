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
import { getCachedAnalysis, isCacheValid } from '@/lib/utils/analysis-cache'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'

export type FortuneType = 'today' | 'weekly' | 'monthly'

export interface FortuneArea {
  name: string
  score: number
  content: string
}

export interface FortuneResult {
  type: FortuneType
  summary: string
  score: number
  overall: string
  areas: FortuneArea[]
  lucky: {
    color: string
    number: number
    direction: string
    advice: string
  }
  caution: string
  period: string
}

/**
 * 운세 분석 서버 액션 (오늘/주간/월간)
 */
export async function analyzeFortuneAction(
  targetId: string,
  fortuneType: FortuneType = 'today',
  forceRefresh: boolean = false // bypass cache when user explicitly wants a new analysis
): Promise<{ success: boolean; data?: FortuneResult; error?: string; cached?: boolean; cachedAt?: string }> {
  if (isEdgeEnabled('ai-analysis')) {
    return invokeEdgeSafe('ai-analysis', { action: 'analyzeFortune', targetId, fortuneType, forceRefresh })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' }
  }

  try {
    // 1. 대상 정보 조회 (본인 사주)
    const target = await getDestinyTarget(targetId)
    if (!target || !target.birth_date) {
      return { success: false, error: '생년월일 정보가 없습니다. 사주 정보를 먼저 입력해주세요.' }
    }

    // 2. 캐시 확인 (오늘운: 24h, 주간운: 168h, 월간운: 720h)
    if (!forceRefresh) {
      const ttlHours = fortuneType === 'today' ? 24 : fortuneType === 'weekly' ? 168 : 720
      const cachedRecord = await getCachedAnalysis(user.id, targetId, 'TODAY', ttlHours)
      if (cachedRecord && isCacheValid(cachedRecord, ttlHours)) {
        const cachedResult = cachedRecord.result_json as FortuneResult
        // fortuneType이 일치하는 캐시만 반환
        if (cachedResult?.type === fortuneType) {
          console.log(`[FortuneAnalysis] 캐시 적중 (${cachedRecord.created_at}) - Gemini 호출 생략`)
          return { success: true, data: cachedResult, cached: true, cachedAt: cachedRecord.created_at }
        }
      }
    }

    // 3. 만세력 계산
    const manse = calculateManse(target.birth_date, target.birth_time || '00:00', 'Asia/Seoul', true)
    const age = calculateAge(target.birth_date)

    // 4. 현재 날짜 정보
    const now = new Date()
    const todayStr = now.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
    const weekStartStr = getWeekRange(now)
    const monthStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })

    const periodLabel = fortuneType === 'today' ? todayStr : fortuneType === 'weekly' ? weekStartStr : monthStr

    // 5. 해화지기 마스터 엔진으로 프롬프트 조립
    const typeMap = { today: 'DAILY_FORTUNE', weekly: 'WEEKLY_FORTUNE', monthly: 'MONTHLY_FORTUNE' } as const
    const { prompt: masterPrompt } = await buildMasterPromptForAction(
      {
        name: target.name,
        birthDate: target.birth_date,
        birthTime: target.birth_time || '00:00',
        gender: (target.gender || 'male') as 'male' | 'female',
        isSolar: target.calendar_type !== 'lunar',
      },
      typeMap[fortuneType],
      '',
      `분석 기간: ${periodLabel}`,
      `[출력 형식 (JSON Mandatory)]
{
  "type": "${fortuneType}",
  "summary": "한 줄 핵심 요약 (20자 이내)",
  "score": 75,
  "overall": "전체 운세 흐름 (3~4문장, 해화지기 화법)",
  "areas": [
    { "name": "재물운", "score": 80, "content": "재물 관련 운세 (2~3문장)" },
    { "name": "애정운", "score": 70, "content": "애정 관련 운세 (2~3문장)" },
    { "name": "건강운", "score": 85, "content": "건강 관련 운세 (2~3문장)" },
    { "name": "직업운", "score": 75, "content": "직업/사업 관련 운세 (2~3문장)" }
  ],
  "lucky": { "color": "행운의 색상", "number": 7, "direction": "길한 방향", "advice": "핵심 조언" },
  "caution": "주의사항",
  "period": "${periodLabel}"
}`
    )

    // 6. AI 분석
    const result = await analyzeFortuneWithAI(masterPrompt, fortuneType, periodLabel)

    // 7. 히스토리 저장
    const saved = await saveAnalysisHistory({
      target_id: target.id,
      target_name: target.name,
      target_relation: target.relation_type,
      category: 'TODAY',
      result_json: result,
      summary: result.summary,
      score: result.score,
      model_used: MODEL_FLASH,
    })

    // 8. 운세 기록 (본인/가족 모두 미션 체크)
    const fortuneMemberId =
      target.target_type === 'family' ? target.id : await getSelfFamilyMemberId().catch(() => null)
    if (fortuneMemberId) {
      await recordFortuneEntry(fortuneMemberId, 'TODAY', saved.id ?? fortuneMemberId).catch(() => {})
    }

    return { success: true, data: result, cached: false }
  } catch (error) {
    console.error('[FortuneAnalysis] Error:', error)
    const message = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}

// ─── 내부 함수 ──────────────────────────────────────────

function getWeekRange(date: Date): string {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  return `${fmt(monday)} ~ ${fmt(sunday)}`
}

async function getRecentFortuneAnalysis(
  targetId: string,
  fortuneType: FortuneType,
  cacheDays: number
): Promise<FortuneResult | null> {
  const supabase = await createClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - cacheDays)

  const { data } = await supabase
    .from('analysis_history')
    .select('result_json')
    .eq('target_id', targetId)
    .eq('category', 'TODAY')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.result_json) return null
  const cached = data.result_json as FortuneResult
  // type이 일치할 때만 캐시 반환
  return cached.type === fortuneType ? cached : null
}

async function analyzeFortuneWithAI(prompt: string, fortuneType: FortuneType, period: string): Promise<FortuneResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('Google AI API Key가 없습니다.')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: MODEL_FLASH,
    generationConfig: { responseMimeType: 'application/json' },
  })

  const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
    model: MODEL_FLASH,
    actionType: 'fortune',
  })
  const text = result.response.text()
  const data = JSON.parse(text) as FortuneResult

  // 필수 필드 보정
  if (!data.type) data.type = fortuneType
  if (!data.period) data.period = period

  return data
}
