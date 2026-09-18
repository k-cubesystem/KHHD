'use server'

import { createClient } from '@/lib/supabase/server'
import { TIER_THRESHOLDS, type BokTier } from '@/lib/config/bok-tiers'

/**
 * 복 등급 읽기 — 이미 오른 등급만 돌려준다(적립 중단, 2026-09-18).
 *
 * 🔴 이 파일은 `'use server'` — 모든 export 가 공개 엔드포인트다. 발급·차감 함수를 두지 않고,
 *    포인트 수(잔액·누적)도 내보내지 않는다. 화면은 등급 게이지만 그린다.
 */

function toBokTier(value: unknown): BokTier {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TIER_THRESHOLDS, value)
    ? (value as BokTier)
    : 'SEED'
}

export async function getBokTier(): Promise<BokTier> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'SEED'

  const { data } = await supabase.from('bok_points').select('tier').eq('user_id', user.id).maybeSingle()
  return toBokTier(data?.tier)
}
