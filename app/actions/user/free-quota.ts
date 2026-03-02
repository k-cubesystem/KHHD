'use server'

import { createClient } from '@/lib/supabase/server'

const FREE_ANALYSIS_LIMIT = 3

export interface FreeQuotaStatus {
  totalUsed: number
  remaining: number
  limit: number
  isExhausted: boolean
  isLastFree: boolean // true when on analysis #2 (1 remaining after this)
  isPaid: boolean // true if user has wallet balance or subscription
}

/**
 * 무료 분석 횟수 현황 조회
 * - admin/tester: 항상 무제한
 * - 구독자(is_subscribed): 무제한
 * - 일반 유저: analysis_history 총 개수 기준으로 무료 한도 체크
 */
export async function getFreeQuotaStatus(): Promise<FreeQuotaStatus> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      totalUsed: 0,
      remaining: FREE_ANALYSIS_LIMIT,
      limit: FREE_ANALYSIS_LIMIT,
      isExhausted: false,
      isLastFree: false,
      isPaid: false,
    }
  }

  // admin / tester → 무제한
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role === 'admin' || profile?.role === 'tester') {
    return {
      totalUsed: 0,
      remaining: 999,
      limit: 999,
      isExhausted: false,
      isLastFree: false,
      isPaid: true,
    }
  }

  // 구독 여부 체크
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  // 지갑 잔액 체크 (1만냥 이상이면 유료 사용 가능)
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()

  const hasFunds = (wallet?.balance ?? 0) >= 1
  const isPaid = !!subscription || hasFunds

  // 총 분석 횟수
  const { count } = await supabase
    .from('analysis_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const totalUsed = count ?? 0
  const remaining = Math.max(0, FREE_ANALYSIS_LIMIT - totalUsed)
  const isExhausted = totalUsed >= FREE_ANALYSIS_LIMIT
  // 마지막 무료 분석: remaining이 1 (즉 이번 분석 후 소진)
  const isLastFree = remaining === 1 && !isPaid

  return {
    totalUsed,
    remaining,
    limit: FREE_ANALYSIS_LIMIT,
    isExhausted,
    isLastFree,
    isPaid,
  }
}

/**
 * 분석 시작 가능 여부 확인
 * - 무료 한도가 남아 있거나 유료 잔액이 있으면 허용
 */
export async function canStartAnalysis(): Promise<{
  allowed: boolean
  quota: FreeQuotaStatus
  error?: string
}> {
  const quota = await getFreeQuotaStatus()

  if (!quota.isExhausted || quota.isPaid) {
    return { allowed: true, quota }
  }

  return {
    allowed: false,
    quota,
    error: '무료 분석 횟수를 모두 사용했습니다. 복채를 충전하거나 멤버십에 가입해주세요.',
  }
}
