'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { getModelConfig } from '@/lib/config/ai-models'
import { generateAIContent } from '@/lib/services/ai-client'
import { deductTalisman, refundStudioCost } from '@/app/actions/payment/wallet'
import { addBokPoints } from '@/lib/services/bok-grant'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { saveAnalysisHistoryObserved } from '@/app/actions/user/history'
import { parseSamhap, isSamhapEmpty, type SamhapParsed } from '@/lib/domain/analysis/samhap-parse'
import { computeSamhapCoherence, type SamhapCoherence } from '@/lib/domain/analysis/samhap-coherence'
import { buildSystemPrompt, buildUserPrompt, type SajuBlock } from '@/lib/domain/analysis/samhap-prompt'

const SAMHAP_COST = FEATURE_COST.samhap.display // 5만냥 (표시=실차감)

// ─── 타입 ──────────────────────────────────────────────────────────────────

export interface SamhapReadiness {
  ready: boolean
  hasFace: boolean
  hasHand: boolean
  hasFengshui: boolean
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
  /** 삼재 정합도(오행 교차 판정). 관상 오행형 미확인 시 관상·손금 평균 폴백. */
  score?: number
  /** 정합도 판정 근거 — v2. 구 리포트엔 없다(재열람 시 optional 가드 필수). */
  coherence?: SamhapCoherence
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
  category: 'FACE' | 'HAND' | 'FENGSHUI',
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
  fengshui: ReadingRow | null
  birthDate: string | null
  birthTime: string | null
  calendarType: string | null
  isLeapMonth: boolean
  gender: 'male' | 'female'
  targetName: string
  targetRelation: string
}

/** 종합사주풀이 입력(관상·손금·풍수 이력 + 생년월일·성별)을 대상(본인/가족)별로 모은다. RLS: 본인 소유만. */
async function gatherSamhapInputs(supabase: SupabaseClient, userId: string, targetId?: string): Promise<SamhapInputs> {
  const effectiveTarget = targetId ?? userId
  const [face, hand, fengshui] = await Promise.all([
    latestReading(supabase, userId, 'FACE', effectiveTarget),
    latestReading(supabase, userId, 'HAND', effectiveTarget),
    latestReading(supabase, userId, 'FENGSHUI', effectiveTarget),
  ])

  let birthDate: string | null = null
  let birthTime: string | null = null
  let calendarType: string | null = null
  let isLeapMonth = false
  let gender: 'male' | 'female' = 'male'
  let targetName = '본인'
  let targetRelation = '본인'

  if (targetId) {
    const { data } = await supabase
      .from('family_members')
      .select('name, relationship, birth_date, birth_time, calendar_type, gender')
      .eq('id', targetId)
      .eq('user_id', userId)
      .maybeSingle()
    birthDate = data?.birth_date ?? null
    birthTime = data?.birth_time ?? null
    calendarType = data?.calendar_type ?? null
    gender = data?.gender === 'female' ? 'female' : 'male'
    targetName = data?.name ?? '가족'
    targetRelation = data?.relationship ?? '가족'
  } else {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, birth_date, birth_time, calendar_type, is_leap_month, gender')
      .eq('id', userId)
      .maybeSingle()
    birthDate = data?.birth_date ?? null
    birthTime = data?.birth_time ?? null
    calendarType = data?.calendar_type ?? null
    isLeapMonth = data?.is_leap_month ?? false
    gender = data?.gender === 'female' ? 'female' : 'male'
    targetName = data?.full_name ?? '본인'
  }

  return { face, hand, fengshui, birthDate, birthTime, calendarType, isLeapMonth, gender, targetName, targetRelation }
}

/**
 * 사주 층(天) — 마스터 엔진 풀 컨텍스트를 우선 사용하고, 엔진 실패 시 기본 명식으로 폴백.
 * v1은 일간·오행분포 4필드만 썼다 — 종합 리포트가 사주를 제일 얕게 보는 역설의 원인(PLAN §1).
 */
