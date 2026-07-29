'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import {
  addBokPoints,
  grantShareReward,
  type BokTransactionType,
  type ShareRewardResult,
} from '@/lib/services/bok-grant'
import type { BokTier } from '@/lib/config/bok-tiers'

/**
 * 이 파일은 `'use server'` — 모든 export 가 로그인 유저의 공개 엔드포인트다.
 * 복 포인트 **발행**(금액 인자) 함수는 여기 두지 않는다 → `@/lib/services/bok-grant`(server-only).
 * 클라이언트가 트리거해야 하는 보상은 `claimShareReward` 처럼 금액이 서버 고정된 좁은 액션만 노출한다.
 */

export interface BokPointsStatus {
  balance: number
  tier: BokTier
  lifetimeEarned: number
}

export interface BokMission {
  id: string
  familyMemberId: string | null
  familyMemberName: string | null
  missionType: string
  missionTitle: string
  pointsReward: number
  isCompleted: boolean
  completedAt: string | null
}

export async function getBokPointsBalance(): Promise<BokPointsStatus> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { balance: 0, tier: 'SEED', lifetimeEarned: 0 }

  const { data } = await supabase
    .from('bok_points')
    .select('balance, tier, lifetime_earned')
    .eq('user_id', user.id)
    .single()

  if (!data) return { balance: 0, tier: 'SEED', lifetimeEarned: 0 }

  return {
    balance: data.balance,
    tier: data.tier as BokTier,
    lifetimeEarned: data.lifetime_earned,
  }
}

/**
 * 카카오 공유 보상 수령 — 클라이언트가 부를 수 있는 **유일한** 복 포인트 적립 경로.
 * - 인자 없음: 금액은 서버 상수(20p)로 고정 → 임의 금액 발행 불가.
 * - 로그인 본인 계정 한정.
 * - 하루(KST) 1회 멱등 + rate limit(자세한 판정 근거는 lib/services/bok-grant.ts).
 *
 * 기존 동작(공유 1회당 무제한 20p)보다 보수적이다 — 의도된 변경.
 */
export async function claimShareReward(): Promise<ShareRewardResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  return grantShareReward(user.id)
}

/**
 * 복(bok_points) 원자적 차감 — service_role RPC `deduct_bok_points`(balance>=amount 가드).
 * addBokPoints(-x)의 TOCTOU/음수 문제 대체(Fable 검토 R5). 부족 시 error='INSUFFICIENT_POINTS'.
 */
export async function deductBokPoints(
  amount: number,
  type: BokTransactionType,
  familyMemberId?: string,
  description?: string
): Promise<{ success: boolean; balance?: number; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }
  if (amount <= 0) return { success: false, error: 'INVALID_AMOUNT' }

  const admin = createAdminClient()
  const { data: newBalance, error: rpcError } = await admin.rpc('deduct_bok_points', {
    p_user_id: user.id,
    p_amount: amount,
  })
  if (rpcError) {
    logger.error('[BokPoints] deduct RPC error:', rpcError)
    return { success: false, error: '복 차감에 실패했습니다.' }
  }
  if ((newBalance as number) === -2) return { success: false, error: 'INSUFFICIENT_POINTS' }

  await admin.from('bok_transactions').insert({
    user_id: user.id,
    family_member_id: familyMemberId || null,
    amount: -amount,
    type,
    description: description || `${type} -${amount}p`,
  })

  return { success: true, balance: newBalance as number }
}

export async function getBokMissions(): Promise<BokMission[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const today = new Date().toISOString().split('T')[0]

  const { data: missions } = await supabase
    .from('bok_missions')
    .select('id, family_member_id, mission_type, mission_title, points_reward, is_completed, completed_at')
    .eq('user_id', user.id)
    .eq('mission_date', today)
    .order('created_at', { ascending: true })

  if (!missions || missions.length === 0) return []

  const memberIds = missions.map((m) => m.family_member_id).filter(Boolean)
  let memberNames: Record<string, string> = {}

  if (memberIds.length > 0) {
    const { data: members } = await supabase.from('family_members').select('id, name').in('id', memberIds)

    if (members) {
      memberNames = Object.fromEntries(members.map((m) => [m.id, m.name]))
    }
  }

  return missions.map((m) => ({
    id: m.id,
    familyMemberId: m.family_member_id,
    familyMemberName: m.family_member_id ? memberNames[m.family_member_id] || null : null,
    missionType: m.mission_type,
    missionTitle: m.mission_title,
    pointsReward: m.points_reward,
    isCompleted: m.is_completed,
    completedAt: m.completed_at,
  }))
}

/**
 * 미션 유형별 **서버 고정** 보상.
 *
 * `bok_missions` RLS 는 `FOR ALL USING (auth.uid() = user_id)` 뿐이라 INSERT 의 WITH CHECK 가
 * 동일 식으로 유도된다 → 유저가 PostgREST 로 자기 미션 행을 직접 INSERT 할 수 있다.
 * 따라서 행에 실린 `points_reward` 를 신뢰하면 `completeBokMission` 이 임의 금액 발행 경로가 된다.
 * 금액은 행이 아니라 **유형**으로만 정한다(cron 생성값과 동일: DAILY_FORTUNE 10 / SHARE 20).
 */
const MISSION_REWARDS: Record<string, number> = {
  DAILY_FORTUNE: 10,
  WEEKLY_FORTUNE: 20,
  ANALYSIS: 20,
  COMPATIBILITY: 20,
  SHARE: 20,
}
const DEFAULT_MISSION_REWARD = 10

export async function completeBokMission(missionId: string): Promise<{
  success: boolean
  pointsEarned?: number
  newBalance?: number
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const { data: mission, error: fetchErr } = await supabase
    .from('bok_missions')
    .select('*')
    .eq('id', missionId)
    .eq('user_id', user.id)
    .eq('is_completed', false)
    .single()

  if (fetchErr || !mission) {
    return { success: false, error: '미션을 찾을 수 없거나 이미 완료되었습니다.' }
  }

  const { error: updateErr } = await supabase
    .from('bok_missions')
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq('id', missionId)

  if (updateErr) {
    logger.error('[BokPoints] Mission update error:', updateErr)
    return { success: false, error: '미션 완료 처리에 실패했습니다.' }
  }

  const pointsReward = MISSION_REWARDS[mission.mission_type] ?? DEFAULT_MISSION_REWARD

  const result = await addBokPoints(pointsReward, 'MISSION', mission.family_member_id, mission.mission_title)

  return {
    success: true,
    pointsEarned: pointsReward,
    newBalance: result.balance,
  }
}

export async function getBokTransactions(limit: number = 20) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('bok_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}
