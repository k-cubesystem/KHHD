'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { FAMILY_SEAT_TYPES } from '@/lib/domain/shrine/shelf'

/**
 * 세간(가족 자리) 가족 지정 — 이 파일도 `'use server'` 공개 엔드포인트다.
 *
 * ⚠️ 최종 방어는 RLS 다: placements_write_owner(내 신당의 배치만) + family_members FK
 *    (남의 가족 id 는 select-own 에 걸려 조회조차 안 된다). 아래 검사는 화면에 뜻이 통하는
 *    에러를 돌려주기 위한 것이다.
 */

export interface AssignShelfResult {
  success: boolean
  error?: 'UNAUTHORIZED' | 'NOT_FOUND' | 'NOT_SEAT' | 'FAILED'
}

/** familyMemberId=null 이면 지정 해제(빈 자리로 되돌린다). */
export async function assignShelfMember(
  placementId: string,
  familyMemberId: string | null
): Promise<AssignShelfResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }
  if (typeof placementId !== 'string' || placementId.length === 0) return { success: false, error: 'NOT_FOUND' }

  // 가족 자리가 되는 세간인가 — 아무 배치에나 가족을 붙이면 이름표가 방을 뒤덮는다
  const { data: row } = await supabase
    .from('shrine_placements')
    .select('id, catalog_item_id, shrine_item_catalog(type)')
    .eq('id', placementId)
    .maybeSingle()
  if (!row) return { success: false, error: 'NOT_FOUND' }
  const cat: unknown = row.shrine_item_catalog
  const type = typeof cat === 'object' && cat !== null ? (cat as Record<string, unknown>).type : null
  if (typeof type !== 'string' || !FAMILY_SEAT_TYPES.includes(type)) return { success: false, error: 'NOT_SEAT' }

  // 내 가족인가 — select-own RLS 라 남의 가족은 여기서 빈 값이 된다
  if (familyMemberId !== null) {
    const { data: member } = await supabase.from('family_members').select('id').eq('id', familyMemberId).maybeSingle()
    if (!member) return { success: false, error: 'NOT_FOUND' }
  }

  const { error } = await supabase
    .from('shrine_placements')
    .update({ family_member_id: familyMemberId })
    .eq('id', placementId)
  if (error) {
    logger.warn('[shelf] 가족 지정 실패:', error)
    return { success: false, error: 'FAILED' }
  }

  revalidatePath('/protected/shrine')
  return { success: true }
}
