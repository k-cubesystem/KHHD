import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { grantPasses, type GrantPassesResult } from '@/lib/services/entitlement'
import { ONBOARDING_PASSES, ONBOARDING_VALID_DAYS } from '@/lib/domain/entitlement/pass'
import { logger } from '@/lib/utils/logger'

/**
 * 가입 선물 — 가입 맛보기 이용권 · 친구 추천 이용권. 발급은 가입 인증을 마친 서버 경로(auth callback)에서만 부른다.
 *
 * 🔴 userId 를 인자로 받는 발급 함수다. `'use server'` 파일에서 export·re-export 하지 않는다.
 *    예전 processReferralBonus 는 `'use server'` 에 있어, 로그인한 누구나 남의 id 로 추천 선물을 부를 수 있었다.
 */

/** 가입 맛보기 — 평생 한 번. 두 번 불러도 멱등 키가 한 장으로 묶는다. */
export function grantOnboardingPasses(userId: string): Promise<GrantPassesResult> {
  return grantPasses({
    userId,
    source: 'onboarding',
    quantity: ONBOARDING_PASSES,
    validDays: ONBOARDING_VALID_DAYS,
    idempotencyKey: `ONBOARDING:${userId}`,
    note: '가입 맛보기',
  })
}

export interface ReferralGrantResult {
  success: boolean
  /** 양측이 각각 받은 장수 */
  passes?: number
  error?: string
}

function toReferralResult(data: unknown): ReferralGrantResult {
  if (typeof data !== 'object' || data === null) return { success: false, error: 'EMPTY_RESPONSE' }
  const row = data as { success?: unknown; bonus?: unknown; error?: unknown }
  return {
    success: row.success === true,
    passes: typeof row.bonus === 'number' ? row.bonus : undefined,
    error: typeof row.error === 'string' ? row.error : undefined,
  }
}

const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{4,16}$/

/**
 * 초대 링크의 추천 코드가 실제로 있으면 정규화한 코드를, 없으면 null.
 *
 * 🔴 referral_codes 는 비로그인 방문자에게 0행으로 읽힌다(RLS) — 초대 링크를 여는 사람은 대개 비로그인이라,
 *    세션 클라이언트로 확인하면 모든 코드가 «없음»이 되어 추천 쿠키가 한 번도 심기지 않았다(referral_uses 0행).
 */
export async function findReferralCode(raw: string | null | undefined): Promise<string | null> {
  const code = (raw ?? '').trim().toUpperCase()
  if (!REFERRAL_CODE_PATTERN.test(code)) return null

  const { data, error } = await createAdminClient().from('referral_codes').select('code').eq('code', code).maybeSingle()
  if (error) {
    logger.error(new Error('[Referral] 추천 코드 확인 실패'), { message: error.message })
    return null
  }
  return data ? code : null
}

/**
 * 친구 추천 — 가입한 사람·추천한 사람에게 이용권을 한 장씩. 발급은 DB(process_referral_bonus → ent_grant)가
 * 멱등 키로 하고, 한 사람이 추천 선물을 두 번 받는 것은 referral_uses 가 막는다.
 */
export async function grantReferralPasses(refereeId: string, code: string): Promise<ReferralGrantResult> {
  const { data, error } = await createAdminClient().rpc('process_referral_bonus', {
    p_referee_id: refereeId,
    p_code: code,
  })
  if (error) {
    logger.error(new Error('[Referral] 추천 선물 처리 실패'), { refereeId, message: error.message })
    return { success: false, error: error.message }
  }
  return toReferralResult(data)
}
