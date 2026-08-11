import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

/**
 * 신탁 웹푸시 발송기.
 *
 * 설계 원칙 — VAPID 키가 없으면 «완전한 무동작»이다.
 *  · 키가 없으면 DB 도, web-push 모듈 적재도 건드리지 않고 즉시 돌아온다.
 *  · web-push 는 키가 있을 때만 동적 import 한다. 키가 없는 동안에는 이 라이브러리가
 *    런타임에 아예 적재되지 않으므로 «키 부재로 인한 크래시 경로» 자체가 존재하지 않는다.
 *  · 어떤 실패도 throw 하지 않는다. 호출부(신탁 생성)가 푸시 때문에 죽으면 안 된다.
 */

export interface VapidConfig {
  publicKey: string
  privateKey: string
  subject: string
}

/**
 * VAPID subject 기본값. RFC 8292 는 mailto: 또는 https URL 을 요구하며,
 * 푸시 서비스는 이 값으로 발송자를 식별한다. VAPID_SUBJECT 로 덮어쓸 수 있다.
 */
const DEFAULT_VAPID_SUBJECT = 'https://k-haehwadang.com'

/**
 * 환경변수에서 VAPID 키를 읽는다. 둘 중 하나라도 비면 null — «푸시 꺼짐» 상태다.
 * 빌드 시점이 아니라 호출 시점에 읽으므로, 키를 넣고 재배포하면 코드 변경 없이 켜진다.
 */
export function readVapidConfig(): VapidConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!publicKey || !privateKey) return null
  return {
    publicKey,
    privateKey,
    subject: process.env.VAPID_SUBJECT?.trim() || DEFAULT_VAPID_SUBJECT,
  }
}

export function isPushConfigured(): boolean {
  return readVapidConfig() !== null
}

export interface PushPayload {
  title: string
  body: string
  /** 클릭 시 열 앱 내 경로 */
  url?: string
  /** 같은 tag 의 알림은 기기에서 덮어쓴다 — 신탁이 잠금화면에 쌓이지 않게 한다 */
  tag?: string
}

export interface PushSendResult {
  /** VAPID 키가 갖춰져 실제 발송을 시도했는가 */
  configured: boolean
  sent: number
  /** 만료(404/410)로 지운 구독 수 */
  removed: number
  failed: number
}

const NOT_CONFIGURED: PushSendResult = { configured: false, sent: 0, removed: 0, failed: 0 }

interface StoredSubscription {
  endpoint: string
  p256dh: string
  auth_key: string
}

/**
 * 푸시 서비스가 «이 구독은 죽었다»고 알리는 코드. 이 둘일 때만 행을 지운다.
 * 429(속도 제한)·5xx(일시 장애)까지 지우면 멀쩡한 구독이 사라진다.
 */
const GONE_STATUS_CODES = new Set([404, 410])

export function isGoneStatus(status: number): boolean {
  return GONE_STATUS_CODES.has(status)
}

/** web-push 의 WebPushError 는 statusCode 를 싣는다. any 없이 좁혀서 읽는다. */
function statusCodeOf(reason: unknown): number | null {
  if (typeof reason !== 'object' || reason === null || !('statusCode' in reason)) return null
  const code = (reason as { statusCode: unknown }).statusCode
  return typeof code === 'number' ? code : null
}

/**
 * 한 사용자의 모든 기기로 푸시를 보낸다.
 * 만료된 구독은 그 자리에서 지운다 — 죽은 endpoint 가 쌓이면 발송이 계속 느려진다.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushSendResult> {
  const config = readVapidConfig()
  if (!config) return NOT_CONFIGURED

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_id', userId)

    if (error) {
      logger.warn('[webpush] subscription lookup failed:', error)
      return { configured: true, sent: 0, removed: 0, failed: 0 }
    }

    const subscriptions = (data ?? []) as StoredSubscription[]
    if (subscriptions.length === 0) return { configured: true, sent: 0, removed: 0, failed: 0 }

    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)

    const body = JSON.stringify(payload)
    const results = await Promise.allSettled(
      subscriptions.map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, body)
      )
    )

    const deliveredEndpoints: string[] = []
    const goneEndpoints: string[] = []
    let failed = 0

    results.forEach((result, index) => {
      const endpoint = subscriptions[index].endpoint
      if (result.status === 'fulfilled') {
        deliveredEndpoints.push(endpoint)
        return
      }
      const status = statusCodeOf(result.reason)
      if (status !== null && isGoneStatus(status)) {
        goneEndpoints.push(endpoint)
        return
      }
      failed += 1
      // endpoint 는 그 자체가 기기로 가는 비밀 URL 이라 로그에 싣지 않는다.
      logger.warn('[webpush] send failed:', { status })
    })

    let removed = 0
    if (goneEndpoints.length > 0) {
      const { error: deleteError } = await admin.from('push_subscriptions').delete().in('endpoint', goneEndpoints)
      if (deleteError) {
        logger.warn('[webpush] expired subscription cleanup failed:', deleteError)
      } else {
        removed = goneEndpoints.length
      }
    }

    if (deliveredEndpoints.length > 0) {
      const { error: touchError } = await admin
        .from('push_subscriptions')
        .update({ last_success_at: new Date().toISOString() })
        .in('endpoint', deliveredEndpoints)
      if (touchError) logger.warn('[webpush] last_success_at update failed:', touchError)
    }

    return { configured: true, sent: deliveredEndpoints.length, removed, failed }
  } catch (e) {
    logger.warn('[webpush] send skipped:', e)
    return { configured: true, sent: 0, removed: 0, failed: 0 }
  }
}
