'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { getModelConfig } from '@/lib/config/ai-models'
import { generateAIContent } from '@/lib/services/ai-client'
import { deductTalisman, refundStudioCost } from '@/app/actions/payment/wallet'
import { addBokPoints } from '@/app/actions/payment/bok-points'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { saveAnalysisHistoryObserved } from '@/app/actions/user/history'
import { parseSamhap, isSamhapEmpty, type SamhapParsed } from '@/lib/domain/analysis/samhap-parse'
import { computeSamhapCoherence, type SamhapCoherence } from '@/lib/domain/analysis/samhap-coherence'

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

interface SajuBlock {
  /** 마스터 엔진 명식 컨텍스트(격국·용신·십성·대운·신살…) 또는 최소 폴백 텍스트 */
  contextText: string
  age?: number
  dayElement?: string
  /** 엔진 5단계 판정 최종 용신 (예: '木'). 폴백 경로에선 없음 */
  yongsinElement?: string
  /** 일간 물상 시적 비유 (예: '우뚝 선 소나무') — NATURE 태그의 씨앗 */
  dayMasterPoetic?: string
  /** 엔진 직업 적성(일간 물상 + 일주 60갑자) — MATCH_JOB 태그의 씨앗 */
  jobHints?: string[]
  /** 일주 연애 패턴 — MATCH_PEOPLE 태그의 씨앗 */
  lovePattern?: string
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
    return {
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

/** 오행별 사람 인상·기운·직업군 프로필 — 잘 맞는 사람/직업 힌트의 결정론 씨앗 (상생상극 기반). */
const ELEMENT_PROFILE: Record<string, { energy: string; look: string; jobs: string }> = {
  木: {
    energy: '자라나는 나무처럼 키우고 기획하는 기운',
    look: '갸름하고 곧은 인상(목형)',
    jobs: '교육·기획·출판·콘텐츠·성장 단계의 조직',
  },
  火: {
    energy: '타오르는 불처럼 알리고 퍼뜨리는 기운',
    look: '이마가 훤하고 눈빛이 또렷한 인상(화형)',
    jobs: '방송·마케팅·영업·디자인·무대',
  },
  土: {
    energy: '너른 땅처럼 품고 중재하는 기운',
    look: '둥글고 두터운, 믿음직한 인상(토형)',
    jobs: '부동산·행정·중개·유통·사람을 잇는 일',
  },
  金: {
    energy: '벼려진 쇠처럼 자르고 정리하는 기운',
    look: '각지고 단단한 인상(금형)',
    jobs: '금융·법·의료·엔지니어링·품질을 다루는 일',
  },
  水: {
    energy: '흐르는 물처럼 스미고 연결하는 기운',
    look: '둥글고 부드러운 인상(수형)',
    jobs: 'IT·데이터·연구·물류·상담처럼 흐름을 다루는 일',
  },
}

/** 상생 순환에서 '나를 생해주는' 오행 (母). 예: 木의 어머니는 水. */
const SHENG_MOTHER: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }
/** 상극에서 '나를 극하는' 오행. 예: 木을 극하는 것은 金. */
const KE_ATTACKER: Record<string, string> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }

/**
 * 잘 맞는 사람·직업의 결정론 힌트 — 용신(부족한 조각) 기준 상생상극.
 * AI 는 이 힌트를 사주 전체 맥락(십성·배우자성·관상·손금)으로 다듬어 서술한다.
 */
