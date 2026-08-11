'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { readVapidConfig } from '@/lib/services/webpush'
import { logger } from '@/lib/utils/logger'

export interface PushStatus {
  /** VAPID 키가 갖춰져 «신탁 알림 받기»를 켤 수 있는 상태인가 */
  enabled: boolean
  /** 브라우저 구독에 쓸 VAPID 공개키. 미설정이면 null */
  publicKey: string | null
}

export type PushActionResult = { success: true } | { success: false; error: string }

/** 브라우저가 넘긴 PushSubscription.toJSON() 모양 */
export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** endpoint 는 푸시 서비스가 발급하는 https URL 이다. 길이는 DB·로그 보호용 상한. */
const MAX_ENDPOINT_LENGTH = 2048
const MAX_KEY_LENGTH = 256
const MAX_USER_AGENT_LENGTH = 300

function parseSubscription(input: unknown): PushSubscriptionInput | null {
  if (typeof input !== 'object' || input === null) return null
  const { endpoint, keys } = input as { endpoint?: unknown; keys?: unknown }

  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || endpoint.length > MAX_ENDPOINT_LENGTH) {
    return null
  }
  if (typeof keys !== 'object' || keys === null) return null

  const { p256dh, auth } = keys as { p256dh?: unknown; auth?: unknown }
  if (typeof p256dh !== 'string' || p256dh.length === 0 || p256dh.length > MAX_KEY_LENGTH) return null
  if (typeof auth !== 'string' || auth.length === 0 || auth.length > MAX_KEY_LENGTH) return null

  return { endpoint, keys: { p256dh, auth } }
}

/**
 * 푸시 가용 상태 — 화면이 «준비 중»을 보일지 토글을 보일지 정하는 단일 기준.
 * 키를 빌드가 아니라 요청 시점에 읽으므로, 환경변수를 넣고 재배포하면 코드 변경 없이 켜진다.
 */
export async function getPushStatus(): Promise<PushStatus> {
  const config = readVapidConfig()
  return { enabled: config !== null, publicKey: config?.publicKey ?? null }
}

/** 구독 저장 (같은 기기 재구독은 덮어쓰기). */
export async function savePushSubscription(input: unknown, userAgent?: unknown): Promise<PushActionResult> {
  const parsed = parseSubscription(input)
  if (!parsed) return { success: false, error: 'INVALID_SUBSCRIPTION' }

  // 키가 없으면 보낼 수도 없는 구독이다 — 받아 두지 않는다.
  if (!readVapidConfig()) return { success: false, error: 'PUSH_DISABLED' }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'UNAUTHORIZED' }

    // endpoint 는 전역 UNIQUE 다(브라우저 설치 1개 = 1행). 같은 기기에서 계정을 갈아탔다면
    // 그 행의 소유자를 넘겨받아야 «남의 신탁이 내 기기로» 배달되는 사고를 막는데,
    // 그 UPDATE 는 이전 소유자의 RLS 에 걸린다. 그래서 이 upsert 만 service_role 로 한다.
    // user_id 는 인증된 세션에서만 오므로 클라이언트가 남을 지목할 수는 없다.
    const admin = createAdminClient()
    const { error } = await admin.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: parsed.endpoint,
        p256dh: parsed.keys.p256dh,
        auth_key: parsed.keys.auth,
        user_agent: typeof userAgent === 'string' ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
      },
      { onConflict: 'endpoint' }
    )
    if (error) {
      logger.error('[push] subscription save failed:', error)
      return { success: false, error: 'SAVE_FAILED' }
    }
    return { success: true }
  } catch (e) {
    logger.error('[push] subscription save exception:', e)
    return { success: false, error: 'SAVE_FAILED' }
  }
}

/**
 * 구독 해지. VAPID 키 여부를 보지 않는다 — 키를 내려도 «끄기»는 언제나 되어야 한다.
 * RLS(delete own)가 소유를 보장하므로 남의 endpoint 를 넣으면 0행이 지워진다.
 */
export async function removePushSubscription(endpoint: unknown): Promise<PushActionResult> {
  if (typeof endpoint !== 'string' || endpoint.length === 0 || endpoint.length > MAX_ENDPOINT_LENGTH) {
    return { success: false, error: 'INVALID_SUBSCRIPTION' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'UNAUTHORIZED' }

    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)
    if (error) {
      logger.error('[push] subscription delete failed:', error)
      return { success: false, error: 'DELETE_FAILED' }
    }
    return { success: true }
  } catch (e) {
    logger.error('[push] subscription delete exception:', e)
    return { success: false, error: 'DELETE_FAILED' }
  }
}
