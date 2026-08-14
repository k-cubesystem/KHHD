'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { buildSajuContext } from '@/lib/saju-engine/context-builder'
import { buildRemedySet } from '@/lib/domain/remedy/remedy'
import { calculateCompatibility } from '@/lib/saju-engine/compatibility-engine'
import { saveAnalysisHistoryObserved } from '../user/history'
import { buildCompatibilityPrompt } from '@/lib/ai/prompts/compatibility'
import { resolveFocusGroup, type FocusGroup } from '@/lib/domain/compatibility/focus-groups'
// recordFortuneEntry는 saveAnalysisHistory 내부에서 자동 호출됨
import { generateAIContent } from '@/lib/services/ai-client'
import { MODEL_PRO } from '@/lib/config/ai-models'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { addBokPoints } from '@/lib/services/bok-grant'
import { logger } from '@/lib/utils/logger'

/**
 * 궁합 분석 서버 액션 v2
 * 양쪽 모두 saju-engine을 거쳐 8개 카테고리 분석
 */
export async function analyzeCompatibilityAction(targetId1: string, targetId2: string, relationship: string = 'lover') {
  if (isEdgeEnabled('ai-analysis')) {
    return invokeEdgeSafe('ai-analysis', { action: 'analyzeCompatibility', targetId1, targetId2, relationship })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' }
  }

  try {
    // 1. 대상 정보 조회
    const [target1, target2] = await Promise.all([getDestinyTarget(targetId1), getDestinyTarget(targetId2)])

    if (!target1 || !target2 || !target1.birth_date || !target2.birth_date) {
      return { success: false, error: '생년월일 정보가 없습니다.' }
    }

    // 2. 최근 7일 이내 분석 결과 확인 (캐시) — v3 + 관계군(focusGroup) 일치 시에만 재사용
    // (같은 두 사람을 다른 관계로 다시 보면 캐시를 잘못 재사용하던 문제 수정)
    const focusGroup = resolveFocusGroup(relationship)
    const recentAnalysis = await getRecentCompatibilityAnalysis(targetId1, targetId2, focusGroup)
    if (recentAnalysis) {
      return { success: true, data: recentAnalysis, cached: true }
    }

    // 3. 양쪽 모두 사주 컨텍스트 생성 (병렬)
    const [ctx1, ctx2] = await Promise.all([
      Promise.resolve(
        buildSajuContext({
          name: target1.name,
          birthDate: target1.birth_date,
          birthTime: target1.birth_time || '00:00',
          gender: (target1.gender || 'male') as 'male' | 'female',
          isSolar: target1.calendar_type !== 'lunar',
        })
      ),
      Promise.resolve(
        buildSajuContext({
          name: target2.name,
          birthDate: target2.birth_date,
          birthTime: target2.birth_time || '00:00',
          gender: (target2.gender || 'male') as 'male' | 'female',
          isSolar: target2.calendar_type !== 'lunar',
        })
      ),
    ])

    // 4. 엔진 궁합 계산
    const engineResult = calculateCompatibility(ctx1, ctx2, relationship)

    // 5. AI 분석 (양쪽 promptContext + 엔진 결과 주입)
    const aiResult = await analyzeCompatibilityWithAI(target1, target2, ctx1, ctx2, engineResult, relationship)

    // 6. 최종 결과 조합
    const finalResult = {
      ...aiResult,
      overallAssessment: aiResult.overallAssessment || getAssessmentFromScore(engineResult.totalScore),
      categoryBreakdown: engineResult.categories.map((c) => ({
        category: c.category,
        label: c.label,
        assessment: getAssessmentFromScore(c.score),
        details: c.details,
      })),
      mulsangNarrative: engineResult.mulsangNarrative,
      luckyActions: engineResult.luckyActions,
      focusGroup,
      /**
       * 개운 처방 — 🔴 **첫 번째 사람(요청자) 기준 한 벌만** 낸다.
       *
       * 두 사람 몫을 나란히 내면 상대의 사주를 «처방»으로 규정하는 화면이 된다. 상대는 그
       * 판정을 반박할 자리에 없고, 그건 관계 상품이 넘지 말아야 할 선이다(직장·재물 §3-5).
       * 관계에 대한 조언은 이미 `luckyActions`(엔진 궁합)가 낸다.
       */
      remedy: buildRemedySet(ctx1),
      engineVersion: 'v3',
    }

    // 7. 분석 결과 저장 (recordFortuneEntry는 saveAnalysisHistory 내부에서 자동 호출됨)
    await saveAnalysisHistoryObserved({
      target_id: target1.id,
      target_name: target1.name,
      target_relation: target1.relation_type || '가족',
      category: 'COMPATIBILITY',
      result_json: {
        person1: target1,
        person2: target2,
        ...finalResult,
      },
      summary: `${target1.name}님과 ${target2.name}님의 궁합 - ${finalResult.overallAssessment}`,
      model_used: MODEL_PRO,
      talisman_cost: 2,
    })

    await addBokPoints(40, 'COMPATIBILITY', undefined, '궁합 분석 완료').catch(() => {})

    return { success: true, data: finalResult, cached: false }
  } catch (error: unknown) {
    logger.error('[CompatibilityAnalysis] Error:', error)
    const message = error instanceof Error ? error.message : '궁합 분석 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}

/**
 * 최근 7일 이내 궁합 분석 결과 조회 (캐시)
 */
async function getRecentCompatibilityAnalysis(
  targetId1: string,
  targetId2: string,
  focusGroup: FocusGroup
): Promise<Record<string, unknown> | null> {
  const supabase = await createClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data } = await supabase
    .from('analysis_history')
    .select('*')
    .eq('category', 'COMPATIBILITY')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  if (!data || data.length === 0) return null

  const match = data.find((item: { result_json: Record<string, unknown> }) => {
    const result = item.result_json as {
      person1?: { id?: string }
      person2?: { id?: string }
      engineVersion?: string
      focusGroup?: string
    }
    if (result?.engineVersion !== 'v3') return false
    if (result?.focusGroup !== focusGroup) return false
    if (!result?.person1?.id || !result?.person2?.id) return false
    return (
      (result.person1.id === targetId1 && result.person2.id === targetId2) ||
      (result.person1.id === targetId2 && result.person2.id === targetId1)
    )
  })

  return match?.result_json || null
}

/**
 * AI를 사용한 궁합 분석 (양쪽 컨텍스트 + 엔진 결과 주입)
 */
interface CompatibilityCategory {
  category: string
  label: string
  score: number
  details: string[]
}

async function analyzeCompatibilityWithAI(
  target1: NonNullable<Awaited<ReturnType<typeof getDestinyTarget>>>,
  target2: NonNullable<Awaited<ReturnType<typeof getDestinyTarget>>>,
  ctx1: { promptContext: string },
  ctx2: { promptContext: string },
  engineResult: { totalScore: number; categories: CompatibilityCategory[]; mulsangNarrative: string },
  relationship: string
) {
  const categoryBreakdownText = engineResult.categories
    .map((c) => `- ${c.label}: ${c.score}점 — ${c.details.join('; ')}`)
    .join('\n')

  const { systemPrompt, userPrompt } = buildCompatibilityPrompt({
    person1Name: target1.name,
    person2Name: target2.name,
    ctx1PromptContext: ctx1.promptContext,
    ctx2PromptContext: ctx2.promptContext,
    engineTotalScore: engineResult.totalScore,
    engineMulsangNarrative: engineResult.mulsangNarrative,
    categoryBreakdownText,
    relationship,
  })

  const result = await generateAIContent({
    featureKey: 'compatibility',
    systemPrompt,
    userPrompt,
  })

  try {
    return JSON.parse(result.text)
  } catch {
    throw new Error('AI 응답 파싱 실패')
  }
}

/**
 * 엔진 점수를 텍스트 평가로 변환
 */
function getAssessmentFromScore(score: number): string {
  if (score >= 75) return '좋은 궁합'
  if (score >= 55) return '보통 궁합'
  if (score >= 40) return '어려운 궁합'
  return '주의가 필요한 궁합'
}