async function buildSajuBlock(inputs: SamhapInputs): Promise<SajuBlock> {
  if (!inputs.birthDate) return { contextText: '생년월일 미상 — 명식 계산 불가' }
  const { calculateAge } = await import('@/lib/domain/saju/saju')
  const { isSolarCalendar } = await import('@/lib/domain/saju/calendar')
  const age = calculateAge(inputs.birthDate)
  const isSolar = isSolarCalendar(inputs.calendarType)

  try {
    const { buildSajuContext } = await import('@/lib/saju-engine/context-builder')
    const ctx = buildSajuContext({
      name: inputs.targetName,
      birthDate: inputs.birthDate,
      birthTime: inputs.birthTime || '12:00',
      gender: inputs.gender,
      isSolar,
      isLeapMonth: inputs.isLeapMonth,
      birthTimeUnknown: !inputs.birthTime,
    })
    const jobHints = [...new Set([...(ctx.mulsang.dayMasterJobs ?? []), ...(ctx.mulsang.iljuCareer ?? [])])]
    const { buildRemedySet, remedyPromptBlock } = await import('@/lib/domain/remedy/remedy')
    const remedy = buildRemedySet(ctx)
    return {
      remedyBlock: remedyPromptBlock(remedy),
      remedyCount: remedy.items.length,
      contextText: ctx.promptContext,
      age,
      dayElement: ctx.sajuData.dayMasterElement,
      yongsinElement: ctx.analysis.advancedYongsin?.finalYongsin ?? undefined,
      dayMasterPoetic: ctx.mulsang.dayMasterPoetic || undefined,
      jobHints: jobHints.length > 0 ? jobHints : undefined,
      lovePattern: ctx.mulsang.iljuLovePattern || undefined,
    }
  } catch (e) {
    logger.warn('[samhap] 마스터 엔진 실패 — 기본 명식 폴백:', e)
    try {
      const { getSajuData } = await import('@/lib/domain/saju/saju')
      const s = getSajuData(inputs.birthDate, inputs.birthTime || '12:00', isSolar, inputs.isLeapMonth)
      const dist = Object.entries(s.elementsDistribution)
        .map(([k, v]) => `${k}${v}`)
        .join(' ')
      return {
        contextText: `[기본 명식] 일간 ${s.dayGan}(${s.dayMasterElement}), 오행 분포 ${dist}`,
        age,
        dayElement: s.dayMasterElement,
      }
    } catch (e2) {
      logger.warn('[samhap] 사주 컨텍스트 생략:', e2)
      return { contextText: '명식 계산 불가' }
    }
  }
}

/**
 * 관상 층(相) v2 — 평가문장 클립 나열이 아니라 교차에 필요한 구조를 그대로 전달:
 * 오행형(personalityType)·삼정 흐름(ageFortuneFlow)·기색·부위별 평가+설명.
 */
function summarizeFace(row: ReadingRow | null): { text: string; personalityType?: string } {
  const o = obj(row?.result)
  if (!o) return { text: '관상 데이터 없음' }
  const lines: string[] = []

  const pt = str(o.personalityType)
  if (pt) lines.push(`오행형: ${pt}`)
  if (typeof row?.score === 'number') lines.push(`관상 점수: ${row.score}점`)
  const fi = str(o.firstImpression)
  if (fi) lines.push(`첫인상: ${clip(fi, 160)}`)
  const g = str(o.gisaekReading)
  if (g) lines.push(`기색(氣色): ${clip(g, 140)}`)

  const aff = obj(o.ageFortuneFlow)
  if (aff) {
    const zones: Array<[string, string]> = [
      ['youth', '초년(상정)'],
      ['middle', '중년(중정)'],
      ['senior', '말년(하정)'],
    ]
    const bits = zones
      .map(([k, label]) => {
        const t = str(aff[k])
        return t ? `${label}: ${clip(t, 150)}` : null
      })
      .filter((x): x is string => x !== null)
    if (bits.length) lines.push(`삼정(三停) 흐름:\n${bits.join('\n')}`)
  }

  const pa = obj(o.partAnalysis)
  if (pa) {
    const meta: Array<[string, string]> = [
      ['forehead', '이마(관록궁)'],
      ['eyes', '눈(감찰관)'],
      ['nose', '코(재백궁)'],
      ['mouth', '입(출납관)'],
      ['ears', '귀(채청관)'],
      ['chin', '턱(지각)'],
    ]
    const bits = meta
      .map(([k, label]) => {
        const e = obj(pa[k])
        if (!e) return null
        const a = str(e.assessment)
        const d = str(e.description)
        const body = [a, d ? clip(d, 180) : null].filter(Boolean).join(' — ')
        return body ? `- ${label}: ${body}` : null
      })
      .filter((x): x is string => x !== null)
    if (bits.length) lines.push(`부위별(궁위):\n${bits.join('\n')}`)
  }

  return { text: lines.length > 0 ? lines.join('\n') : '관상 요약 없음', personalityType: pt }
}

