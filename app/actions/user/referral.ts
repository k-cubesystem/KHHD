'use server'

import { createClient } from '@/lib/supabase/server'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'
import { getSiteUrl } from '@/lib/utils/site-url'

/**
 * 현재 로그인 유저의 추천 코드를 가져오거나 생성합니다.
 */
export async function getOrCreateReferralCode(): Promise<{
  success: boolean
  code?: string
  referralLink?: string
  error?: string
}> {
  if (isEdgeEnabled('user')) {
    return invokeEdgeSafe('user', { action: 'getOrCreateReferralCode' })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const { data, error } = await supabase.rpc('get_or_create_referral_code', {
    p_user_id: user.id,
  })

  if (error) {
    logger.error('[getOrCreateReferralCode]', error)
    return { success: false, error: '추천 코드 생성 중 오류가 발생했습니다.' }
  }

  const code = data as string
  return {
    success: true,
    code,
    referralLink: `${getSiteUrl()}/invite?ref=${code}`,
  }
}

/**
 * 현재 로그인 유저의 추천 통계 — 초대로 가입한 친구 수와 최근 가입 날짜(피추천인은 익명).
 *
 * 🔴 referral_uses.bonus_amount 를 합산해 보이지 않는다. 이용권 전환 전 행은 만냥, 뒤 행은 장 수라
 *    단위가 섞여 있다(2026-09-18). 받은 선물은 이용권 내역이 정본이다.
 */
export async function getReferralStats(): Promise<{
  success: boolean
  totalReferrals?: number
  recentReferrals?: { date: string }[]
  error?: string
}> {
  if (isEdgeEnabled('user')) {
    return invokeEdgeSafe('user', { action: 'getReferralStats' })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const {
    data: uses,
    count,
    error,
  } = await supabase
    .from('referral_uses')
    .select('rewarded_at', { count: 'exact' })
    .eq('referrer_id', user.id)
    .order('rewarded_at', { ascending: false })
    .limit(20)

  if (error) {
    return { success: false, error: '통계 조회 중 오류가 발생했습니다.' }
  }

  const recentReferrals = (uses ?? []).map((u) => ({ date: String(u.rewarded_at) }))

  return { success: true, totalReferrals: count ?? recentReferrals.length, recentReferrals }
}
