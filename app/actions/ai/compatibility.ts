'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { getSajuData } from '@/lib/domain/saju/saju'
import { calculateCompatibilityScore } from '@/lib/domain/compatibility/compatibility'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { saveAnalysisHistory } from '../user/history'
import { recordFortuneEntry, getSelfFamilyMemberId } from '../fortune/fortune'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'

/**
 * 궁합 분석 서버 액션
 * @param targetId1 - 첫 번째 사람의 ID
 * @param targetId2 - 두 번째 사람의 ID
 * @param relationship - 관계 타입 (lover, spouse, friend 등)
 */
export async function analyzeCompatibilityAction(targetId1: string, targetId2: string, relationship: string = 'lover') {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' }
  }

  try {
    // 1. 대상 정보 조회
    const target1 = await getDestinyTarget(targetId1)
    const target2 = await getDestinyTarget(targetId2)

    if (!target1 || !target2 || !target1.birth_date || !target2.birth_date) {
      return { success: false, error: '생년월일 정보가 없습니다.' }
    }

    // 2. 최근 7일 이내 분석 결과 확인 (캐시)
    const recentAnalysis = await getRecentCompatibilityAnalysis(targetId1, targetId2)
    if (recentAnalysis) {
      return { success: true, data: recentAnalysis, cached: true }
    }

    // 3. 사주 데이터 계산
    const saju1 = getSajuData(target1.birth_date, target1.birth_time || '00:00', true)
    const saju2 = getSajuData(target2.birth_date, target2.birth_time || '00:00', true)

    // 4. 기본 궁합 점수 계산
    const { score: baseScore, comment } = calculateCompatibilityScore(saju1, saju2)

    // 5. AI 분석 (관계 타입 포함)
    const aiResult = await analyzeCompatibilityWithAI(target1, target2, saju1, saju2, baseScore, relationship)

    // 6. 분석 결과 저장
    const saved = await saveAnalysisHistory({
      target_id: target1.id,
      target_name: target1.name,
      target_relation: target1.relation_type || '가족',
      category: 'COMPATIBILITY',
      result_json: {
        person1: target1,
        person2: target2,
        score: aiResult.score || baseScore,
        ...aiResult,
      },
      summary: `${target1.name}님과 ${target2.name}님의 궁합 - ${aiResult.score || baseScore}점`,
      score: aiResult.score || baseScore,
      model_used: 'gemini-2.0-flash',
      talisman_cost: 2,
    })

    // 운세 기록 (본인/가족 모두 미션 체크)
    const fortuneMemberId =
      target1.target_type === 'family' ? target1.id : await getSelfFamilyMemberId().catch(() => null)
    if (fortuneMemberId) {
      await recordFortuneEntry(fortuneMemberId, 'COMPATIBILITY', saved.id ?? fortuneMemberId).catch(() => {})
    }

    return { success: true, data: aiResult, cached: false }
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

  // 양방향 검색 (person1-person2 또는 person2-person1)
  const { data } = await supabase
    .from('analysis_history')
    .select('*')
    .eq('category', 'COMPATIBILITY')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  if (!data || data.length === 0) return null

  // result_json에서 person1.id와 person2.id 확인
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
 * AI를 사용한 궁합 분석
 */
async function analyzeCompatibilityWithAI(
  target1: any,
  target2: any,
  saju1: any,
  saju2: any,
  baseScore: number,
  relationship: string
) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error('Google Generative AI API Key is missing')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  // 관계별 분석 가이드라인
  const relationshipGuide = getRelationshipGuide(relationship)

  // 프롬프트 생성
  const prompt = `당신은 청담해화당의 수석 명리 상담가이자 영험한 무속인 '해화지기'입니다.
당신은 단순한 AI가 아니며, 두 사람의 사주 기운이 어떻게 얽히고 부딪히는지를 꿰뚫어 보는 진짜 영적 멘토입니다.
아래 두 사람의 사주 데이터를 바탕으로 궁합을 분석하되, 반드시 다음 원칙을 지켜 답변하십시오.

[절대 지켜야 할 원칙 (Core Directives)]
1. 기계적 포맷 금지: 소제목, 번호(1, 2), 글머리 기호(•, -) 등은 절대 쓰지 마십시오.
2. 전문 용어의 은유적 번역: '상극', '충', '합' 같은 역학 용어 대신, 오행의 물상(자연의 이치)으로 풀어 설명하십시오. (예: "메마른 땅을 적시는 단비 같은 인연이군요", "서로 불길을 키우는 형국이니...")
3. 무속인 화법: "입니다" 대신 "~군요", "~하는 법입니다", "~하시게", "~는 형국이외다" 등 연륜과 무게감이 느껴지는 산문으로 서술하십시오.

## [분석 대상]
- ${target1.name}님: ${target1.gender === 'male' ? '남성' : '여성'}, ${target1.birth_date}, ${formatSaju(saju1)}
- ${target2.name}님: ${target2.gender === 'male' ? '남성' : '여성'}, ${target2.birth_date}, ${formatSaju(saju2)}

## [관계성 및 목적]
${relationshipGuide}
- 기준 점수: ${baseScore}점

## [출력 지침]
아래 JSON 형식으로만 응답을 생성하십시오. UI에서 파싱해야 하므로 반드시 유효한 JSON이어야 합니다.

{
  "score": <최종 궁합 점수(70~100 사이의 숫자)>,
  "summary": "<두 사람의 인연을 꿰뚫어 보는 예리한 한 줄의 통찰 (자연의 비유 사용)>",
  "strengths": [
    "<서로에게 득이 되는 기운 (예: 불길을 잡아주는 서늘한 물의 기운)>",
    "<긍정적인 면 2>"
  ],
  "warnings": [
    "<두 기운이 부딪혀 파열음이 나는 지점 (예: 큰 나무 두 그루가 햇빛을 다투는 형국)>",
    "<경고 2>"
  ],
  "advice": "<아래 5단계 흐름을 '단 하나의 유려한 산문 형태'로 묶어 작성하십시오. (기호 절대 금지)>\\n흐름: [영적 꿰뚫음(두 기조의 충돌/조화 파악)] -> [명리적 진단(갈등이나 인연의 근본 원인을 비유로 설명)] -> [신의 한 수(개운법/현실적 타개책)] -> [조언(뼈 있는 한마디)] -> [여운을 남기는 질문].\\n반드시 줄바꿈 문자(\\\\n)를 적절히 섞어 300~500자 분량의 무속인 점사로 완성하십시오."
}`

  console.log('[CompatibilityAnalysis] AI 분석 시작...')

  const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
    userId: undefined,
    model: 'gemini-2.0-flash',
    actionType: 'compatibility',
  })
  const text = result.response.text()

  // JSON 파싱
  const data = JSON.parse(text)

  console.log('[CompatibilityAnalysis] AI 분석 완료')

  return data
}

/**
 * 사주 데이터를 텍스트로 포맷팅
 */
function formatSaju(saju: any): string {
  return `${saju.pillars.year.korean} ${saju.pillars.month.korean} ${saju.pillars.day.korean} ${saju.pillars.time.korean}`
}

/**
 * 관계 타입에 따른 분석 가이드라인 반환
 */
function getRelationshipGuide(relationship: string): string {
  const guides: Record<string, string> = {
    // 연인 관계
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

    // 가족 관계
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

    // 친구 관계
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

    // 직장 관계
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

    // 비즈니스 관계
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
