'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { calculateManse, calculateDaewoon } from '@/lib/domain/saju/manse'
import { calculateAge } from '@/lib/domain/saju/saju'
import { saveAnalysisHistory } from '../user/history'
// recordFortuneEntry는 saveAnalysisHistory 내부에서 자동 호출됨
import { generateAIContent } from '@/lib/services/ai-client'
import { buildMasterPromptForAction } from '@/lib/saju-engine/master-prompt-builder'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { addBokPoints } from '@/app/actions/payment/bok-points'
import { logger } from '@/lib/utils/logger'

export type TrendType = 'love' | 'career' | 'exam' | 'estate'

export interface TrendArea {
  title: string
  outlook: '좋음' | '보통' | '주의'
  content: string
}

export interface TrendPastHint {
  period: string
  description: string
  basis: string
}

export interface TrendResult {
  trendType: TrendType
  name: string
  summary: string
  overview: string
  areas: TrendArea[]
  pastHint: TrendPastHint
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
  "overview": "${trendLabel} 전체 흐름 분석 (~합니다/~입니다 체, 아래 '분석 구조'의 과거→현재→미래 순서로, 4~5문장)",
  "areas": [
    ${areaItems.map((a) => `{ "title": "${a}", "outlook": "좋음|보통|주의", "content": "해당 영역 분석 — 구체적 행동 조언과 주의사항 포함 (2~3문장)" }`).join(',\n    ')}
  ],
  "pastHint": {
    "period": "과거 시기 (예: '작년 하반기', '2025년 봄')",
    "description": "과거에 일어났을 법한 사건 추론 (예: '재물 관련 큰 지출이나 손실이 있었을 것입니다')",
    "basis": "사주 근거 (예: '세운 편재가 충을 만난 시기')"
  },
  "timing": "최적 행동 시기 — '이번 달 셋째 주', '4월 첫째 주~둘째 주' 처럼 구체적 시기 + 사주 근거",
  "advice": "구체적 행동 조언 (예: '이번 달 셋째 주에 면접/미팅을 잡으세요')",
  "caution": "주의사항 (구체적 상황과 대처법)",
  "lucky": { "color": "행운색", "direction": "길한 방향", "number": 7 }
}

## 분석 구조 (반드시 이 순서로 overview와 각 area.content에 반영)
1. 과거: "작년에 ~한 경험이 있으셨을 겁니다" — 세운/대운 역추산으로 과거 사건을 맞춰보세요
2. 현재: "지금 ~한 상황이시죠" — 현재 월운/세운 분석으로 공감을 유도하세요
3. 미래: "이번 달 ~주에 ~하세요" — 구체적 시기 + 행동을 처방하세요

## pastHint 작성법
- 대운 흐름과 과거 세운을 역추산하여 내담자가 경험했을 법한 사건을 추론하세요
- 예: 직장운이면 "작년 하반기 관성(직장 관련 기운)이 충을 만나 이직이나 부서이동이 있었을 것입니다"
- 예: 재물운이면 "2025년 봄 편재(예상치 못한 지출)가 기신을 만나 큰 지출이 있었을 것입니다"
- basis에는 반드시 사주 용어(괄호 설명 포함)로 근거를 명시하세요

[작성 원칙]
- 점수(score)는 절대 포함하지 마세요. outlook은 반드시 "좋음", "보통", "주의" 중 하나만 사용하세요.
- 긍정 70% + 주의 30% 비율로 균형 있게 분석하세요.
- 사주 용어를 쓸 때는 괄호 안에 쉬운 설명을 추가하세요.
- "기운이 좋습니다" 대신 "4월 둘째 주에 이직 면접을 보면 유리합니다" 같은 구체적 조언을 제공하세요.
- "~이 보이는군요", "운명의 에너지" 같은 무속 표현 대신 "~합니다", "~입니다" 같은 명확한 현대 한국어를 사용하세요.`
    )

    // AI 분석
    const aiResult = await generateAIContent({
      featureKey: `trend_${trendType}`,
      systemPrompt: '당신은 사주 기반 운세 전문가입니다. 반드시 유효한 JSON만 출력하십시오.',
      userPrompt: prompt,
    })
    const result = JSON.parse(aiResult.text) as TrendResult

    // 필수 필드 보정
    if (!result.trendType) result.trendType = trendType
    if (!result.name) result.name = target.name

    // 히스토리 저장 (recordFortuneEntry는 saveAnalysisHistory 내부에서 자동 호출됨)
    await saveAnalysisHistory({
      target_id: target.id,
      target_name: target.name,
      target_relation: target.relation_type,
      category: 'TODAY',
      result_json: result,
      summary: result.summary,
      model_used: MODEL_FLASH,
    })

    await addBokPoints(20, 'ANALYSIS', undefined, '대운 분석').catch(() => {})
    return { success: true, data: result, cached: false }
  } catch (error) {
    logger.error('[TrendAnalysis] Error:', error)
    const message = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}