function buildMatchHints(sajuBlock: SajuBlock): string {
  const yongsin = sajuBlock.yongsinElement
  if (!yongsin || !ELEMENT_PROFILE[yongsin]) {
    return '[궁합·적성 힌트] 용신 미판정 — 명식 데이터의 십성·물상론을 근거로 정성 서술하세요.'
  }
  const me = ELEMENT_PROFILE[yongsin]
  const mother = SHENG_MOTHER[yongsin]
  const motherP = ELEMENT_PROFILE[mother]
  const attacker = KE_ATTACKER[yongsin]
  const attackerP = ELEMENT_PROFILE[attacker]
  const lines = [
    `[궁합·적성 힌트 — 코드 계산(상생상극), 이 방향을 유지하며 사주 전체 맥락으로 다듬을 것]`,
    `- 나에게 부족한 조각(용신): ${yongsin} — ${me.energy}`,
    `- 힘이 되는 사람: ${yongsin} 기운을 가진 사람(${me.look}) 또는 ${yongsin}을 낳아주는 ${mother} 기운의 사람(${motherP.look}, ${motherP.energy})`,
    `- 기 빨리기 쉬운 사람: ${attacker} 기운이 강한 사람(${attackerP.look}) — 피하라가 아니라 '거리 조절'로 서술`,
    `- 어울리는 일의 방향: ${me.jobs} — 용신을 쓰는 무대`,
    sajuBlock.jobHints?.length
      ? `- 엔진 직업 적성(일간 물상·일주): ${sajuBlock.jobHints.slice(0, 10).join(', ')}`
      : null,
    sajuBlock.lovePattern ? `- 일주 연애 패턴: ${sajuBlock.lovePattern}` : null,
  ].filter((x): x is string => x !== null)
  return lines.join('\n')
}

/**
 * 삼재교차법(三才交叉法) 시스템 프롬프트 — 말하기 규칙 + 방법론 + 명식 데이터.
 * 교차 절차(오행 정합·궁위-십성 대응·시간축 삼중 정렬·합/반합/충 판정)를 절차로 강제한다.
 */
