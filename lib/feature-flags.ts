import { createClient } from '@/lib/supabase/server'

/**
 * 🔴 키·타입의 정본은 `lib/domain/feature-flags/keys.ts` 다 — 이 파일은 서버 전용
 *    (`supabase/server`)이라 클라이언트가 가져오면 번들이 깨진다. 여기서는 다시 내보내기만
 *    해서 기존 import 경로를 살려 둔다.
 */
export { FEATURE_KEYS } from '@/lib/domain/feature-flags/keys'
export type { FeatureKey, FeatureConfig } from '@/lib/domain/feature-flags/keys'

import type { FeatureKey, FeatureConfig } from '@/lib/domain/feature-flags/keys'

/**
 * [Server-Side] 특정 기능 활성화 여부 확인
 */
export async function getFeatureStatus(key: FeatureKey): Promise<FeatureConfig> {
  const supabase = await createClient() // Await the createClient call

  try {
    const { data } = await supabase.from('system_settings').select('value').eq('key', key).single()

    if (!data) {
      // DB에 키가 없으면 기본적으로 닫혀있는 것으로 간주 (Fail-Safe)
      return { isActive: false, accessLevel: 'admin' }
    }

    // JSON 파싱 (DB에는 TEXT로 저장됨)
    if (typeof data.value === 'string') {
      return JSON.parse(data.value) as FeatureConfig
    }

    return data.value as FeatureConfig
  } catch (e) {
    console.error(`[FeatureFlag] Error checking ${key}:`, e)
    return { isActive: false, accessLevel: 'admin' }
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
