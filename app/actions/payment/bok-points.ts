'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { BokTier } from '@/lib/config/bok-tiers'

export type BokTransactionType =
  | 'REGISTER'
  | 'ANALYSIS'
  | 'COMPATIBILITY'
  | 'FORTUNE'
  | 'SHARE'
  | 'CHECKIN'
  | 'BONUS'
  | 'REFERRAL'
  | 'MISSION'

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

export async function addBokPoints(
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

  try {
    const { data: newBalance, error: rpcError } = await supabase.rpc('add_bok_points', {
      p_user_id: user.id,
      p_amount: amount,
    })

    if (rpcError) {
      logger.error('[BokPoints] RPC error:', rpcError)
      return { success: false, error: '복 포인트 적립에 실패했습니다.' }
    }

    await supabase.from('bok_transactions').insert({
      user_id: user.id,
      family_member_id: familyMemberId || null,
      amount,
      type,
      description: description || `${type} +${amount}p`,
    })

    return { success: true, balance: newBalance as number }
  } catch (err) {
    logger.error('[BokPoints] addBokPoints error:', err)
    return { success: false, error: '복 포인트 적립 중 오류가 발생했습니다.' }
  }
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

  const result = await addBokPoints(mission.points_reward, 'MISSION', mission.family_member_id, mission.mission_title)

  return {
    success: true,
    pointsEarned: mission.points_reward,
    newBalance: result.balance,
  }
}

export async function generateDailyBokMissions(userId: string): Promise<{ generated: number }> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('bok_missions')
    .select('id')
    .eq('user_id', userId)
    .eq('mission_date', today)
    .limit(1)

  if (existing && existing.length > 0) return { generated: 0 }

  const { data: members } = await supabase.from('family_members').select('id, name').eq('user_id', userId).limit(10)

  if (!members || members.length === 0) return { generated: 0 }

  interface MissionInsert {
    user_id: string
    family_member_id: string | null
    mission_type: string
    mission_title: string
    points_reward: number
    mission_date: string
  }

  const missions: MissionInsert[] = members.map((member) => ({
    user_id: userId,
    family_member_id: member.id,
    mission_type: 'DAILY_FORTUNE',
    mission_title: `${member.name}님의 오늘 운세 확인하기`,
    points_reward: 10,
    mission_date: today,
  }))

  missions.push({
    user_id: userId,
    family_member_id: null,
    mission_type: 'SHARE',
    mission_title: '카카오톡으로 복 나누기',
    points_reward: 20,
    mission_date: today,
  })

  const { error } = await supabase.from('bok_missions').insert(missions)

  if (error) {
    logger.error('[BokPoints] Mission generation error:', error)
    return { generated: 0 }
  }

  return { generated: missions.length }
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
