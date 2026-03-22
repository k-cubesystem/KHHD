'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { buildSajuContext } from '@/lib/saju-engine/context-builder'
import { calculateCompatibility } from '@/lib/saju-engine/compatibility-engine'
import { saveAnalysisHistory } from '../user/history'
// recordFortuneEntry는 saveAnalysisHistory 내부에서 자동 호출됨
import { generateAIContent } from '@/lib/services/ai-client'
import { MODEL_PRO } from '@/lib/config/ai-models'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
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

    // 2. 최근 7일 이내 분석 결과 확인 (캐시) - v2 엔진 버전 구분
    const recentAnalysis = await getRecentCompatibilityAnalysis(targetId1, targetId2)
    if (recentAnalysis && recentAnalysis.engineVersion === 'v2') {
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
      engineVersion: 'v2',
    }

    // 7. 분석 결과 저장 (recordFortuneEntry는 saveAnalysisHistory 내부에서 자동 호출됨)
    await saveAnalysisHistory({
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
  targetId2: string
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
    const result = item.result_json as { person1?: { id?: string }; person2?: { id?: string } }
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
  const relationshipGuide = getRelationshipGuide(relationship)

  const categoryBreakdownText = engineResult.categories
    .map((c) => `- ${c.label}: ${c.score}점 — ${c.details.join('; ')}`)
    .join('\n')

  const systemPrompt = `당신은 전통 명리학과 현대 관계 심리를 통합하는 궁합 전문 상담가입니다.
반드시 유효한 JSON만 출력하십시오. 다른 텍스트는 포함하지 마십시오.`

  const userPrompt = `[첫 번째 사람 - ${target1.name}의 사주 명식]
${ctx1.promptContext}

[두 번째 사람 - ${target2.name}의 사주 명식]
${ctx2.promptContext}

[엔진 궁합 분석 결과 (v2)]
엔진 점수 참고: ${engineResult.totalScore}점 (내부 참고용, 출력에 점수 포함 금지)
물상 내러티브: ${engineResult.mulsangNarrative}

카테고리별 분석:
${categoryBreakdownText}

[관계 유형]
${relationshipGuide}

[핵심 원칙 — 솔직한 분석]
1. 궁합이 나쁘면 나쁘다고 직설적으로 말하십시오. "모든 관계는 노력하면 된다"식의 미온적 결론은 금지합니다.
2. 엔진 점수 40점 이하면 "이 관계는 서로에게 독이 될 수 있습니다" 수준의 경고를 주십시오.
3. 엔진 점수 50점 이하면 거리를 두는 것도 현명한 선택임을 명확히 조언하십시오.
4. 각 사람의 사주에서 드러나는 성격적 단점과 약점을 구체적으로 지적하십시오 (예: "甲木(갑목, 큰 나무 성향)이 강한 ${target1.name}은 고집이 세고 타협을 못합니다").
5. 사주 용어를 사용할 때는 반드시 괄호 안에 쉬운 설명을 추가하십시오.
6. 두 사람이 만났을 때 실제로 어떤 갈등 패턴이 반복될지 구체적 시나리오로 서술하십시오.
7. 함께 가면 좋은 장소를 오행 기반으로 구체적으로 추천하십시오 (예: "수변 공원", "산 근처 카페" 등 실제 갈 수 있는 곳).

## 과거 역추산 (신뢰 구축)
두 사주의 대운/세운 충합 시점을 역산하여 관계 과거를 추론하십시오:
- "처음 만났을 때 한쪽이 먼저 강하게 끌렸을 것입니다" (도화살/홍염살 기반)
- "사귄 지 1~2년차에 심하게 다툰 적이 있으셨죠" (충 시점 기반)
- "두 분 사이에 이별 위기가 한 번 있었을 겁니다" (형/파 시점)
각 추론에 명리학적 근거를 반드시 포함하십시오.

## 풀이 순서
반드시 과거 → 현재 → 미래 순서로 풀이하십시오.
갈등 포인트를 지적할 때는 반드시 구체적 해결법을 함께 제시하십시오.
시기는 "올해 하반기", "내년 봄" 등 구체적으로, 행동 처방은 "매주 토요일 함께 산책" 등 즉시 실행 가능하게 작성하십시오.

## 월별 맞춤 조언
향후 12개월 중 관계에 중요한 달을 최소 4개 선정하여, 각 달에 맞는 조언과 명리학적 근거를 제시하십시오.

[지시사항]
위 두 사람의 명식 데이터와 엔진 분석 결과를 바탕으로 현실적이고 실용적인 분석을 하십시오.
강점과 약점을 균형있게 다루되, 문제가 있으면 명확히 지적하십시오.
숫자 점수는 출력하지 마십시오. 대신 텍스트 평가를 사용하십시오.

[출력 형식 (JSON Mandatory)]
{
  "overallAssessment": "<'좋은 궁합' | '보통 궁합' | '어려운 궁합' | '주의가 필요한 궁합' 중 하나>",
  "summary": "<두 사람의 관계를 한 줄로 정리한 핵심 통찰. 명확한 현대 한국어로.>",
  "honestVerdict": "<이 관계에 대한 솔직한 한마디. 직설적 판정>",
  "person1Weakness": "<${target1.name}의 사주에서 드러나는 성격적 약점과 이 관계에서 문제가 될 수 있는 구체적 행동 패턴 (2~3문장)>",
  "person2Weakness": "<${target2.name}의 사주에서 드러나는 성격적 약점과 이 관계에서 문제가 될 수 있는 구체적 행동 패턴 (2~3문장)>",
  "conflictScenario": "<두 사람이 실제로 부딪힐 때 반복될 갈등 패턴을 구체적 시나리오로 서술 (3~4문장)>",
  "pastRetrograde": {
    "events": [
      { "period": "<만난 초기 / 교제 1~2년차 / 특정 시점 등>", "description": "<과거 추론 설명>", "basis": "<명리학적 근거>" }
    ]
  },
  "monthlyAdvice": [
    { "month": "<N월>", "advice": "<구체적 행동 조언>", "basis": "<명리학적 근거>" }
  ],
  "strengths": [
    "<서로에게 도움이 되는 구체적인 점>",
    "<긍정적인 면 2>"
  ],
  "warnings": [
    "<이 관계에서 반드시 조심해야 할 핵심 위험. 구체적으로.>",
    "<경고 2>",
    "<경고 3>"
  ],
  "recommendedPlaces": [
    "<오행 기반 함께 가면 좋은 구체적 장소와 그 이유>",
    "<장소 2>",
    "<장소 3>"
  ],
  "advice": "<솔직한 관계 조언. 과거 패턴 진단 → 현재 핵심 문제 → 미래 구체적 해결책 또는 거리두기 권고 → 지금 바로 실천할 수 있는 행동지침. 줄바꿈(\\n) 포함 300~500자.>"
}`

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
 * 관계 타입에 따른 분석 가이드라인 반환
 */
function getRelationshipGuide(relationship: string): string {
  const guides: Record<string, string> = {
    lover: `**애인 관계** - 연애 궁합을 중점적으로 분석합니다.
- 애정운, 로맨스 지속 가능성
- 결혼으로 발전할 가능성
- 감정 표현 방식의 조화
- 데이트 스타일 궁합`,

    dating: `**소개팅/만남** - 첫 만남의 가능성을 살펴봅니다.
- 첫인상과 호감도
- 발전 가능성
- 서로에게 끌리는 이유
- 주의해야 할 첫 만남 실수`,

    crush: `**짝사랑** - 한쪽의 마음이 이루어질지 분석합니다.
- 상대방의 마음 가능성
- 다가가는 최적의 타이밍
- 어필 포인트
- 주의사항과 조언`,

    marriage: `**결혼 예정** - 평생 함께할 두 사람의 미래를 봅니다.
- 결혼 생활 조화도
- 가정 꾸리기 시너지
- 장기적 안정성
- 시댁/처가 관계 힌트`,

    spouse: `**부부 관계** - 부부로서의 조화와 갈등 해소를 다룹니다.
- 부부 궁합 재평가
- 갈등 패턴과 해결법
- 서로 이해하는 방법
- 장기 관계 유지 전략`,

    parent_child: `**부모-자녀 관계** - 세대 간 이해와 소통을 돕습니다.
- 세대 차이 극복법
- 효과적인 소통 방식
- 서로의 강점 활용
- 갈등 최소화 전략`,

    siblings: `**형제/자매 관계** - 형제자매 간 조화를 분석합니다.
- 성격 차이 이해
- 경쟁보다 협력
- 서로 돕는 방법
- 평생 우애 유지법`,

    in_laws: `**시댁/처가 관계** - 확대 가족과의 조화를 살펴봅니다.
- 상호 존중 포인트
- 갈등 예방법
- 좋은 관계 유지 비결
- 가족 행사 조화`,

    friend: `**친구 관계** - 우정의 깊이와 지속성을 봅니다.
- 우정 지속 가능성
- 서로에게 주는 영향
- 함께 성장하는 방법
- 갈등 시 해결법`,

    best_friend: `**절친 관계** - 평생 우정을 나눌 수 있을지 분석합니다.
- 깊은 신뢰 형성 가능성
- 서로의 비밀 공유 안정성
- 인생 동반자로서의 가치
- 평생 우정 유지법`,

    roommate: `**룸메이트 관계** - 함께 사는 생활 궁합을 확인합니다.
- 생활 습관 조화
- 공간 공유 스트레스 관리
- 청결/소음 등 민감 사항
- 편안한 동거 팁`,

    boss_employee: `**상사-부하 관계** - 상하 관계의 협업 효율을 분석합니다.
- 지시-수행 궁합
- 커뮤니케이션 스타일
- 갈등 최소화 전략
- 성과 극대화 방법`,

    coworker: `**동료 관계** - 직장 동료로서의 협업 가능성을 봅니다.
- 업무 협업 시너지
- 역할 분담 최적화
- 의견 충돌 해결법
- 팀워크 강화 방안`,

    mentor_mentee: `**멘토-멘티 관계** - 가르침과 배움의 관계를 살펴봅니다.
- 교육-학습 궁합
- 지식 전달 효율성
- 성장 가능성
- 상호 존중 유지법`,

    part_timer: `**알바-사장 관계** - 단기 고용 관계의 조화를 분석합니다.
- 단기 협력 효율
- 명확한 기대치 설정
- 갈등 조기 해결
- 좋은 평가 받는 법`,

    business_partner: `**동업자 관계** - 사업 파트너로서의 시너지를 분석합니다.
- 비즈니스 비전 일치도
- 역할 분담 최적화
- 재무 관리 조화
- 장기 파트너십 전략`,

    investor: `**투자자-창업자 관계** - 투자 관계의 신뢰와 성공 가능성을 봅니다.
- 신뢰 형성 가능성
- 사업 성공 시너지
- 의사결정 조화
- Win-Win 전략`,

    client: `**고객-공급자 관계** - 비즈니스 거래 관계를 분석합니다.
- 거래 지속 가능성
- 상호 만족도
- 협상 스타일 궁합
- 장기 관계 구축법`,

    team_project: `**프로젝트 팀원 관계** - 단기 프로젝트 협업 궁합을 확인합니다.
- 단기 목표 달성 시너지
- 역할 분담 효율
- 스트레스 관리
- 성공적인 완수 전략`,
  }

  return guides[relationship] || guides['lover']
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