/** 손금 층(紋) v2 — 선별 평가+설명, 사대선 중심 + 종합운·손 형태. */
function summarizeHand(row: ReadingRow | null): string {
  const o = obj(row?.result)
  if (!o) return '손금 데이터 없음'
  const lines: string[] = []
  if (typeof row?.score === 'number') lines.push(`손금 점수: ${row.score}점`)

  const pl = obj(o.palmLines)
  if (pl) {
    const meta: Array<[string, string]> = [
      ['lifeLine', '생명선(건강·바탕)'],
      ['intelligenceLine', '두뇌선(사고·재능)'],
      ['emotionLine', '감정선(정·인연)'],
      ['fateLine', '운명선(일·행로)'],
      ['sunLine', '태양선(명예·결실)'],
      ['marriageLine', '결혼선(배연)'],
    ]
    const bits = meta
      .map(([k, label]) => {
        const e = obj(pl[k])
        if (!e) return null
        const a = str(e.assessment)
        const d = str(e.description)
        const body = [a, d ? clip(d, 180) : null].filter(Boolean).join(' — ')
        return body ? `- ${label}: ${body}` : null
      })
      .filter((x): x is string => x !== null)
    if (bits.length) lines.push(`선별 판독:\n${bits.join('\n')}`)
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
        return t ? `${label}: ${clip(t, 150)}` : null
      })
      .filter((x): x is string => x !== null)
    if (bits.length) lines.push(`종합운:\n${bits.join('\n')}`)
  }

  const hs = obj(o.handShape)
  const hst = hs ? str(hs.type) : undefined
  const hsp = hs ? str(hs.personality) : undefined
  if (hst) lines.push(`손 형태: ${hst}${hsp ? ` — ${clip(hsp, 100)}` : ''}`)

  return lines.length > 0 ? lines.join('\n') : '손금 요약 없음'
}

/** 풍수 층(地) — 지배오행은 정합도 계산에도 쓰이므로 함께 반환. */
function summarizeFengshui(row: ReadingRow | null): { text: string; dominantElement?: string } {
  const o = obj(row?.result)
  if (!o) return { text: '풍수 데이터 없음' }
  const lines: string[] = []
  const subjectType = str(o.subjectType)
  const roomType = str(o.roomType)
  const label =
    subjectType === 'exterior' ? '집·건물 외관' : subjectType === 'office' ? '사무실·가게' : roomType || '실내 공간'
  lines.push(`분석 대상: ${label}`)
  const facing = str(o.facing)
  if (facing && facing !== '모름') lines.push(`실측 좌향: ${facing}향`)
  const de = str(o.dominantElement)
  if (de) lines.push(`지배 오행: ${de}`)
  const ld = str(o.luckyDirection)
  if (ld) lines.push(`길한 방위: ${ld}`)
  const ss = obj(o.spaceScore)
  if (ss) {
    const cur = typeof ss.current === 'number' ? ss.current : undefined
    const pot = typeof ss.potential === 'number' ? ss.potential : undefined
    if (cur !== undefined) lines.push(`공간 점수: 현재 ${cur}${pot !== undefined ? ` → 잠재 ${pot}` : ''}`)
    const desc = str(ss.description)
    if (desc) lines.push(`총평: ${clip(desc, 140)}`)
  }
  const problems = Array.isArray(o.problems) ? o.problems.filter((p): p is string => typeof p === 'string') : []
  if (problems.length) lines.push(`주요 문제점: ${problems.slice(0, 3).join(', ')}`)
  return { text: lines.length > 0 ? lines.join('\n') : '풍수 요약 없음', dominantElement: de }
}

// 프롬프트 조립은 도메인 모듈로 옮겼다 — 'use server' 는 async export 만 허용해 테스트가 불가능했다.
// → lib/domain/analysis/samhap-prompt.ts

