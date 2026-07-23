'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { MODEL_PRO } from '@/lib/config/ai-models'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { deductTalisman, refundStudioCost } from '@/app/actions/payment/wallet'
import { addBokPoints } from '@/app/actions/payment/bok-points'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { saveAnalysisHistoryObserved } from '@/app/actions/user/history'
import { parseSamhap, isSamhapEmpty, type SamhapParsed } from '@/lib/domain/analysis/samhap-parse'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')
const SAMHAP_COST = FEATURE_COST.samhap.display // 5만냥 (표시=실차감)

// ─── 타입 ──────────────────────────────────────────────────────────────────

export interface SamhapReadiness {
  ready: boolean
  hasFace: boolean
  hasHand: boolean
  hasBirth: boolean
  faceScore: number | null
  handScore: number | null
  targetName: string
}

export interface SamhapResult {
  success: boolean
  /** 구조화 파싱 결과. 파싱 실패 시 undefined(원문 폴백). */
  parsed?: SamhapParsed
  /** AI 원문(항상 보존 — 파서 실패해도 노출 가능). */
  raw?: string
  /** 종합 점수(관상·손금 평균). */
  score?: number
  targetName?: string
  error?: string
  errorType?: 'REQUIREMENTS' | 'DEDUCT' | 'AI' | 'AUTH'
}

// ─── 내부 헬퍼 ─────────────────────────────────────────────────────────────

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined
}
function obj(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined
}
function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

