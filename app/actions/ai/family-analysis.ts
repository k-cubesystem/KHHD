'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface FamilyMemberWithAnalysis {
  id: string
  name: string
  relationship: string
  birth_date: string
  birth_time: string | null
  calendar_type: string
  gender: string
  face_image_url: string | null
  last_analysis_date: string | null
  last_analysis_summary: string | null
  last_analysis_score: number | null
  last_analysis_category: string | null
  total_analysis_count: number
}

/**
 * 가족 목록과 각 구성원의 최근 분석 요약을 함께 조회합니다.
 * (DB RPC: get_family_with_analysis_summary 사용)
 */
export async function getFamilyWithAnalysisSummary(): Promise<FamilyMemberWithAnalysis[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Demo Mode for unauthorized users (or just return empty)
    logger.warn('Unauthorized access to getFamilyWithAnalysisSummary. Returning demo data.')
    return []
  }

  try {
    // 1. Try Optimized RPC Call
    const { data, error } = await supabase.rpc('get_family_with_analysis_summary', {
      user_id_param: user.id,
    })

    if (error) {
      // Function mismatch or missing implies migration not run
      logger.warn('RPC fetch failed (likely migration missing), using fallback:', error.message)
      throw error
    }

    return data as FamilyMemberWithAnalysis[]
  } catch (e) {
    // 2. Fallback: Standard Select (No Analysis Summary)
    const { data: members, error: fallbackError } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (fallbackError) {
      logger.error('Critical: Failed to fetch family members even with fallback:', fallbackError)
      throw new Error('가족 정보를 불러올 수 없습니다.')
    }

    // Map to expected structure with nulls
    return (members || []).map((m) => ({
      ...m,
      last_analysis_date: null,
      last_analysis_summary: null,
      last_analysis_score: null,
      last_analysis_category: null,
      total_analysis_count: 0,
    }))
  }
}