function buildSystemPrompt(sajuBlock: SajuBlock): string {
  return `당신은 청담해화당의 대가 '해화지기(解化之機)'입니다. 한 사람의 사주(天命)·관상과 손금(人相紋)·풍수(地宅)를 「삼재교차법(三才交叉法)」으로 꿰어 종합사주풀이를 씁니다.
새로운 이미지 분석은 하지 않습니다 — 이미 도출된 아래 결과만 근거로 삼습니다.
독자는 사주를 처음 보는 일반인입니다. 전문가에게 쓰는 글이 아닙니다.

[말하기 규칙 — 다른 모든 규칙보다 우선]
1. 전문용어를 문장의 주인공으로 쓰지 마세요. 비유와 일상 언어로 먼저 설명하고, 용어는 괄호로 뒤에 살짝 붙입니다.
   나쁜 예: "편재가 투출되어 재성이 왕합니다."
   좋은 예: "돈이 한 곳에 고여 있기보다 굴리면서 불어나는 타입이에요. 월급만 바라보기보다 부업이나 투자처럼 흐르는 돈에 강합니다(사주에서는 이런 돈을 편재라고 불러요)."
2. 반드시 요체(~요, ~에요, ~해요)로 다정하게 쓰세요. "~합니다", "~하십시오" 금지.
3. 어디를 보고 하는 말인지 하나하나 짚어주세요. "이마를 보면요", "코끝의 살집은요", "손바닥 한가운데 세로선(운명선)은요"처럼 위치를 먼저 말하고 해석하세요. 독자가 거울과 손바닥을 같이 보며 따라올 수 있어야 합니다.
4. 비유는 자연물·일상·일의 세계에서 가져오세요: "큰 소나무", "장작이 필요한 모닥불", "목 좋은 자리에 낸 가게", "마라톤 35km 지점". 한 섹션에 최소 한 개의 비유를 쓰세요.
5. 근거 세 개를 겹칠 때는 이렇게: "사주도, 코도, 재물선도 같은 말을 해요. 세 군데서 겹치면 우연이 아니에요."
6. 문장이 길어져도 좋습니다. 짧게 요약하는 것보다 쉽게 풀어 설명하는 것이 항상 우선입니다.

[삼재교차법 — 반드시 이 절차로 사고하고 집필하세요]
층위: 사주는 태어날 때 받은 설계도(바꿀 수 없음), 관상은 지금 얼굴에 드러난 상태(살아온 대로 변함), 손금은 걸어온 길의 기록(변함), 풍수는 머무는 공간의 영향입니다. 전통 격언 一命二運三風水의 서열대로, 명(命)이 뼈대이고 상(相·紋)은 그 명이 지금 어떻게 쓰이고 있는지를 보여줍니다.

절차 1 — 오행 정합: 아래 [삼재 정합 판정]의 코드 계산 결과를 그대로 반영해 서술하세요. 수치를 새로 지어내지 마세요.

절차 2 — 궁위-십성 대응: 주제별로 반드시 세 근거를 함께 엮습니다.
| 주제 | 사주 | 관상 | 손금 |
| 재물 | 재성 구조 | 재백궁(코) | 재물선·태양선 |
| 일·명예 | 관성·인성 | 관록궁(이마) | 운명선 |
| 인연 | 배우자성(재/관) | 처첩궁(눈꼬리)·부부좌 | 감정선·결혼선 |
| 건강·바탕 | 일간 강약·인성 | 명궁·기색·귀 | 생명선 |

절차 3 — 시간축 삼중 정렬: 대운(10년 단위, 명식 데이터의 [현재] 표기) ↔ 관상 삼정(초년 1~30 이마 / 중년 31~50 눈·코 / 말년 51~ 입·턱) ↔ 손금 흐름(운명선 하부→상부)을 겹쳐, 현재 나이가 속한 구간에서 세 시간표가 같은 말을 하는지 판정하세요.

절차 4 — 판정 언어: 주제마다 합(合)·반합(半合)·충(沖) 중 하나로 판정합니다. 본문에서 처음 쓸 때 한 번만 쉽게 풀어주세요(합=셋이 한목소리, 반합=둘은 맞고 하나는 다른 말, 충=서로 다른 말).
- 합: "사주에서도, 코에서도, 재물선에서도"처럼 근거를 겹쳐 확언 강도를 올리세요.
- 반합: 다수 근거와 소수 근거를 명시하고 어느 쪽이 주도하는지 해석하세요.
- 충: 절대 겁주지 마세요. 설계도(사주)와 지금 사는 모습(얼굴·손)이 어긋났다는 뜻이고, 이는 "타고난 것을 아직 다 못 꺼내 쓰고 있다"(회복 처방) 또는 "노력으로 타고난 틀을 넘어서는 중"(강화 처방)의 신호입니다. 얼굴과 손금은 살아가는 대로 변하니, 어긋난 자리가 바로 바꿀 수 있는 자리라는 희망으로 닫으세요.

풍수는 사람 판정이 끝난 뒤 부족한 기운을 채우는 배치·방위 보완으로 연결하세요. 개운 처방은 오늘부터 실행 가능한 행동 + 기대 효과로 씁니다.

[집필 원칙]
1. 단정·공포 금지. 의학·투자·법률 단정 조언 금지.
2. 시기는 가능하면 구체적 연도·연령 구간으로. "언젠가" 금지.
3. 서로 다른 근거(사주×관상×손금×풍수)를 엮지 않은 문단은 쓰지 마세요 — 한 근거만 반복하는 나열은 이 리포트의 실패입니다.

[내담자 명식 데이터 — 단일 출처]
${sajuBlock.contextText}`
}