interface ReadingRow {
  score: number | null
  result: unknown
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function latestReading(
  supabase: SupabaseClient,
  userId: string,
  category: 'FACE' | 'HAND',
  targetId: string
): Promise<ReadingRow | null> {
  const { data, error } = await supabase
    .from('analysis_history')
    .select('score, result_json')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  const row = data as unknown as { score: number | null; result_json: unknown }
  return { score: row.score ?? null, result: row.result_json }
}

interface SamhapInputs {
  face: ReadingRow | null
  hand: ReadingRow | null
  birthDate: string | null
  birthTime: string | null
  calendarType: string | null
  isLeapMonth: boolean
  targetName: string
  targetRelation: string
}

/** 삼합 입력(관상·손금 이력 + 생년월일)을 대상(본인/가족)별로 모은다. RLS: 본인 소유만. */
async function gatherSamhapInputs(supabase: SupabaseClient, userId: string, targetId?: string): Promise<SamhapInputs> {
  const effectiveTarget = targetId ?? userId
  const [face, hand] = await Promise.all([
    latestReading(supabase, userId, 'FACE', effectiveTarget),
    latestReading(supabase, userId, 'HAND', effectiveTarget),
  ])

  let birthDate: string | null = null
  let birthTime: string | null = null
  let calendarType: string | null = null
  let isLeapMonth = false
  let targetName = '본인'
  let targetRelation = '본인'

  if (targetId) {
    const { data } = await supabase
      .from('family_members')
      .select('name, relationship, birth_date, birth_time, calendar_type')
      .eq('id', targetId)
      .eq('user_id', userId)
      .maybeSingle()
    birthDate = data?.birth_date ?? null
    birthTime = data?.birth_time ?? null
    calendarType = data?.calendar_type ?? null
    targetName = data?.name ?? '가족'
    targetRelation = data?.relationship ?? '가족'
  } else {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, birth_date, birth_time, calendar_type, is_leap_month')
      .eq('id', userId)
      .maybeSingle()
    birthDate = data?.birth_date ?? null
    birthTime = data?.birth_time ?? null
    calendarType = data?.calendar_type ?? null
    isLeapMonth = data?.is_leap_month ?? false
    targetName = data?.full_name ?? '본인'
  }

  return { face, hand, birthDate, birthTime, calendarType, isLeapMonth, targetName, targetRelation }
}

interface SajuBasic {
  dayGan?: string
  age?: number
  dayElement?: string
  distribution?: Record<string, number>
}

/** 사주 기본(일간·나이·일간 오행·오행 분포)을 기존 엔진으로 해석. 실패 시 빈 객체. */
async function resolveSaju(inputs: SamhapInputs): Promise<SajuBasic> {
  if (!inputs.birthDate) return {}
  try {
    const { getSajuData, calculateAge } = await import('@/lib/domain/saju/saju')
    const { isSolarCalendar } = await import('@/lib/domain/saju/calendar')
    const s = getSajuData(
      inputs.birthDate,
      inputs.birthTime || '12:00',
      isSolarCalendar(inputs.calendarType),
      inputs.isLeapMonth
    )
    return {
      dayGan: s.dayGan,
      age: calculateAge(inputs.birthDate),
      dayElement: s.dayMasterElement,
      distribution: s.elementsDistribution,
    }
  } catch (e) {
    logger.warn('[samhap] 사주 컨텍스트 생략:', e)
    return {}
  }
}

function summarizeFace(rj: unknown): string {
  const o = obj(rj)
  if (!o) return '관상 데이터 없음'
  const lines: string[] = []
  const fi = str(o.firstImpression)
  if (fi) lines.push(`첫인상: ${clip(fi, 120)}`)
  const g = str(o.gisaekReading)
  if (g) lines.push(`기색: ${clip(g, 100)}`)
  const pa = obj(o.partAnalysis)
  if (pa) {
    const meta: Array<[string, string]> = [
      ['forehead', '이마'],
      ['eyes', '눈'],
      ['nose', '코'],
      ['mouth', '입'],
      ['ears', '귀'],
      ['chin', '턱'],
    ]
    const bits = meta
      .map(([k, label]) => {
        const e = obj(pa[k])
        const a = e ? str(e.assessment) : undefined
        return a ? `${label} ${a}` : null
      })
      .filter((x): x is string => x !== null)
    if (bits.length) lines.push(`부위 평가: ${bits.join(', ')}`)
  }
  const pt = str(o.personalityType)
  if (pt) lines.push(`유형: ${pt}`)
  return lines.length > 0 ? lines.join('\n') : '관상 요약 없음'
}

function summarizeHand(rj: unknown): string {
  const o = obj(rj)
  if (!o) return '손금 데이터 없음'
  const lines: string[] = []
  const pl = obj(o.palmLines)
  if (pl) {
    const meta: Array<[string, string]> = [
      ['lifeLine', '생명선'],
      ['intelligenceLine', '지능선'],
      ['emotionLine', '감정선'],
      ['fateLine', '운명선'],
      ['sunLine', '태양선'],
      ['marriageLine', '결혼선'],
    ]
    const bits = meta
      .map(([k, label]) => {
        const e = obj(pl[k])
        const a = e ? str(e.assessment) : undefined
        return a ? `${label} ${a}` : null
      })
      .filter((x): x is string => x !== null)
    if (bits.length) lines.push(`선 평가: ${bits.join(', ')}`)
  }
  const fo = obj(o.fortuneOverview)
  if (fo) {
    const parts = [
      ['wealth', '재물'],
      ['health', '건강'],
      ['love', '애정'],
      ['career', '직업'],
    ] as const
    const bits = parts
      .map(([k, label]) => {
        const t = str(fo[k])
        return t ? `${label}: ${clip(t, 90)}` : null
      })
      .filter((x): x is string => x !== null)
    if (bits.length) lines.push(bits.join('\n'))
  }
  const hs = obj(o.handShape)
  const hst = hs ? str(hs.type) : undefined
  if (hst) lines.push(`손 형태: ${hst}`)
  return lines.length > 0 ? lines.join('\n') : '손금 요약 없음'
}

function buildSamhapPrompt(inputs: SamhapInputs, saju: SajuBasic): string {
  const dist = saju.distribution
    ? Object.entries(saju.distribution)
        .map(([k, v]) => `${k}${v}`)
        .join(' ')
    : '미상'
  return `당신은 청담해화당의 대가 '해화지기(解化之機)'입니다. 한 사람의 사주(天)·관상·손금(人)을 하나로 꿰어 삼합(三合) 종합 리포트를 씁니다.
새로운 이미지 분석은 하지 않습니다 — 아래 이미 도출된 결과만 근거로 삼으세요.

[대상] ${inputs.targetName}${saju.age ? ` (${saju.age}세)` : ''}
[사주 기본] 일간 ${saju.dayGan ?? '미상'}${saju.dayElement ? `(${saju.dayElement}형)` : ''}, 오행 분포 ${dist}
[관상 요약]
${summarizeFace(inputs.face?.result)}
[손금 요약]
${summarizeHand(inputs.hand?.result)}

[집필 원칙 — 반드시 준수]
1. 세 근거(사주·관상·손금)가 같은 방향을 가리키는 지점을 찾아 '합치점'으로 제시하세요. 여러 근거가 일치할수록 신뢰가 높아집니다. 서로 다른 근거를 반드시 함께 엮으세요(예: "사주의 재성 + 관상의 코 + 손금의 재물선").
2. 단정·공포 금지. 긴장점은 '나쁨'이 아니라 '완급이 필요한 결'로 재구성하고, 반드시 대응 행동과 함께 제시하세요.
3. 시기는 가능하면 구체적인 연도로 특정하세요. "언젠가" 같은 모호한 표현은 피하세요.
4. 개운 처방은 오늘부터 실행 가능한 행동 + 기대 효과로. 물상론적 비유로 따뜻하게 서술하고, 마무리는 희망으로 닫으세요.

[출력 형식 — 자유 서술 뒤, 아래 태그를 정확히 포함하세요]
[[SUMMARY: 세 기운이 모이는 핵심을 한 줄로]]
[[HARMONY_1: 합치점 제목, 사주·관상·손금 근거를 함께 엮은 설명]]
[[HARMONY_2: 합치점 제목, 설명]]
[[HARMONY_3: 합치점 제목, 설명]]
[[TENSION: 긴장점 제목, 완급이 필요한 결 + 대응 행동]]
[[TIMING_1: 시기(가능하면 연도), 조언]]
[[TIMING_2: 시기, 조언]]
[[TIMING_3: 시기, 조언]]
[[REMEDY_1: 오늘부터 실행 가능한 개운 처방]]
[[REMEDY_2: 개운 처방]]
[[REMEDY_3: 개운 처방]]

※ 의학·투자·법률 단정 조언 금지. 전문 용어는 괄호 안에 쉬운 풀이를 덧붙이세요.`
}

// ─── 공개 액션 ─────────────────────────────────────────────────────────────

/**
 * 삼합 요건 점검(관상·손금 이력 + 생년월일). 차감 없음 — 페이지에서 안내용.
 * targetId 미지정 시 본인 기준. RLS: 본인 소유 데이터만.
 */
export async function getSamhapReadiness(targetId?: string): Promise<SamhapReadiness> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      ready: false,
      hasFace: false,
      hasHand: false,
      hasBirth: false,
      faceScore: null,
      handScore: null,
      targetName: '본인',
    }
  }
  const inputs = await gatherSamhapInputs(supabase, user.id, targetId)
  const hasFace = !!inputs.face
  const hasHand = !!inputs.hand
  const hasBirth = !!inputs.birthDate
  return {
    ready: hasFace && hasHand && hasBirth,
    hasFace,
    hasHand,
    hasBirth,
    faceScore: inputs.face?.score ?? null,
    handScore: inputs.hand?.score ?? null,
    targetName: inputs.targetName,
  }
}

