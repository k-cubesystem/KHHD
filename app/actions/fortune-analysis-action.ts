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
  fortuneType: FortuneType = 'today'
): Promise<{ success: boolean; data?: FortuneResult; error?: string; cached?: boolean }> {
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

    // 2. 캐시 확인 (오늘운: 1일, 주간운: 7일, 월간운: 30일)
    const cacheDays = fortuneType === 'today' ? 1 : fortuneType === 'weekly' ? 7 : 30
    const cached = await getRecentFortuneAnalysis(targetId, fortuneType, cacheDays)
    if (cached) {
      return { success: true, data: cached, cached: true }
    }

    // 3. 만세력 계산
    const manse = calculateManse(
      target.birth_date,
      target.birth_time || '00:00',
      'Asia/Seoul',
      true
    )
    const elements = calculateElements(manse)
    const age = calculateAge(target.birth_date)
    const daewoon = calculateDaewoon(
      target.birth_date,
      target.birth_time || '00:00',
      (target.gender || 'male') as 'male' | 'female',
      age,
      'Asia/Seoul'
    )

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

    const periodLabel =
      fortuneType === 'today' ? todayStr : fortuneType === 'weekly' ? weekStartStr : monthStr

    // 5. 프롬프트 생성
    const prompt = buildFortunePrompt({
      fortuneType,
      name: target.name,
      gender: target.gender === 'male' ? '남성' : '여성',
      birthDate: target.birth_date,
      birthTime: target.birth_time || '00:00',
      age: age.toString(),
      saju: formatSajuText(manse),
      manse: formatManseDetails(manse),
      elements: JSON.stringify(elements),
      daewoon: formatDaewoon(daewoon),
      period: periodLabel,
    })

    // 6. AI 분석
    const result = await analyzeFortuneWithAI(prompt, fortuneType, periodLabel)

    // 7. 히스토리 저장
    const saved = await saveAnalysisHistory({
      target_id: target.id,
      target_name: target.name,
      target_relation: target.relation_type,
      category: 'TODAY',
      result_json: result,
      summary: result.summary,
      score: result.score,
      model_used: 'gemini-2.0-flash',
    })

    // 8. 운세 기록 (가족 구성원인 경우)
    if (target.target_type === 'family') {
      await recordFortuneEntry(target.id, 'TODAY', saved.id ?? target.id).catch(() => {})
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

function buildFortunePrompt(vars: {
  fortuneType: FortuneType
  name: string
  gender: string
  birthDate: string
  birthTime: string
  age: string
  saju: string
  manse: string
  elements: string
  daewoon: string
  period: string
}): string {
  const typeLabel =
    vars.fortuneType === 'today'
      ? '오늘의 운세'
      : vars.fortuneType === 'weekly'
        ? '이번 주 주간 운세'
        : '이번 달 월간 운세'

  return `당신은 대한민국 최고의 사주명리 운세 전문가입니다.
아래 사주 정보를 바탕으로 ${typeLabel}을 분석해주세요.

## 분석 대상
- 이름: ${vars.name}
- 성별: ${vars.gender}
- 생년월일: ${vars.birthDate}
- 출생 시간: ${vars.birthTime}
- 나이: ${vars.age}세
- 분석 기간: ${vars.period}

## 사주 정보
${vars.saju}

## 만세력 상세
${vars.manse}

## 오행 분포
${vars.elements}

## 현재 대운
${vars.daewoon}

## 분석 지침
- ${typeLabel} 기준으로 해당 기간의 기운 흐름을 분석하세요
- 재물운, 애정운, 건강운, 직업운 4가지 영역별로 분석하세요
- 점수는 0~100 사이로 현실적으로 부여하세요 (과도하게 높거나 낮지 않게)
- 한국 전통 사주명리학 용어를 사용하되 현대적으로 해석하세요
- 격려와 실용적 조언을 담아 긍정적이되 현실적으로 서술하세요

## 출력 형식 (반드시 JSON으로만 응답)
{
  "type": "${vars.fortuneType}",
  "summary": "한 줄 핵심 요약 (20자 이내)",
  "score": 75,
  "overall": "전체 운세 흐름 설명 (3~4문장)",
  "areas": [
    { "name": "재물운", "score": 80, "content": "재물 관련 운세 (2~3문장)" },
    { "name": "애정운", "score": 70, "content": "애정 관련 운세 (2~3문장)" },
    { "name": "건강운", "score": 85, "content": "건강 관련 운세 (2~3문장)" },
    { "name": "직업운", "score": 75, "content": "직업/사업 관련 운세 (2~3문장)" }
  ],
  "lucky": {
    "color": "행운의 색상",
    "number": 7,
    "direction": "길한 방향",
    "advice": "오늘/이번 주/이번 달 핵심 조언 (1~2문장)"
  },
  "caution": "주의해야 할 사항 (1~2문장)",
  "period": "${vars.period}"
}`
}

async function analyzeFortuneWithAI(
  prompt: string,
  fortuneType: FortuneType,
  period: string
): Promise<FortuneResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('Google AI API Key가 없습니다.')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
    model: 'gemini-2.0-flash',
    actionType: 'fortune',
  })
  const text = result.response.text()
  const data = JSON.parse(text) as FortuneResult

  // 필수 필드 보정
  if (!data.type) data.type = fortuneType
  if (!data.period) data.period = period

  return data
}