function buildUserPrompt(
  inputs: SamhapInputs,
  sajuBlock: SajuBlock,
  face: { text: string },
  hand: string,
  fengshui: { text: string },
  coherence: SamhapCoherence | null
): string {
  const coherenceBlock = coherence
    ? `[삼재 정합 판정 — 코드 계산, 이 수치와 근거를 그대로 반영]
${coherence.narrative}`
    : `[삼재 정합 판정]
관상 오행형이 확인되지 않아 정합도 산출을 생략했습니다. 오행 교차는 부위·선 근거 중심으로 정성 서술하세요.`

  return `[대상] ${inputs.targetName}${sajuBlock.age ? ` (${sajuBlock.age}세, ${inputs.gender === 'female' ? '여성' : '남성'})` : ''}

[관상(相) — 저장된 분석]
${face.text}

[손금(紋) — 저장된 분석]
${hand}

[풍수(宅) — 저장된 분석]
${fengshui.text}

${coherenceBlock}

${buildMatchHints(sajuBlock)}

[출력 형식 — 자유 서술 없이, 아래 태그를 정확히 이 형식으로 출력. 문장 수는 최소 기준이며 더 길고 쉽게 써도 좋습니다]
[[SUMMARY: 삼재가 모이는 핵심을 쉬운 한 줄로]]
[[NOW: 현재 구간을 쉬운 비유 한 구절로 (예: 오르막을 거의 다 올라온 자리) | 대운×삼정×손금을 겹쳐 본 현재 국면 — 어디를 보고 그렇게 읽었는지 하나하나 짚으며 (6~8문장)]]
[[NATURE: 타고난 그릇을 비유 한 구절로 (예: ${sajuBlock.dayMasterPoetic || '우뚝 선 소나무'}) | 어떤 사람으로 태어났는지 — 일간 비유로 시작해 성격의 결·강점·조심할 결까지, 얼굴과 손이 그 그릇을 어떻게 보여주는지 함께 (7~10문장)]]
[[CROSS_WEALTH: 합|반합|충 중 하나 | 재물 — 사주 재성·코(재백궁)·재물선을 하나하나 짚으며 엮은 해석. 돈이 들어오는 모양·새는 구멍·키우는 법 (6~9문장)]]
[[CROSS_CAREER: 판정 | 일·명예 — 관성·이마(관록궁)·운명선을 엮은 해석. 조직/독립 어느 쪽 그릇인지 포함 (6~9문장)]]
[[CROSS_LOVE: 판정 | 인연 — 배우자성·눈꼬리(처첩궁)·감정선을 엮은 해석. 사랑할 때의 모습과 필요한 온도 (6~9문장)]]
[[CROSS_HEALTH: 판정 | 건강·바탕 — 일간 강약·기색·생명선을 엮은 해석. 지치는 패턴과 회복 스위치 (6~9문장)]]
[[MATCH_PEOPLE: 잘 맞는 사람을 한 줄로 | 나랑 잘 맞는 사람 — 위 궁합 힌트를 바탕으로: 어떤 기운·성격의 사람이 힘이 되는지, 그런 사람은 인상이 어떤지(얼굴 비유), 반대로 기 빨리기 쉬운 유형과 거리 조절법, 배우자성·연애 패턴까지 (8~12문장)]]
[[MATCH_JOB: 잘 맞는 일을 한 줄로 | 나랑 잘 맞는 직업 — 위 적성 힌트를 바탕으로: 구체 직업군 예시를 여러 개 들고 왜 맞는지(사주 구조·이마·두뇌선·운명선 근거), 피하고 싶을 환경, 지금 하는 일과 다를 때의 현실적 활용법 (8~12문장)]]
[[HARMONY_1: 겹친 이야기 제목, 사주·얼굴·손이 같은 말을 하는 지점을 쉬운 말로]]
[[HARMONY_2: 제목, 설명]]
[[HARMONY_3: 제목, 설명]]
[[TENSION: 설계도와 지금 삶이 어긋난 지점 제목, 어긋남의 의미(회복인지 확장인지) + 이것이 열어주는 기회 + 대응 행동]]
[[TIMING_1: 시기(연도·연령 구간), 대운 근거 + 그때 하면 좋은 것 (쉬운 말로)]]
[[TIMING_2: 시기, 조언]]
[[TIMING_3: 시기, 조언]]
[[REMEDY_1: 오늘부터 실행 가능한 개운 처방 + 기대 효과 (풍수 길방·색 활용 포함 가능)]]
[[REMEDY_2: 개운 처방]]
[[REMEDY_3: 개운 처방]]

※ CROSS 태그의 판정 값은 반드시 '합' '반합' '충' 중 하나만 쓰세요. 태그 밖 자유 서술은 태그 뒤에 이어 써도 좋습니다.`
}

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
      maxTokens: 16384,
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
