'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { logAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/admin/require-admin'

/**
 * 서비스 스위치 저장 — **화면에서 DB 로 직접 쓰던 것을 서버로 옮겼다** (2026-08-18).
 *
 * ## 🔴 왜 옮겼나
 * 예전에는 브라우저에서 `system_settings` 를 바로 upsert 했다. RLS `is_admin()` 이 INSERT 에도
 * 걸려 **권한 구멍은 아니었지만**(WITH CHECK 생략 시 USING 이 대신 쓰인다 — 실측 확인),
 * **감사도 서버 검증도 없었다.** 이 화면에 «전체 시스템 점검» — 전 사용자 접근 차단 스위치가 있다.
 * 누가 언제 껐는지 남지 않으면, 서비스가 멈춘 뒤 원인을 사람 기억에 의존해야 한다.
 *
 * 🔴 키는 화면이 주는 대로 받지 않는다. 아는 키만 통과시킨다(임의 설정 덮어쓰기 차단).
 */

/** 이 화면이 만질 수 있는 설정. 여기 없는 키는 거부한다. */
const ALLOWED_KEYS = [
  'feature_saju',
  'feature_compatibility',
  'feature_face',
  'feature_palm',
  'feature_fengshui',
  'feature_chat',
  'global_maintenance',
] as const

export type ServiceSettingKey = (typeof ALLOWED_KEYS)[number]

function isAllowedKey(key: string): key is ServiceSettingKey {
  return (ALLOWED_KEYS as readonly string[]).includes(key)
}

export async function setServiceSwitch(
  key: string,
  isActive: boolean,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }

  if (!isAllowedKey(key)) {
    logger.error('[service-control] 허용되지 않은 설정 키', { key })
    return { success: false, error: '알 수 없는 설정입니다.' }
  }

  const supabase = createAdminClient()

  const { data: before } = await supabase.from('system_settings').select('value').eq('key', key).maybeSingle()

  const { error } = await supabase.from('system_settings').upsert({
    key,
    value: JSON.stringify({ isActive }),
    description: description ?? null,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    logger.error('[service-control] 설정 저장 실패', { key, message: error.message })
    return { success: false, error: '설정을 저장하지 못했습니다.' }
  }

  await logAdminAction({
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    action: 'service_toggle',
    detail: { key, before: before?.value ?? null, after: isActive },
  })

  revalidatePath('/admin/service-control')
  return { success: true }
}
