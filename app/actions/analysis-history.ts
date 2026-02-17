'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createClientJS } from '@supabase/supabase-js'
import { unstable_cache, revalidatePath } from 'next/cache'

/**
 * 분석 카테고리 타입
 */
export type AnalysisCategory =
  | 'SAJU'
  | 'FACE'
  | 'HAND'
  | 'FENGSHUI'
  | 'COMPATIBILITY'
  | 'TODAY'
  | 'WEALTH'
  | 'NEW_YEAR'

/**
 * 분석 컨텍스트 모드
 */
export type AnalysisContextMode = 'WEALTH' | 'LOVE' | 'HEALTH' | 'CAREER' | 'GENERAL'

/**
 * 분석 기록 인터페이스
 */
export interface AnalysisHistory {
  id: string
  user_id: string
  target_id: string | null
  target_name: string
  target_relation: string | null
  category: AnalysisCategory
  context_mode: AnalysisContextMode | null
  result_json: any
  summary: string | null
  score: number | null
  prompt_version: string | null
  model_used: string | null
  talisman_cost: number
  user_memo: string | null
  is_favorite: boolean
  share_token?: string | null
  created_at: string
  updated_at: string
}

/**
 * 분석 기록 생성 파라미터
 */
export interface CreateAnalysisHistoryParams {
  target_id?: string
  target_name: string
  target_relation?: string
  category: AnalysisCategory
  context_mode?: AnalysisContextMode
  result_json: any
  summary?: string
  score?: number
  prompt_version?: string
  model_used?: string
  talisman_cost?: number
}

/**
 * 분석 기록 저장
 */
export async function saveAnalysisHistory(
  params: CreateAnalysisHistoryParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    const { data, error } = await supabase
      .from('analysis_history')
      .insert({
        user_id: user.id,
        target_id: params.target_id || null,
        target_name: params.target_name,
        target_relation: params.target_relation || null,
        category: params.category,
        context_mode: params.context_mode || null,
        result_json: params.result_json,
        summary: params.summary || null,
        score: params.score || null,
        prompt_version: params.prompt_version || null,
        model_used: params.model_used || 'gemini-2.0-flash',
        talisman_cost: params.talisman_cost || 0,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error saving analysis history:', error)
      return { success: false, error: error.message }
    }

    // Revalidate history page
    revalidatePath('/protected/history')

    return { success: true, id: data.id }
  } catch (error) {
    console.error('Error in saveAnalysisHistory:', error)
    return { success: false, error: '분석 기록 저장 중 오류가 발생했습니다.' }
  }
}

/**
 * 최근 분석 기록 조회
 */
export async function getRecentAnalysis(limit: number = 10): Promise<AnalysisHistory[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const getCachedRecent = unstable_cache(
    async (userId: string) => {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent analysis:', error)
        return []
      }

      return (data || []) as AnalysisHistory[]
    },
    [`recent-analysis-${user.id}`],
    {
      revalidate: 60, // 1분 캐시
      tags: [`analysis-history-${user.id}`],
    }
  )

  return getCachedRecent(user.id)
}

/**
 * 특정 분석 기록 조회
 */
export async function getAnalysisById(id: string): Promise<AnalysisHistory | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('analysis_history')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching analysis:', error)
    return null
  }

  return data as AnalysisHistory
}

/**
 * 분석 기록 통계
 */
export async function getAnalysisStats(): Promise<
  {
    category: string
    count: number
    total_cost: number
    last_analyzed: string
  }[]
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase.rpc('get_analysis_stats', {
    user_id_param: user.id,
  })

  if (error) {
    console.error('Error fetching analysis stats:', error)
    return []
  }

  return data || []
}

/**
 * 즐겨찾기 토글
 */
export async function toggleFavorite(
  id: string,
  isFavorite: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    const { error } = await supabase
      .from('analysis_history')
      .update({ is_favorite: isFavorite })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error toggling favorite:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/protected/history')

    return { success: true }
  } catch (error) {
    console.error('Error in toggleFavorite:', error)
    return { success: false, error: '즐겨찾기 변경 중 오류가 발생했습니다.' }
  }
}

/**
 * 메모 업데이트
 */
export async function updateAnalysisMemo(
  id: string,
  memo: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    const { error } = await supabase
      .from('analysis_history')
      .update({ user_memo: memo })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating memo:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/protected/history')

    return { success: true }
  } catch (error) {
    console.error('Error in updateAnalysisMemo:', error)
    return { success: false, error: '메모 업데이트 중 오류가 발생했습니다.' }
  }
}

/**
 * 분석 기록 삭제
 */
export async function deleteAnalysisHistory(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    const { error } = await supabase
      .from('analysis_history')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting analysis history:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/protected/history')

    return { success: true }
  } catch (error) {
    console.error('Error in deleteAnalysisHistory:', error)
    return { success: false, error: '기록 삭제 중 오류가 발생했습니다.' }
  }
}

/**
 * Destiny Target별 분석 기록 필터링
 */
export async function getAnalysisByTarget(targetId: string): Promise<AnalysisHistory[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('analysis_history')
    .select('*')
    .eq('user_id', user.id)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching analysis by target:', error)
    return []
  }

  return (data || []) as AnalysisHistory[]
}

/**
 * 공유 링크 생성 (토큰 발급)
 */
export async function createShareLink(
  id: string
): Promise<{ success: boolean; token?: string; url?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    // 1. 이미 토큰이 있는지 확인
    const { data: record } = await supabase
      .from('analysis_history')
      .select('share_token')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (record?.share_token) {
      return {
        success: true,
        token: record.share_token,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/share/${record.share_token}`,
      }
    }

    // 2. 새 토큰 생성 (UUID)
    const token = crypto.randomUUID()

    const { error } = await supabase
      .from('analysis_history')
      .update({ share_token: token })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error creating share token:', error)
      return { success: false, error: '공유 링크 생성 실패' }
    }

    return {
      success: true,
      token,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/share/${token}`,
    }
  } catch (error) {
    console.error('Error in createShareLink:', error)
    return { success: false, error: '공유 링크 생성 중 오류가 발생했습니다.' }
  }
}

/**
 * 공유된 분석 기록 조회 (Public Access)
 */
export async function getSharedAnalysis(token: string): Promise<AnalysisHistory | null> {
  try {
    // 1. Direct Client 생성 (쿠키/세션 의존성 제거)
    // 공용 데이터 조회이므로 Service Role Key 없이 Anon Key로 충분함 (RPC 함수가 권한 처리)
    const supabase = createClientJS(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )

    console.log(`[Share] Fetching analysis for token: ${token}`)

    // 2. RPC 호출
    const { data, error } = await supabase.rpc('get_shared_analysis_record', {
      token_input: token,
    })

    if (error) {
      console.error('[Share] RPC Error:', error)
      return null
    }

    // RPC returns an array (SETOF), so get the first element
    if (!data || data.length === 0) {
      console.warn('[Share] No data found for token')
      return null
    }

    console.log(`[Share] Success! Found record for target: ${data[0].target_name}`)
    return data[0] as AnalysisHistory
  } catch (error) {
    console.error('[Share] Unexpected Error in getSharedAnalysis:', error)
    return null
  }
}
