'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { calculateManse, calculateDaewoon } from '@/lib/domain/saju/manse'
import { calculateAge } from '@/lib/domain/saju/saju'
import {
  formatManseDetails,
  formatSajuText,
  formatDaewoon,
  calculateElements,
} from '@/lib/utils/manse-formatter'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { saveAnalysisHistory } from '../user/history'
import { recordFortuneEntry, getSelfFamilyMemberId } from '../fortune/fortune'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { getPromptWithVariables } from '@/lib/utils/prompt-variables'

export type TrendType = 'love' | 'career' | 'exam' | 'estate'

export interface TrendArea {
  title: string
  score: number
  content: string
}

export interface TrendResult {
  trendType: TrendType
  name: string
  summary: string
  score: number
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
  love: ['현재 감정 에너지', '인연 시기', '이상형 방향', '관계 조언'],
  career: ['현재 직장 기운', '승진/이직 에너지', '인간관계 운', '사업/창업 운'],
  exam: ['학업 집중력', '합격 에너지', '최적 학습 시기', '약점 보완'],
  estate: ['매매 운', '전세/월세 운', '이사 방향', '계약 주의사항'],
}

const TREND_GUIDES: Record<TrendType, string> = {
  love: `- 현재 연애/결혼 흐름과 인연이 오는 시기를 분석하세요
- 이상형 방향과 현재 관계 개선 조언을 구체적으로 제시하세요
- 감정 에너지의 흐름과 만남의 기회를 중심으로 서술하세요`,
  career: `- 승진/이직 가능성과 직장 내 인간관계를 분석하세요
- 새로운 기회가 열리는 시기와 업종/부서 조언을 제시하세요
- 사업/창업 운과 현재 직장 기운을 중심으로 서술하세요`,
  exam: `- 합격 가능성 에너지와 집중력 최적 시기를 분석하세요
- 시험 운과 학습 방향, 강약점 조언을 구체적으로 제시하세요
- 자격증/입시/취업 시험 등 성취 운을 중심으로 서술하세요`,
  estate: `- 매매/전세 운과 이사 적합 시기를 분석하세요
- 방향/위치 조언과 문서 계약 주의사항을 구체적으로 제시하세요
- 부동산 취득/처분/임대차 운을 중심으로 서술하세요`,
}

async function getRecentTrendAnalysis(
  targetId: string,
  trendType: TrendType,
  cacheDays: number
): Promise<TrendResult | null> {
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
    .limit(20)
    .maybeSingle()

  if (!data?.result_json) return null

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

function buildTrendPrompt(vars: {
  trendType: TrendType
  trendLabel: string
  name: string
  gender: string
  birthDate: string
  age: string
  saju: string
  manse: string
  elements: string
  daewoon: string
  areaItems: string[]
  guide: string
}): string {
  const areasJson = vars.areaItems
    .map((title) => `    { "title": "${title}", "score": 75, "content": "설명 2~3문장" }`)
    .join(',\n')

  return `당신은 대한민국 최고의 사주명리 ${vars.trendLabel} 전문가입니다.
아래 사주 정보를 바탕으로 ${vars.trendLabel}을 심층 분석해주세요.

## 분석 대상
- 이름: ${vars.name}
- 성별: ${vars.gender}
- 생년월일: ${vars.birthDate}
- 나이: ${vars.age}세

## 사주 정보
${vars.saju}

## 만세력 상세
${vars.manse}

## 오행 분포
${vars.elements}

## 현재 대운
${vars.daewoon}

## 분석 지침
${vars.guide}
- 점수는 0~100 사이로 현실적으로 부여하세요 (과도하게 높거나 낮지 않게)
- 한국 전통 사주명리학 용어를 사용하되 현대적으로 해석하세요
- 격려와 실용적 조언을 담아 긍정적이되 현실적으로 서술하세요

## 출력 형식 (반드시 JSON으로만 응답)
{
  "trendType": "${vars.trendType}",
  "name": "${vars.name}",
  "summary": "한 줄 요약 (15자 이내)",
  "score": 75,
  "overview": "전체 설명 3~4문장",
  "areas": [
${areasJson}
  ],
  "timing": "좋은 시기 구체적으로 (예: 3월~5월이 최고점)",
  "advice": "핵심 조언 2~3문장",
  "caution": "주의사항 1~2문장",
  "lucky": { "color": "색상", "direction": "방향", "number": 7 }
}`
}

export async function analyzeTrendAction(
  targetId: string,
  trendType: TrendType
): Promise<{ success: boolean; data?: TrendResult; error?: string; cached?: boolean }> {
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

    const trendLabel = TREND_LABELS[trendType]
    const areaItems = TREND_AREAS[trendType]
    const guide = TREND_GUIDES[trendType]

    const variables = {
      name: target.name,
      gender: target.gender === 'male' ? '남성' : '여성',
      birthDate: target.birth_date,
      birthTime: target.birth_time || '00:00',
      age: age.toString(),
      saju: formatSajuText(manse),
      manse: formatManseDetails(manse),
      elements: JSON.stringify(elements),
      daewoon: formatDaewoon(daewoon),
    }

    // DB 프롬프트 조회 → 없으면 하드코딩 fallback
    let prompt: string
    try {
      prompt = await getPromptWithVariables(`trend_${trendType}`, variables)
    } catch {
      prompt = buildTrendPrompt({
        trendType,
        trendLabel,
        areaItems,
        guide,
        ...variables,
      })
    }

    // AI 분석
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) throw new Error('Google AI API Key가 없습니다.')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const aiResult = await withGeminiRateLimit(() => model.generateContent(prompt), {
      userId: user?.id,
      model: 'gemini-2.0-flash',
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
      score: result.score,
      model_used: 'gemini-2.0-flash',
    })

    // 운세 기록 (본인/가족 모두 미션 체크)
    const fortuneMemberId =
      target.target_type === 'family' ? target.id : await getSelfFamilyMemberId().catch(() => null)
    if (fortuneMemberId) {
      await recordFortuneEntry(fortuneMemberId, 'TODAY', saved.id ?? fortuneMemberId).catch(
        () => {}
      )
    }

    return { success: true, data: result, cached: false }
  } catch (error) {
    console.error('[TrendAnalysis] Error:', error)
    const message = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}
