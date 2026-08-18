'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { logAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/admin/require-admin'
import { FEATURE_KEYS, type FeatureConfig, type FeatureKey } from '@/lib/feature-flags'

/**
 * 서비스 스위치 저장 — **화면에서 DB 로 직접 쓰던 것을 서버로 옮겼다** (2026-08-18).
 *
 * ## 🔴 왜 옮겼나
 * 예전에는 브라우저에서 `system_settings` 를 바로 upsert 했다. RLS `is_admin()` 이 INSERT 에도
 * 걸려 **권한 구멍은 아니었지만**(WITH CHECK 생략 시 USING 이 대신 쓰인다 — 실측 확인),
 * **감사도 서버 검증도 없었다.** 이 화면에 «전체 시스템 점검» — 전 사용자 접근 차단 스위치가 있다.
 *
 * ## 🔴 옮기면서 두 번 틀렸다 (2026-08-19 수복)
 * 1. **허용 키를 손으로 새로 적었다.** 실제 키(`feat_saju_today` …)와 달라 스위치가 전부
 *    「알 수 없는 설정입니다」로 거절됐다. → `lib/feature-flags.ts` 의 `FEATURE_KEYS` 단일 출처를 쓴다.
 * 2. **값을 통째로 덮어썼다.** `{ isActive }` 만 써서 `accessLevel`·`message` 가 날아갔다.
 *    → 기존 값을 읽어 **병합**한다. 스위치는 `isActive` 하나만 바꾼다.
 *
 * 두 실수 모두 «있는 것을 안 읽고 새로 만든» 탓이다.
 */

const DEFAULT_CONFIG: FeatureConfig = { isActive: false, accessLevel: 'all' }

function isFeatureKey(key: string): key is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(key)
}

/** 저장된 값이 문자열 JSON 일 수도, jsonb 객체일 수도 있다(둘 다 라이브에 있다). */
function parseConfig(raw: unknown): FeatureConfig {
  if (!raw) return DEFAULT_CONFIG
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed && typeof parsed === 'object') return { ...DEFAULT_CONFIG, ...(parsed as Partial<FeatureConfig>) }
  } catch {
    logger.error('[service-control] 설정 값 파싱 실패 — 기본값으로 대체')
  }
  return DEFAULT_CONFIG
}

export async function setServiceSwitch(
  key: string,
  isActive: boolean,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }

  if (!isFeatureKey(key)) {
    logger.error('[service-control] 허용되지 않은 설정 키', { key })
    return { success: false, error: '알 수 없는 설정입니다.' }
  }

  const supabase = createAdminClient()

  const { data: row } = await supabase.from('system_settings').select('value').eq('key', key).maybeSingle()
  const before = parseConfig(row?.value)

  // 🔴 병합이다. 통째로 쓰면 accessLevel·message 가 사라진다.
  const after: FeatureConfig = { ...before, isActive }

  const { error } = await supabase.from('system_settings').upsert({
    key,
    value: JSON.stringify(after),
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
    detail: { key, before: before.isActive, after: isActive },
  })

  revalidatePath('/admin/service-control')
  return { success: true }
}
