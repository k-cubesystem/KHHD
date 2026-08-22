import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

/**
 * 🔴 키·타입의 정본은 `lib/domain/feature-flags/keys.ts` 다 — 이 파일은 서버 전용
 *    (`supabase/server`)이라 클라이언트가 가져오면 번들이 깨진다. 여기서는 다시 내보내기만
 *    해서 기존 import 경로를 살려 둔다.
 */
export { FEATURE_KEYS } from '@/lib/domain/feature-flags/keys'
export type { FeatureKey, FeatureConfig } from '@/lib/domain/feature-flags/keys'

import type { FeatureKey, FeatureConfig } from '@/lib/domain/feature-flags/keys'

/** 읽기 실패·미등록 시의 안전값 — 닫힌 쪽으로 넘어진다(Fail-Safe). */
const CLOSED: FeatureConfig = { isActive: false, accessLevel: 'admin' }

/**
 * [Server-Side] 특정 기능 활성화 여부 확인.
 *
 * 🔴 **service_role 로 읽는다(2026-08-22 수복).** `system_settings` 의 RLS 는 정책이
 *    `is_admin()` 하나뿐이라 **일반 사용자 클라이언트로는 무조건 0행**이 온다. 예전처럼
 *    `supabase/server`(유저 RLS) 로 읽으면 모든 스위치가 «꺼짐»으로 읽혀 기능이 통째로
 *    숨는다 — 같은 날 쿠팡 광고 리워드가 정확히 이 이유로 전 사용자에게 안 보였다.
 *    스위치 값은 비밀이 아니고 여기서 나가는 것도 `FeatureConfig` 뿐이라 service_role 로 읽어도 안전하다.
 */
export async function getFeatureStatus(key: FeatureKey): Promise<FeatureConfig> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from('system_settings').select('value').eq('key', key).maybeSingle()

    if (error) {
      logger.error(`[FeatureFlag] ${key} 조회 실패:`, error)
      return CLOSED
    }
    // DB에 키가 없으면 닫힌 것으로 본다
    if (!data?.value) return CLOSED

    // JSON 파싱 (DB에는 TEXT로 저장됨)
    if (typeof data.value === 'string') {
      return JSON.parse(data.value) as FeatureConfig
    }
    return data.value as FeatureConfig
  } catch (e) {
    logger.error(`[FeatureFlag] ${key} 판정 오류:`, e)
    return CLOSED
  }
}

/**
 * [Server-Side] 전체 시스템 점검 중인지 확인
 */
export async function checkMaintenanceMode(): Promise<{ isMaintenance: boolean; message?: string }> {
  const config = await getFeatureStatus('global_maintenance')
  return {
    isMaintenance: config.isActive,
    message: config.message,
  }
}
