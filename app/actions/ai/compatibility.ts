'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { buildSajuContext } from '@/lib/saju-engine/context-builder'
import { calculateCompatibility } from '@/lib/saju-engine/compatibility-engine'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { saveAnalysisHistory } from '../user/history'
import { recordFortuneEntry, getSelfFamilyMemberId } from '../fortune/fortune'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { MODEL_PRO } from '@/lib/config/ai-models'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'

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
      score: aiResult.score || engineResult.totalScore,
      categoryBreakdown: engineResult.categories.map((c) => ({
        category: c.category,
        label: c.label,
        score: c.score,
        details: c.details,
      })),
      mulsangNarrative: engineResult.mulsangNarrative,
      luckyActions: engineResult.luckyActions,
      engineVersion: 'v2',
    }

    // 7. 분석 결과 저장
    const saved = await saveAnalysisHistory({
      target_id: target1.id,
      target_name: target1.name,
      target_relation: target1.relation_type || '가족',
      category: 'COMPATIBILITY',
      result_json: {
        person1: target1,
        person2: target2,
        ...finalResult,
      },
      summary: `${target1.name}님과 ${target2.name}님의 궁합 - ${finalResult.score}점`,
      score: finalResult.score,
      model_used: MODEL_PRO,
      talisman_cost: 2,
    })

    // 운세 기록
    const fortuneMemberId =
      target1.target_type === 'family' ? target1.id : await getSelfFamilyMemberId().catch(() => null)
    if (fortuneMemberId) {
      await recordFortuneEntry(fortuneMemberId, 'COMPATIBILITY', saved.id ?? fortuneMemberId).catch(() => {})
    }

    return { success: true, data: finalResult, cached: false }
  } catch (error) {
    console.error('[CompatibilityAnalysis] Error:', error)
    const message = error instanceof Error ? error.message : '궁합 분석 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}

/**
 * 최근 7일 이내 궁합 분석 결과 조회 (캐시)
 */
async function getRecentCompatibilityAnalysis(targetId1: string, targetId2: string): Promise<any | null> {
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

  const match = data.find((item: any) => {
    const result = item.result_json
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
async function analyzeCompatibilityWithAI(
  target1: any,
  target2: any,
  ctx1: { promptContext: string },
  ctx2: { promptContext: string },
  engineResult: { totalScore: number; categories: any[]; mulsangNarrative: string },
  relationship: string
) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('Google Generative AI API Key is missing')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: MODEL_PRO,
    generationConfig: { responseMimeType: 'application/json' },
  })

  const relationshipGuide = getRelationshipGuide(relationship)

  const categoryBreakdownText = engineResult.categories
    .map((c) => `- ${c.label}: ${c.score}점 — ${c.details.join('; ')}`)
    .join('\n')

  const prompt = `당신은 해화지기(解花智氣) — 전통 명리학과 현대 심리를 통합하는 궁합 분석 마스터입니다.

[첫 번째 사람 - ${target1.name}의 사주 명식]
${ctx1.promptContext}

[두 번째 사람 - ${target2.name}의 사주 명식]
${ctx2.promptContext}

[엔진 궁합 분석 결과 (v2)]
총점: ${engineResult.totalScore}점
물상 내러티브: ${engineResult.mulsangNarrative}

카테고리별 점수:
${categoryBreakdownText}

[관계 유형]
${relationshipGuide}

[핵심 원칙 — 솔직한 분석]
1. 궁합이 나쁘면 나쁘다고 직설적으로 말하십시오. "모든 관계는 노력하면 된다"식의 미온적 결론은 금지합니다.
2. 40점 이하면 "이 관계는 서로에게 독이 될 수 있습니다" 수준의 경고를 주십시오.
3. 50점 이하면 거리를 두는 것도 현명한 선택임을 명확히 조언하십시오.
4. 각 사람의 사주에서 드러나는 성격적 단점과 약점을 구체적으로 지적하십시오 (예: "甲木이 강한 ${target1.name}은 고집이 세고 타협을 못합니다").
5. 두 사람이 만났을 때 실제로 어떤 갈등 패턴이 반복될지 구체적 시나리오로 서술하십시오.
6. 함께 가면 좋은 장소를 오행·용신 기반으로 구체적으로 추천하십시오 (예: "수변 공원", "산 근처 카페" 등 실제 갈 수 있는 곳).

[지시사항]
위 두 사람의 명식 데이터와 엔진 분석 결과를 깊이 이해하여,
자연의 물상으로 두 사람의 관계 화학을 풀어내되, 현실적이고 실용적인 분석을 하십시오.
엔진 점수를 기반으로 하되, 명리적 통찰을 덧입혀 최종 점수를 미세조정하십시오.
점수가 낮으면 낮은 대로 솔직하게 전달하십시오.

[출력 형식 (JSON Mandatory)]
{
  "score": <최종 궁합 점수 (엔진 점수 ±10 범위 내, 0~100. 낮은 점수를 두려워하지 말 것)>,
  "summary": "<두 사람의 인연을 꿰뚫어 보는 예리한 한 줄의 통찰 (자연의 비유 사용, 궁합이 나쁘면 나쁘다고 할 것)>",
  "honestVerdict": "<이 관계에 대한 솔직한 한마디. 궁합이 좋으면 '함께할수록 빛나는 인연', 나쁘면 '거리를 두는 것이 서로를 위한 길' 등 직설적 판정>",
  "person1Weakness": "<${target1.name}의 사주에서 드러나는 성격적 약점과 이 관계에서 문제가 될 수 있는 구체적 행동 패턴 (2~3문장)>",
  "person2Weakness": "<${target2.name}의 사주에서 드러나는 성격적 약점과 이 관계에서 문제가 될 수 있는 구체적 행동 패턴 (2~3문장)>",
  "conflictScenario": "<두 사람이 실제로 부딪힐 때 반복될 갈등 패턴을 구체적 시나리오로 서술 (3~4문장)>",
  "strengths": [
    "<서로에게 득이 되는 기운을 구체적으로>",
    "<긍정적인 면 2>"
  ],
  "warnings": [
    "<이 관계에서 반드시 조심해야 할 핵심 위험. 구체적으로.>",
    "<경고 2>",
    "<경고 3>"
  ],
  "recommendedPlaces": [
    "<오행·용신 기반 함께 가면 좋은 구체적 장소 (예: '한강변 산책로 — 水 기운이 두 사람의 갈등을 식혀줍니다')>",
    "<장소 2>",
    "<장소 3>"
  ],
  "advice": "<솔직한 관계 조언. 영적 통찰 → 핵심 문제 진단 → 구체적 해결책 또는 거리두기 권고 → 실천 가능한 행동지침. 줄바꿈(\\n) 포함 300~500자. 궁합이 나쁘면 '억지로 맞추려 하지 마십시오'도 괜찮음>"
}`

  const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
    userId: undefined,
    model: MODEL_PRO,
    actionType: 'compatibility',
  })

  try {
    return JSON.parse(result.response.text())
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