// ─── 공개 액션 ─────────────────────────────────────────────────────────────

/**
 * 종합사주풀이 요건 점검(관상·손금·풍수 이력 + 생년월일). 차감 없음 — 페이지에서 안내용.
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
      hasFengshui: false,
      hasBirth: false,
      faceScore: null,
      handScore: null,
      targetName: '본인',
    }
  }
  const inputs = await gatherSamhapInputs(supabase, user.id, targetId)
  const hasFace = !!inputs.face
  const hasHand = !!inputs.hand
  const hasFengshui = !!inputs.fengshui
  const hasBirth = !!inputs.birthDate
  return {
    ready: hasFace && hasHand && hasFengshui && hasBirth,
    hasFace,
    hasHand,
    hasFengshui,
    hasBirth,
    faceScore: inputs.face?.score ?? null,
    handScore: inputs.hand?.score ?? null,
    targetName: inputs.targetName,
  }
}

/**
 * 종합사주풀이 리포트 생성 — 삼재교차법 v2.
 * 저장된 관상·손금·풍수 + 마스터 엔진 명식 재활용, 텍스트 1콜(새 이미지 없음 — 원가 구조 보존).
 * 요건 미달이면 차감 없이 반환. 차감 후 AI 실패 시 환불(1차 패턴). 파싱 실패해도 원문 폴백.
 */
export async function generateSamhapReport(targetId?: string): Promise<SamhapResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.', errorType: 'AUTH' }

  const inputs = await gatherSamhapInputs(supabase, user.id, targetId)
  if (!inputs.face || !inputs.hand || !inputs.fengshui || !inputs.birthDate) {
    return {
      success: false,
      error: '종합사주풀이에는 관상·손금·풍수 분석과 생년월일이 모두 필요합니다.',
      errorType: 'REQUIREMENTS',
    }
  }

  // 차감 (요건 충족 확인 후에만)
  const deduct = await deductTalisman('SAMHAP', SAMHAP_COST)
  if (!deduct.success) {
    return { success: false, error: deduct.error || '복채가 부족합니다.', errorType: 'DEDUCT' }
  }

  try {
    const sajuBlock = await buildSajuBlock(inputs)
    const face = summarizeFace(inputs.face)
    const hand = summarizeHand(inputs.hand)
    const fengshui = summarizeFengshui(inputs.fengshui)

    const coherence = computeSamhapCoherence({
      dayElement: sajuBlock.dayElement,
      yongsinElement: sajuBlock.yongsinElement,
      faceForm: face.personalityType,
      fengshuiElement: fengshui.dominantElement,
    })

    const aiResult = await generateAIContent({
      featureKey: 'samhap',
      systemPrompt: buildSystemPrompt(sajuBlock),
      userPrompt: buildUserPrompt(inputs, sajuBlock, face, hand, fengshui, coherence),
      // 3배 상세화(2026-08-15) — 출력이 약 9,000 토큰까지 늘어난다. 추론 토큰이 같은 예산을
      // 먹으므로 여유를 둔다(모자라면 응답이 조용히 잘리고 파서가 빈 리포트를 낸다).
      maxTokens: 24576,
      temperature: 0.8,
      actionType: 'samhap',
      userId: user.id,
    })
    const raw = aiResult.text
    const parsed = parseSamhap(raw)
    const empty = isSamhapEmpty(parsed)

    // 점수 = 삼재 정합도(오행 교차 판정). 오행형 미확인 시 기존 관상·손금 평균 폴백.
    const score = coherence?.score ?? Math.round(((inputs.face.score ?? 60) + (inputs.hand.score ?? 60)) / 2)

    await addBokPoints(30, 'ANALYSIS', undefined, '종합사주풀이 리포트').catch(() => {})

    const samhapResult: SamhapResult = {
      success: true,
      parsed: empty ? undefined : parsed,
      raw,
      score,
      coherence: coherence ?? undefined,
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
        summary: parsed.summary || '종합사주풀이 리포트',
        score,
        model_used: getModelConfig('samhap').model,
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
        : '종합사주풀이 분석 중 오류가 발생했습니다.',
      errorType: 'AI',
    }
  }
}