/**
 * 삼합 종합 리포트 생성 — 저장된 관상·손금 + 사주 기본 재활용, Gemini 텍스트 1콜(새 이미지 없음).
 * 요건 미달이면 차감 없이 반환. 차감 후 AI 실패 시 환불(1차 패턴). 파싱 실패해도 원문 폴백.
 */
export async function generateSamhapReport(targetId?: string): Promise<SamhapResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.', errorType: 'AUTH' }

  const inputs = await gatherSamhapInputs(supabase, user.id, targetId)
  if (!inputs.face || !inputs.hand || !inputs.birthDate) {
    return {
      success: false,
      error: '삼합 리포트에는 관상·손금 분석과 생년월일이 모두 필요합니다.',
      errorType: 'REQUIREMENTS',
    }
  }

  // 차감 (요건 충족 확인 후에만)
  const deduct = await deductTalisman('SAMHAP', SAMHAP_COST)
  if (!deduct.success) {
    return { success: false, error: deduct.error || '복채가 부족합니다.', errorType: 'DEDUCT' }
  }

  try {
    const saju = await resolveSaju(inputs)
    const prompt = buildSamhapPrompt(inputs, saju)
    const model = genAI.getGenerativeModel({ model: MODEL_PRO })
    const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
      model: MODEL_PRO,
      actionType: 'samhap',
    })
    const raw = result.response.text()
    const parsed = parseSamhap(raw)
    const empty = isSamhapEmpty(parsed)

    const score = Math.round(((inputs.face.score ?? 60) + (inputs.hand.score ?? 60)) / 2)

    await addBokPoints(30, 'ANALYSIS', undefined, '삼합 종합 리포트').catch(() => {})

    const samhapResult: SamhapResult = {
      success: true,
      parsed: empty ? undefined : parsed,
      raw,
      score,
      targetName: inputs.targetName,
    }

    await saveAnalysisHistoryObserved(
      {
        target_id: targetId ?? user.id,
        target_name: inputs.targetName,
        target_relation: inputs.targetRelation,
        category: 'SAMHAP',
        context_mode: 'GENERAL',
        result_json: samhapResult,
        summary: parsed.summary || '삼합 종합 리포트',
        score,
        model_used: MODEL_PRO,
        talisman_cost: SAMHAP_COST,
      },
      { source: 'samhap' }
    )

    return samhapResult
  } catch (e) {
    logger.error('[generateSamhapReport] AI 실패:', e)
    const refund = await refundStudioCost('SAMHAP')
    return {
      success: false,
      error: refund.refunded
        ? '복채는 돌려드렸습니다. 잠시 후 다시 시도해주세요.'
        : '삼합 분석 중 오류가 발생했습니다.',
      errorType: 'AI',
    }
  }
}
