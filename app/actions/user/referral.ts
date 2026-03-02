'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 현재 로그인 유저의 추천 코드를 가져오거나 생성합니다.
 */
export async function getOrCreateReferralCode(): Promise<{
  success: boolean
  code?: string
  referralLink?: string
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const { data, error } = await supabase.rpc('get_or_create_referral_code', {
    p_user_id: user.id,
  })

  if (error) {
    console.error('[getOrCreateReferralCode]', error)
    return { success: false, error: '추천 코드 생성 중 오류가 발생했습니다.' }
  }

  const code = data as string
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return {
    success: true,
    code,
    referralLink: `${baseUrl}/invite?ref=${code}`,
  }
}

/**
 * 현재 로그인 유저의 추천 통계를 반환합니다.
 * - 총 추천 수
 * - 총 획득 보너스 (만냥)
 * - 최근 추천 목록 (날짜 + 익명 처리된 피추천인)
 */
export async function getReferralStats(): Promise<{
  success: boolean
  totalReferrals?: number
  totalEarned?: number
  recentReferrals?: { date: string; bonus: number }[]
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const { data: uses, error } = await supabase
    .from('referral_uses')
    .select('bonus_amount, rewarded_at')
    .eq('referrer_id', user.id)
    .order('rewarded_at', { ascending: false })
    .limit(20)

  if (error) {
    return { success: false, error: '통계 조회 중 오류가 발생했습니다.' }
  }

  const totalReferrals = uses?.length ?? 0
  const totalEarned = uses?.reduce((sum, u) => sum + (u.bonus_amount ?? 0), 0) ?? 0
  const recentReferrals = (uses ?? []).map((u) => ({
    date: u.rewarded_at,
    bonus: u.bonus_amount,
  }))

  return { success: true, totalReferrals, totalEarned, recentReferrals }
}

/**
 * 추천 보너스 처리 — 신규 회원 이메일 인증 완료 후 콜백에서 호출
 * @param refereeId 피추천인 userId
 * @param code 추천 코드
 */
export async function processReferralBonus(
  refereeId: string,
  code: string
): Promise<{ success: boolean; bonus?: number; error?: string }> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient.rpc('process_referral_bonus', {
    p_referee_id: refereeId,
    p_code: code,
  })

  if (error) {
    console.error('[processReferralBonus]', error)
    return { success: false, error: error.message }
  }

  const result = data as { success: boolean; error?: string; bonus?: number }
  return result
}

/**
 * 추천 코드 유효성 확인 (추천인 이름 반환)
 */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean
  referrerName?: string
  error?: string
}> {
  const supabase = await createClient()

  const { data: rc, error } = await supabase
    .from('referral_codes')
    .select('user_id')
    .eq('code', code.toUpperCase())
    .maybeSingle()

  if (error || !rc) {
    return { valid: false, error: '유효하지 않은 추천 코드입니다.' }
  }

  // 추천인 이름 조회 (profiles)
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', rc.user_id).maybeSingle()

  return {
    valid: true,
    referrerName: profile?.full_name || '해화당 회원',
  }
}
