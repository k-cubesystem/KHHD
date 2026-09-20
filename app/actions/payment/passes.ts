'use server'

import { createClient } from '@/lib/supabase/server'
import { getPassLedger, getPassSummary, type PassLedgerEntry } from '@/lib/services/entitlement'
import type { PassSummary } from '@/lib/domain/entitlement/pass'
import { getUserTierLimits } from '@/app/actions/payment/membership'
import { getFirstMonthEligibility } from '@/app/actions/payment/subscription'
import { planDisplayName } from '@/lib/domain/payment/membership-tiers'

/**
 * 이용권 «읽기» 공개 엔드포인트 — 로그인한 본인 것만.
 *
 * 🔴 발급·사용·회수는 여기 두지 않는다. 이 파일의 export 는 전부 누구나 부를 수 있는 공개
 *    엔드포인트이므로, 인자로 사용자를 받지 않고 세션에서만 사용자를 읽는다.
 */

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** 내 이용권 요약 — 멤버십 이번 달 몫과 보유 이용권을 따로. 비로그인이면 null. */
export async function getMyPassSummary(): Promise<PassSummary | null> {
  const userId = await currentUserId()
  if (!userId) return null
  return getPassSummary(userId)
}

export interface PassOverview {
  passes: PassSummary
  tier: string | null
  planName: string
  isSubscribed: boolean
  /** 첫 구독 첫 달 할인 대상인가 — 비회원일 때만 확인한다(회원에게는 보여 줄 자리가 없다). */
  firstMonthEligible: boolean
}

/** 상단 바 이용권 팝업이 쓰는 한 벌 — 이용권 요약 + 멤버십 등급. 비로그인이면 null. */
export async function getMyPassOverview(): Promise<PassOverview | null> {
  const userId = await currentUserId()
  if (!userId) return null

  const [passes, limits] = await Promise.all([getPassSummary(userId), getUserTierLimits()])
  const isSubscribed = Boolean(limits?.is_subscribed)
  return {
    passes,
    tier: limits?.tier ?? null,
    planName: planDisplayName(limits),
    isSubscribed,
    firstMonthEligible: isSubscribed ? false : await getFirstMonthEligibility(),
  }
}

/** 내 이용권 내역(최신순). */
export async function getMyPassLedger(limit = 50): Promise<PassLedgerEntry[]> {
  const userId = await currentUserId()
  if (!userId) return []
  return getPassLedger(userId, limit)
}
