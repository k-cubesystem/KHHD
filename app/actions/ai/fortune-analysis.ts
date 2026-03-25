'use server'

export const maxDuration = 60

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { calculateManse, calculateDaewoon } from '@/lib/domain/saju/manse'
import { calculateAge } from '@/lib/domain/saju/saju'
import { saveAnalysisHistory } from '../user/history'
// recordFortuneEntry는 saveAnalysisHistory 내부에서 자동 호출됨
import { generateAIContent } from '@/lib/services/ai-client'
import { buildMasterPromptForAction } from '@/lib/saju-engine/master-prompt-builder'
import { getCachedAnalysis, isCacheValid } from '@/lib/utils/analysis-cache'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'

export type FortuneType = 'today' | 'weekly' | 'monthly'

export interface FortuneArea {
  name: string
  outlook: '좋음' | '보통' | '주의'
  content: string
}

export interface FortuneResult {
  type: FortuneType
  summary: string
  overall: string
  areas: FortuneArea[]
  lucky: {
    color: string
    colorReason: string
    number: number
    direction: string
    directionReason: string
    advice: string
    avoid: string
  }
  caution: string
  period: string
  shareQuote: string
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
          logger.log(`[FortuneAnalysis] 캐시 적중 (${cachedRecord.created_at}) - Gemini 호출 생략`)
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
  "summary": "한 줄 핵심 요약 (명확하고 구체적, 20자 이내)",
  "overall": "전체 운세 흐름 (3~4문장, ~합니다/~입니다 체, 구체적 행동 조언 포함)",
  "areas": [
    { "name": "재물운", "outlook": "좋음|보통|주의", "content": "재물 관련 운세 — 하면 좋은 것과 피해야 할 것을 구체적으로 (2~3문장)" },
    { "name": "애정운", "outlook": "좋음|보통|주의", "content": "애정 관련 운세 — 구체적 행동 조언 포함 (2~3문장)" },
    { "name": "건강운", "outlook": "좋음|보통|주의", "content": "건강 관련 운세 — 주의할 부위와 생활습관 조언 (2~3문장)" },
    { "name": "직업운", "outlook": "좋음|보통|주의", "content": "직업/사업 관련 운세 — 기회와 리스크 양면 분석 (2~3문장)" }
  ],
  "lucky": {
    "color": "행운의 색상",
    "colorReason": "색상 선정 이유 (오행 기반, 1문장)",
    "number": 7,
    "direction": "길한 방향",
    "directionReason": "방향 선정 이유 (용신 기반, 1문장)",
    "advice": "핵심 조언 (1문장)",
    "avoid": "오늘 피해야 할 것 1가지 (구체적 행동이나 상황)"
  },
  "caution": "주의사항 (구체적 상황 언급)",
  "period": "${periodLabel}",
  "shareQuote": "SNS 공유용 한 줄 — 시적이고 짧은 문구 + ' — 해화당' (예: '봄비 뒤의 무지개처럼, 기다림 끝에 좋은 소식이 옵니다 — 해화당')"
}

## 시기 특정 원칙
- 오늘 운세(today): 시간대별 조언을 포함하세요 ("오전에는 중요한 결정을 피하고, 오후 3시 이후에 행동하세요")
- 주간 운세(weekly): 요일별 포인트를 포함하세요 ("수요일이 이번 주 최고의 날입니다")
- 월간 운세(monthly): 주차별 포인트를 포함하세요 ("셋째 주에 재물운이 정점에 도달합니다")
- overall 필드와 각 area의 content에 위 시기 정보를 자연스럽게 녹여내세요

## 행동 처방 (매일 확인하게 만드는 핵심)
각 운세에 반드시 포함할 것:
- lucky.color + lucky.colorReason: 오행 기반 행운 컬러와 이유
- lucky.direction + lucky.directionReason: 용신 기반 행운 방위와 이유
- lucky.number: 행운의 숫자
- lucky.avoid: 오늘 피해야 할 것 1가지
- shareQuote: SNS 공유하고 싶게 만드는 시적인 한 줄 (반드시 ' — 해화당'으로 끝낼 것)

[작성 원칙]
- 점수(score)는 절대 포함하지 마세요. outlook은 반드시 "좋음", "보통", "주의" 중 하나만 사용하세요.
- 긍정 70% + 주의 30% 비율로 균형 있게 분석하세요.
- 사주 용어를 쓸 때는 괄호 안에 쉬운 설명을 추가하세요 (예: "정재(안정적 수입을 뜻하는 기운)").
- "기운이 좋습니다" 대신 "이번 주 수요일에 거래처 미팅을 잡으면 좋은 결과가 있습니다" 같은 구체적 조언을 제공하세요.
- "~이 보이는군요" 같은 무속 표현 대신 "~합니다", "~입니다" 같은 명확한 현대 한국어를 사용하되, shareQuote에서만 시적 표현을 허용하세요.`
    )

    // 6. AI 분석
    const result = await analyzeFortuneWithAI(masterPrompt, fortuneType, periodLabel)

    // 7. 히스토리 저장 (recordFortuneEntry는 saveAnalysisHistory 내부에서 자동 호출됨)
    await saveAnalysisHistory({
      target_id: target.id,
      target_name: target.name,
      target_relation: target.relation_type,
      category: 'TODAY',
      result_json: result,
      summary: result.summary,
      model_used: MODEL_FLASH,
    })

    return { success: true, data: result, cached: false }
  } catch (error) {
    logger.error('[FortuneAnalysis] Error:', error)
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

async function analyzeFortuneWithAI(prompt: string, fortuneType: FortuneType, period: string): Promise<FortuneResult> {
  const result = await generateAIContent({
    featureKey: 'fortune',
    systemPrompt: '당신은 사주 기반 운세 전문가입니다. 반드시 유효한 JSON만 출력하십시오.',
    userPrompt: prompt,
  })

  let data: FortuneResult
  try {
    data = JSON.parse(result.text) as FortuneResult
  } catch {
    throw new Error('AI 응답 파싱 실패')
  }

  // 필수 필드 보정
  if (!data.type) data.type = fortuneType
  if (!data.period) data.period = period

  return data
}
