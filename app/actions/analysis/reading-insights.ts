'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import {
  buildFamilyResemblance,
  type PartAssessments,
  type FamilyResemblance,
  type FaceResemblanceKey,
} from '@/lib/domain/analysis/family-resemblance'
import type { Assessment } from '@/lib/domain/analysis/feature-parse'

const DAY_MS = 86_400_000
const ASSESSMENTS: readonly string[] = ['좋음', '보통', '주의']
const PART_KEYS: FaceResemblanceKey[] = ['forehead', 'eyes', 'nose', 'mouth', 'ears', 'chin']

function asAssessment(v: unknown): Assessment | undefined {
  return typeof v === 'string' && ASSESSMENTS.includes(v) ? (v as Assessment) : undefined
}

/** result_json.partAnalysis[key].assessment 를 안전 추출. */
function extractParts(resultJson: unknown): PartAssessments {
  const parts: PartAssessments = {}
  if (!resultJson || typeof resultJson !== 'object') return parts
  const pa = (resultJson as Record<string, unknown>).partAnalysis
  if (!pa || typeof pa !== 'object') return parts
  for (const k of PART_KEYS) {
    const entry = (pa as Record<string, unknown>)[k]
    if (entry && typeof entry === 'object') {
      const a = asAssessment((entry as Record<string, unknown>).assessment)
      if (a) parts[k] = a
    }
  }
  return parts
}

function extractGisaek(resultJson: unknown): string | undefined {
  if (!resultJson || typeof resultJson !== 'object') return undefined
  const g = (resultJson as Record<string, unknown>).gisaekReading
  return typeof g === 'string' && g.trim().length > 0 ? g.trim() : undefined
}

interface FaceMetaRow {
  id: string
  score: number | null
  created_at: string
  result_json: unknown
}

export interface LatestFaceMeta {
  id: string
  score: number | null
  createdAt: string
  /** 측정 후 경과 일수 */
  daysSince: number
  gisaek?: string
}

/**
 * 특정 대상(없으면 본인)의 최신 FACE 이력 메타를 조회한다(B-2 재측정 배너/비교용).
 * RLS 준수: 본인(user_id) 소유 데이터만. 없으면 null.
 */
export async function getLatestFaceMeta(targetId?: string): Promise<LatestFaceMeta | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const target = targetId ?? user.id
  const { data, error } = await supabase
    .from('analysis_history')
    .select('id, score, created_at, result_json')
    .eq('user_id', user.id)
    .eq('category', 'FACE')
    .eq('target_id', target)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('[getLatestFaceMeta] 조회 실패:', error)
    return null
  }
  if (!data) return null

  const row = data as unknown as FaceMetaRow
  const daysSince = Math.floor((Date.now() - new Date(row.created_at).getTime()) / DAY_MS)
  return {
    id: row.id,
    score: row.score ?? null,
    createdAt: row.created_at,
    daysSince,
    gisaek: extractGisaek(row.result_json),
  }
}

interface CounterpartRow {
  target_id: string | null
  target_name: string | null
  target_relation: string | null
  result_json: unknown
}

export type FamilyResemblanceResult = FamilyResemblance & { otherLabel: string }

/**
 * 가족 닮은꼴 리포트(B-3, AI 호출 없음).
 * - 현재 분석 대상이 본인이면 상대 = 가장 최근 FACE 를 남긴 가족,
 *   현재 대상이 가족이면 상대 = 본인.
 * - 상대 이력은 같은 user_id 소유 데이터만 조회(RLS). 상대가 없거나 공통 부위가 부족하면 null.
 */
export async function getFamilyResemblance(input: {
  currentTargetId?: string
  currentParts: PartAssessments
}): Promise<FamilyResemblanceResult | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const currentTarget = input.currentTargetId ?? user.id
  const isSelfCurrent = currentTarget === user.id

  let query = supabase
    .from('analysis_history')
    .select('target_id, target_name, target_relation, result_json')
    .eq('user_id', user.id)
    .eq('category', 'FACE')
    .order('created_at', { ascending: false })
    .limit(1)

  query = isSelfCurrent ? query.neq('target_id', user.id) : query.eq('target_id', user.id)

  const { data, error } = await query.maybeSingle()
  if (error) {
    logger.error('[getFamilyResemblance] 상대 이력 조회 실패:', error)
    return null
  }
  if (!data) return null

  const row = data as unknown as CounterpartRow
  const otherParts = extractParts(row.result_json)
  const otherLabel = isSelfCurrent ? row.target_relation?.trim() || row.target_name?.trim() || '가족' : '본인'

  const resemblance = buildFamilyResemblance(input.currentParts, otherParts, otherLabel)
  if (!resemblance) return null
  return { ...resemblance, otherLabel }
}
