import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getActiveMembership } from '@/lib/auth/subscription'
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

export interface WornMainDeity {
  id: string
  code: string
  name: string
  portraitUrl: string | null
}

function textOf(row: unknown, key: string): string | null {
  if (typeof row !== 'object' || row === null) return null
  const value = (row as Record<string, unknown>)[key]
  return typeof value === 'string' && value ? value : null
}

/**
 * 본인 신당에 «지금» 좌정해 있는 主神 — 신당 밖 화면(속풀이·명식 팝업·프로필·신탁)이 쓰는 단일 로더.
 *
 * 🔴 `shrines.main_deity_id` 를 그냥 읽지 말 것. 좌정 기록은 등급이 끊겨도 지우지 않으므로(재구독하면 돌아온다),
 *    그냥 읽은 화면에서는 신당에서 이미 풀린 主神이 계속 앉아 말을 걸었다. 판정은 씬과 같은 seatedDeityHolds 다.
 * tier 는 등급으로 모신 신위일 때만 불린다 — 주인의 등급을 이미 아는 자리는 넘겨서 조회를 아낀다.
 */
export async function loadWornMainDeity(
  client: SupabaseClient,
  ownerId: string,
  tier: WearCheck['tier'] = async () => (await getActiveMembership(ownerId))?.tier
): Promise<WornMainDeity | null> {
  const { data: shrine } = await client
    .from('shrines')
    .select('main_deity_id')
    .eq('user_id', ownerId)
    .is('family_member_id', null)
    .maybeSingle()
  const id = textOf(shrine, 'main_deity_id')
  if (!id) return null

  const { data: deity } = await client
    .from('shrine_deities')
    .select('code, name, portrait_url, required_tier')
    .eq('id', id)
    .maybeSingle()
  const code = textOf(deity, 'code')
  const name = textOf(deity, 'name')
  if (!code || !name) return null

  const requiredTier: unknown = (deity as { required_tier?: unknown }).required_tier
  if (!(await seatedDeityHolds({ client, tier }, ownerId, id, requiredTier))) return null

  return { id, code, name, portraitUrl: textOf(deity, 'portrait_url') }
}
