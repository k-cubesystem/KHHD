import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export interface BondAwardResult {
  success: boolean
  level?: number
  points?: number
  leveledUp?: boolean
  error?: string
}

/**
 * 인연(緣) 적립 — 서버 내부 전용. 포인트는 호출측 이벤트 로직이 서버에서 결정한다.
 * (공개 서버액션이었을 때 클라이언트가 임의 포인트로 호출 가능했던 취약점의 대체 —
 *  'use server' 파일로 옮기지 말 것.)
 */
export async function awardDeityBondForUser(userId: string, deityId: string, points: number): Promise<BondAwardResult> {
  if (points <= 0) return { success: false, error: 'INVALID_POINTS' }

  const admin = createAdminClient()

  // 보유 신위에만 적립
  const { data: owned } = await admin
    .from('user_shrine_deities')
    .select('deity_id')
    .eq('user_id', userId)
    .eq('deity_id', deityId)
    .maybeSingle()
  if (!owned) return { success: false, error: 'NOT_OWNED' }

  const { data: before } = await admin
    .from('user_deity_bonds')
    .select('bond_level')
    .eq('user_id', userId)
    .eq('deity_id', deityId)
    .maybeSingle()
  const prevLevel = before?.bond_level ?? 0

  const { data, error } = await admin.rpc('award_deity_bond', {
    p_user_id: userId,
    p_deity_id: deityId,
    p_points: points,
  })
  if (error) {
    logger.error('[awardDeityBondForUser] rpc error:', error)
    return { success: false, error: 'AWARD_FAILED' }
  }
  const row = Array.isArray(data) ? data[0] : data
  const level = typeof row?.bond_level === 'number' ? row.bond_level : undefined
  const total = typeof row?.bond_points === 'number' ? row.bond_points : undefined

  return { success: true, level, points: total, leveledUp: level !== undefined && level > prevLevel }
}
