'use server'

import { createClient } from '@/lib/supabase/server'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { getUserRole } from '@/lib/supabase/helpers'
import { hasPassBypass } from '@/lib/auth/privileges'
import { getPassSummary } from '@/lib/services/entitlement'
import { heldPassCount } from '@/lib/domain/entitlement/pass'

const FREE_ANALYSIS_LIMIT = 3

export interface FreeQuotaStatus {
  totalUsed: number
  remaining: number
  limit: number
  isExhausted: boolean
  isLastFree: boolean // true when on analysis #2 (1 remaining after this)
  /** 멤버십 회원이거나 보유 이용권이 있으면 true — 무료 한도와 별개로 풀이를 열 수 있다. */
  isPaid: boolean
}

/**
 * 무료 분석 횟수 현황 조회
 * - admin/tester: 항상 통과(hasPassBypass)
 * - 멤버십 회원·보유 이용권: 통과(isPaid)
 * - 일반 유저: analysis_history 총 개수 기준으로 무료 한도 체크
 */
export async function getFreeQuotaStatus(): Promise<FreeQuotaStatus> {
  if (isEdgeEnabled('user')) {
    return invokeEdgeSafe('user', { action: 'getFreeQuotaStatus' })
  }
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

  const role = await getUserRole(supabase, user.id)

  if (hasPassBypass(role)) {
    return {
      totalUsed: 0,
      remaining: 999,
      limit: 999,
      isExhausted: false,
      isLastFree: false,
      isPaid: true,
    }
  }

  // 이용권 요약(멤버십 몫·보유 이용권)과 분석 횟수를 병렬 조회
  const [passSummary, countResult] = await Promise.all([
    getPassSummary(user.id),
    supabase.from('analysis_history').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const { count } = countResult

  const isPaid = passSummary.unlimited || passSummary.membership !== null || heldPassCount(passSummary) > 0

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
 * - 무료 한도가 남아 있거나 멤버십·보유 이용권이 있으면 허용
 */
export async function canStartAnalysis(): Promise<{
  allowed: boolean
  quota: FreeQuotaStatus
  error?: string
}> {
  if (isEdgeEnabled('user')) {
    return invokeEdgeSafe('user', { action: 'canStartAnalysis' })
  }
  const quota = await getFreeQuotaStatus()

  if (!quota.isExhausted || quota.isPaid) {
    return { allowed: true, quota }
  }

  return {
    allowed: false,
    quota,
    error: '무료 분석 횟수를 모두 사용했습니다. 이용권을 구매하거나 멤버십에 가입해주세요.',
  }
}
