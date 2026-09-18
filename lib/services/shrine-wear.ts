import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { tierUnlocks } from '@/lib/domain/payment/membership-tiers'
import { TIER_OPEN_DEITY_SOURCE, deityOwnershipHolds, parseRequiredTier } from '@/lib/domain/shrine/types'

/**
 * 걸린 테마·좌정 신위가 지금도 유효한가 — 등급으로 연 것은 «구독 중 이용»이라 주인의 등급이 끊기면
 * 착용이 풀린다(PRD-voucher-system «소유의 두 층»). 소유 기록은 지우지 않으므로 재구독하면 그대로 돌아온다.
 * 증정·보상·예전 봉헌은 해지해도 남는다.
 *
 * 요구 등급이 없는 것(수호신·기본 테마)은 조회 없이 유효하다. tier 는 필요할 때만 부른다.
 * 방문자 뷰는 주인의 소유 행을 RLS 로 읽지 못하므로 client 를 admin 으로 준다 — 여기서는 참·거짓만 돌려준다.
 */
export interface WearCheck {
  client: SupabaseClient
  tier: () => Promise<string | null | undefined>
}

export async function seatedDeityHolds(
  wear: WearCheck,
  ownerId: string,
  deityId: string,
  requiredTier: unknown
): Promise<boolean> {
  if (!parseRequiredTier(requiredTier)) return true
  const { data } = await wear.client
    .from('user_shrine_deities')
    .select('source')
    .eq('user_id', ownerId)
    .eq('deity_id', deityId)
    .maybeSingle()
  if (data?.source !== TIER_OPEN_DEITY_SOURCE) return true
  return deityOwnershipHolds(data.source, requiredTier, await wear.tier())
}

export async function hungPackHolds(
  wear: WearCheck,
  ownerId: string,
  packId: string,
  requiredTier: unknown
): Promise<boolean> {
  const tier = parseRequiredTier(requiredTier)
  if (!tier || tierUnlocks(await wear.tier(), tier)) return true
  const { data } = await wear.client
    .from('user_theme_packs')
    .select('pack_id')
    .eq('user_id', ownerId)
    .eq('pack_id', packId)
    .maybeSingle()
  return data !== null
}
