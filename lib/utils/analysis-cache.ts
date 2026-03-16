/**
 * Gemini API 분석 캐시 유틸리티
 *
 * 동일한 사용자 + 대상 + 분석 유형의 최근 결과를 analysis_history 테이블에서
 * 재사용함으로써 불필요한 Gemini API 호출을 방지합니다.
 *
 * 사용 방법:
 *   const cached = await getCachedAnalysis(userId, memberId, 'SAJU')
 *   if (cached) return { success: true, ...cached.result_json, cached: true }
 *   // ... Gemini 호출 ...
 */

import { createClient } from '@/lib/supabase/server'
import type { AnalysisCategory } from '@/app/actions/user/history'

/**
 * 캐시 유효 시간 설정 (분석 유형별, 단위: 시간)
 * - SAJU/FACE/HAND/FENGSHUI: 24시간 (사주 데이터는 바뀌지 않으므로)
 * - TODAY: 24시간 (오늘 운세는 하루에 한 번)
 * - COMPATIBILITY: 24시간
 * - WEALTH/NEW_YEAR: 72시간 (재물운/신년운은 3일 유지)
 */
export const CACHE_TTL_HOURS: Record<AnalysisCategory, number> = {
  SAJU: 24,
  FACE: 24,
  HAND: 24,
  FENGSHUI: 24,
  TODAY: 24,
  COMPATIBILITY: 24,
  WEALTH: 72,
  NEW_YEAR: 72,
}

export interface CachedAnalysisRecord {
  id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result_json: Record<string, any>
  summary: string | null
  score: number | null
  created_at: string
  category: AnalysisCategory
}

/**
 * 캐시 레코드의 유효성을 확인합니다.
 *
 * @param record - analysis_history 레코드
 * @param ttlHours - 유효 시간 (시간 단위, 기본 24시간)
 * @returns 캐시가 아직 유효하면 true
 */
export function isCacheValid(record: { created_at: string }, ttlHours: number = 24): boolean {
  const createdAt = new Date(record.created_at)
  const now = new Date()
  const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  return diffHours < ttlHours
}

/**
 * analysis_history 테이블에서 최근 캐시를 조회합니다.
 *
 * @param userId - 현재 로그인한 사용자 ID
 * @param targetId - 분석 대상의 family_member 또는 destiny_target ID (null이면 userId로 대체)
 * @param category - 분석 유형 (예: 'SAJU', 'TODAY')
 * @param ttlHoursOverride - 기본 TTL을 덮어쓸 시간 값 (선택)
 * @returns 캐시 레코드 또는 null (캐시 없음 / 만료)
 */
export async function getCachedAnalysis(
  userId: string,
  targetId: string | null,
  category: AnalysisCategory,
  ttlHoursOverride?: number
): Promise<CachedAnalysisRecord | null> {
  try {
    const supabase = await createClient()
    const ttlHours = ttlHoursOverride ?? CACHE_TTL_HOURS[category] ?? 24
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - ttlHours)

    // target_id가 있으면 target 기준으로, 없으면 user_id 기준으로 조회
    let query = supabase
      .from('analysis_history')
      .select('id, result_json, summary, score, created_at, category')
      .eq('user_id', userId)
      .eq('category', category)
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (targetId) {
      query = query.eq('target_id', targetId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.warn('[AnalysisCache] 캐시 조회 오류 (무시됨):', error.message)
      return null
    }

    if (!data?.result_json) return null

    return data as CachedAnalysisRecord
  } catch (err) {
    // 캐시 조회 실패는 치명적이지 않으므로 null을 반환하여 정상 분석 진행
    console.warn('[AnalysisCache] 예외 발생 (무시됨):', err)
    return null
  }
}

/**
 * 캐시 조회의 편의 래퍼: user_id를 자동으로 현재 세션에서 가져옵니다.
 * AI 액션 내부에서 이미 user를 가지고 있다면 getCachedAnalysis를 직접 사용하세요.
 *
 * @param targetId - 분석 대상 ID
 * @param category - 분석 유형
 * @param ttlHoursOverride - 선택적 TTL 덮어쓰기
 * @returns 캐시 레코드 또는 null
 */
export async function getCachedAnalysisForCurrentUser(
  targetId: string | null,
  category: AnalysisCategory,
  ttlHoursOverride?: number
): Promise<CachedAnalysisRecord | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    return getCachedAnalysis(user.id, targetId, category, ttlHoursOverride)
  } catch {
    return null
  }
}
