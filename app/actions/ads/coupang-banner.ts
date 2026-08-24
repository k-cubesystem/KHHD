'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

/**
 * 허브 하단 **제휴 배너**용 쿠팡 링크.
 *
 * ## 🔴 보상형과 다른 물건이다
 * 같은 쿠팡이라도 속풀이의 「광고 보고 향 올리기」(`app/actions/ads/coupang.ts`)는 **보상형**이고,
 * 이건 **보고 가기만 하는 제휴 배너**다. 여기에 어떤 보상도 걸지 말 것 — 원장(`ad_reward_ledger`)
 * 도 건드리지 않는다. 보상을 붙이려면 그쪽 경로(일일 상한·체류 판정·멱등)를 통해야 한다.
 *
 * ## 🔴 service_role 로 읽는다
 * `system_settings` 의 RLS 는 정책이 `is_admin()` 하나뿐이라 유저 클라이언트로는 **무조건 0행**이다.
 * 그대로 읽으면 링크가 늘 비어 배너가 전 사용자에게 안 보인다(2026-08-22 실사고와 같은 계보).
 * 클라이언트로 나가는 것은 **공개 제휴 URL 하나**뿐이라 노출 위험은 없다.
 */
export async function getCoupangBannerUrl(): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('system_settings')
      .select('value')
      .eq('key', 'coupang_partners_url')
      .maybeSingle()

    if (error) {
      logger.error('[coupang-banner] 링크 조회 실패:', error)
      return null
    }

    const url = (data?.value ?? '').trim()
    // 미설정이면 «없음» — 화면은 빈 상자 대신 아무것도 그리지 않는다.
    if (!url.startsWith('https://')) return null
    return url
  } catch (e) {
    logger.error('[coupang-banner] 링크 판정 오류:', e)
    return null
  }
}
