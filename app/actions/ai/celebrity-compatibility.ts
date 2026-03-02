'use server'

import { searchCelebrities, getCelebrityById, type Celebrity, type CelebrityCategory } from '@/lib/data/celebrities'
import { buildSajuContext } from '@/lib/saju-engine/context-builder'
import { calculateCompatibility } from '@/lib/saju-engine/compatibility-engine'
import { createClient } from '@/lib/supabase/server'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'

/**
 * 유명인 검색
 */
export async function searchCelebritiesAction(
  query: string,
  category?: CelebrityCategory | null
): Promise<{ success: boolean; data?: Celebrity[]; error?: string }> {
  try {
    const results = searchCelebrities(query, category, 30)
    return { success: true, data: results }
  } catch (e) {
    console.error('[CelebritySearch]', e)
    return { success: false, error: '검색 중 오류가 발생했습니다.' }
  }
}

/**
 * 유명인 사주 데이터 조회
 */
export async function getCelebritySajuAction(
  celebrityId: string
): Promise<{ success: boolean; data?: ReturnType<typeof buildSajuContext>; celebrity?: Celebrity; error?: string }> {
  try {
    const celebrity = getCelebrityById(celebrityId)
    if (!celebrity) {
      return { success: false, error: '유명인 정보를 찾을 수 없습니다.' }
    }

    const ctx = buildSajuContext({
      name: celebrity.name,
      birthDate: celebrity.birthDate,
      birthTime: celebrity.birthTime ?? '00:00',
      gender: celebrity.gender,
      isSolar: true,
    })

    return { success: true, data: ctx, celebrity }
  } catch (e) {
    console.error('[CelebritySaju]', e)
    return { success: false, error: '사주 계산 중 오류가 발생했습니다.' }
  }
}

/**
 * 나 vs 유명인 궁합 계산 (사용자의 family_member 본인 데이터 기반)
 */
export async function calculateCelebrityCompatibilityAction(celebrityId: string): Promise<{
  success: boolean
  score?: number
  categories?: ReturnType<typeof calculateCompatibility>
  celebrity?: Celebrity
  userInfo?: { name: string; birthDate: string }
  error?: string
}> {
  if (isEdgeEnabled('ai-analysis')) {
    return invokeEdgeSafe('ai-analysis', { action: 'celebrityCompatibility', celebrityId })
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // 내 정보 (family_members 본인)
    const { data: me } = await supabase
      .from('family_members')
      .select('name, birth_date, birth_time, gender')
      .eq('user_id', user.id)
      .eq('relationship', '본인')
      .single()

    if (!me || !me.birth_date) {
      return { success: false, error: "먼저 '인연 관리'에서 본인 정보를 등록해주세요." }
    }

    const celebrity = getCelebrityById(celebrityId)
    if (!celebrity) {
      return { success: false, error: '유명인 정보를 찾을 수 없습니다.' }
    }

    const myCtx = buildSajuContext({
      name: me.name ?? '나',
      birthDate: me.birth_date,
      birthTime: me.birth_time ?? '00:00',
      gender: (me.gender as 'male' | 'female') ?? 'female',
      isSolar: true,
    })

    const celebCtx = buildSajuContext({
      name: celebrity.name,
      birthDate: celebrity.birthDate,
      birthTime: celebrity.birthTime ?? '00:00',
      gender: celebrity.gender,
      isSolar: true,
    })

    const result = calculateCompatibility(myCtx, celebCtx, 'lover')

    return {
      success: true,
      score: result.totalScore,
      categories: result,
      celebrity,
      userInfo: { name: me.name ?? '나', birthDate: me.birth_date },
    }
  } catch (e) {
    console.error('[CelebrityCompatibility]', e)
    return { success: false, error: '궁합 계산 중 오류가 발생했습니다.' }
  }
}
