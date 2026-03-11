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

export type TrendType = 'love' | 'career' | 'exam' | 'estate'

export interface TrendArea {
  title: string
  outlook: '좋음' | '보통' | '주의'
  content: string
}

export interface TrendResult {
  trendType: TrendType
  name: string
  summary: string
  overview: string
  areas: TrendArea[]
  timing: string
  advice: string
  caution: string
  lucky: {
    color: string
    direction: string
    number: number
  }
}

const TREND_LABELS: Record<TrendType, string> = {
  love: '애정운',
  career: '직장운',
  exam: '학업운',
  estate: '부동산운',
}

const TREND_AREAS: Record<TrendType, string[]> = {
  love: ['현재 감정 상태', '인연 시기', '이상형 방향', '관계 조언'],
  career: ['현재 직장 흐름', '승진/이직 전망', '직장 내 인간관계', '사업/창업 가능성'],
  exam: ['학업 집중력', '합격 전망', '최적 학습 시기', '약점 보완'],
  estate: ['매매 운', '전세/월세 운', '이사 방향', '계약 주의사항'],
}

async function getRecentTrendAnalysis(
  targetId: string,
  trendType: TrendType,
  cacheDays: number
): Promise<TrendResult | null> {
  const supabase = await createClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - cacheDays)

  // 여러 결과 중 trendType이 일치하는 것 찾기
  const { data: rows } = await supabase
    .from('analysis_history')
    .select('result_json')
    .eq('target_id', targetId)
    .eq('category', 'TODAY')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  if (!rows) return null

  for (const row of rows) {
    const cached = row.result_json as TrendResult
    if (cached?.trendType === trendType) return cached
  }

  return null
}

export async function analyzeTrendAction(
  targetId: string,
  trendType: TrendType
): Promise<{ success: boolean; data?: TrendResult; error?: string; cached?: boolean }> {
  if (isEdgeEnabled('ai-analysis')) {
    return invokeEdgeSafe('ai-analysis', { action: 'analyzeTrend', targetId, trendType })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' }
  }

  try {
    const target = await getDestinyTarget(targetId)
    if (!target || !target.birth_date) {
      return {
        success: false,
        error: '생년월일 정보가 없습니다. 사주 정보를 먼저 입력해주세요.',
      }
    }

    // 캐시 확인 (7일)
    const cached = await getRecentTrendAnalysis(targetId, trendType, 7)
    if (cached) {
      return { success: true, data: cached, cached: true }
    }

    // 만세력 계산
    const manse = calculateManse(target.birth_date, target.birth_time || '00:00', 'Asia/Seoul', true)
    const age = calculateAge(target.birth_date)

    const trendLabel = TREND_LABELS[trendType]
    const areaItems = TREND_AREAS[trendType]

    // 해화지기 마스터 엔진으로 프롬프트 조립
    const trendTypeMap = {
      love: 'TREND_LOVE',
      career: 'TREND_CAREER',
      exam: 'TREND_EXAM',
      estate: 'TREND_WEALTH',
    } as const
    const { prompt } = await buildMasterPromptForAction(
      {
        name: target.name,
        birthDate: target.birth_date,
        birthTime: target.birth_time || '00:00',
        gender: (target.gender || 'male') as 'male' | 'female',
        isSolar: target.calendar_type !== 'lunar',
      },
      trendTypeMap[trendType],
      '',
      '',
      `[출력 형식 (JSON Mandatory)]
{
  "trendType": "${trendType}",
  "name": "${target.name}",
  "summary": "한 줄 핵심 요약 (명확하고 구체적)",
  "overview": "${trendLabel} 전체 흐름 분석 (~합니다/~입니다 체, 강점과 주의점 균형있게, 3~4문장)",
  "areas": [
    ${areaItems.map((a) => `{ "title": "${a}", "outlook": "좋음|보통|주의", "content": "해당 영역 분석 — 구체적 행동 조언과 주의사항 포함 (2~3문장)" }`).join(',\n    ')}
  ],
  "timing": "최적 행동 시기 (구체적 시기와 이유)",
  "advice": "구체적 행동 조언 (예: '이번 달 셋째 주에 면접/미팅을 잡으세요')",
  "caution": "주의사항 (구체적 상황과 대처법)",
  "lucky": { "color": "행운색", "direction": "길한 방향", "number": 7 }
}

[작성 원칙]
- 점수(score)는 절대 포함하지 마세요. outlook은 반드시 "좋음", "보통", "주의" 중 하나만 사용하세요.
- "~이 보이는군요", "운명의 기운", "에너지" 같은 시적/무속 표현 대신 "~합니다", "~입니다" 같은 명확한 현대 한국어를 사용하세요.
- 좋은 점만 말하지 말고 기회와 리스크를 균형있게 분석하세요.
- 사주 용어를 쓸 때는 괄호 안에 쉬운 설명을 추가하세요.
- "기운이 좋습니다" 대신 "3월 중순에 이직 면접을 보면 유리합니다" 같은 구체적 조언을 제공하세요.`
    )

    // AI 분석
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) throw new Error('Google AI API Key가 없습니다.')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    })

    const aiResult = await withGeminiRateLimit(() => model.generateContent(prompt), {
      userId: user?.id,
      model: MODEL_FLASH,
      actionType: `trend_${trendType}`,
    })
    const text = aiResult.response.text()
    const result = JSON.parse(text) as TrendResult

    // 필수 필드 보정
    if (!result.trendType) result.trendType = trendType
    if (!result.name) result.name = target.name

    // 히스토리 저장
    const saved = await saveAnalysisHistory({
      target_id: target.id,
      target_name: target.name,
      target_relation: target.relation_type,
      category: 'TODAY',
      result_json: result,
      summary: result.summary,
      model_used: MODEL_FLASH,
    })

    // 운세 기록 (본인/가족 모두 미션 체크)
    const fortuneMemberId =
      target.target_type === 'family' ? target.id : await getSelfFamilyMemberId().catch(() => null)
    if (fortuneMemberId) {
      await recordFortuneEntry(fortuneMemberId, 'TODAY', saved.id ?? fortuneMemberId).catch(() => {})
    }

    return { success: true, data: result, cached: false }
  } catch (error) {
    logger.error('[TrendAnalysis] Error:', error)
    const message = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}
