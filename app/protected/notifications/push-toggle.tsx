'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellRing, Loader2 } from 'lucide-react'
import { getPushStatus, savePushSubscription, removePushSubscription } from '@/app/actions/notifications/push'
import { trackEvent } from '@/lib/analytics/ga4'
import { logger } from '@/lib/utils/logger'

/**
 * «신탁 알림 받기» 토글.
 *
 * 꺼짐 조건이 둘이고 문구가 다르다.
 *  · VAPID 키 미설정(서버) → «준비 중». 사용자가 할 수 있는 일이 없다.
 *  · 브라우저 미지원/권한 거부 → 그 사정을 그대로 알린다.
 * 키가 들어오면 getPushStatus 가 enabled:true 를 내려 코드 변경 없이 토글이 열린다.
 */

type Phase =
  | { kind: 'loading' }
  /** 이 브라우저가 웹푸시를 못 한다 (iOS 홈화면 미추가 등) */
  | { kind: 'unsupported' }
  /** 서버에 VAPID 키가 없다 */
  | { kind: 'unavailable' }
  /** 알림 권한이 차단됨 — 브라우저 설정에서만 풀 수 있다 */
  | { kind: 'denied' }
  | { kind: 'off'; publicKey: string }
  | { kind: 'on'; publicKey: string }

/** navigator.serviceWorker.ready 는 등록 실패 시 영원히 pending 이다 — 버튼이 멈추지 않게 시한을 둔다. */
const SW_READY_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('SW_TIMEOUT')), ms))])
}

/**
 * VAPID 공개키(base64url) → subscribe 가 받는 바이트 배열.
 * ArrayBuffer 를 먼저 만들어 담는다 — 기본 Uint8Array 는 ArrayBufferLike 라
 * applicationServerKey(BufferSource)에 그대로 들어가지 않는다.
 */
function urlBase64ToUint8Array(base64UrlKey: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64UrlKey.length % 4)) % 4)
  const base64 = (base64UrlKey + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  )
}

export function PushToggle() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const detect = async () => {
      if (!isPushSupported()) {
        if (!cancelled) setPhase({ kind: 'unsupported' })
        return
      }

      const status = await getPushStatus()
      if (cancelled) return
      if (!status.enabled || !status.publicKey) {
        setPhase({ kind: 'unavailable' })
        return
      }
      if (Notification.permission === 'denied') {
        setPhase({ kind: 'denied' })
        return
      }

      // 실제 구독 여부는 브라우저가 정본이다 (다른 기기에서 켠 것과 무관).
      try {
        const registration = await withTimeout(navigator.serviceWorker.ready, SW_READY_TIMEOUT_MS)
        const subscription = await registration.pushManager.getSubscription()
        if (cancelled) return
        setPhase({ kind: subscription ? 'on' : 'off', publicKey: status.publicKey })
      } catch (e) {
        logger.warn('[push] subscription probe failed:', e)
        if (!cancelled) setPhase({ kind: 'off', publicKey: status.publicKey })
      }
    }

    void detect()
    return () => {
      cancelled = true
    }
  }, [])

  const enable = useCallback(async (publicKey: string) => {
    setError(null)
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setPhase(permission === 'denied' ? { kind: 'denied' } : { kind: 'off', publicKey })
      return
    }

    const registration = await withTimeout(navigator.serviceWorker.ready, SW_READY_TIMEOUT_MS)
    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }))

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      setError('구독 정보를 읽지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }

    const result = await savePushSubscription(
      { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
      navigator.userAgent
    )
    if (!result.success) {
      // 서버가 못 받은 구독을 브라우저에만 남기면 «켜졌는데 안 온다»가 된다 — 되돌린다.
      await subscription.unsubscribe().catch(() => undefined)
      setError('알림을 켜지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }

    setPhase({ kind: 'on', publicKey })
    trackEvent({ action: 'push_subscribed', category: 'notification' })
  }, [])

  const disable = useCallback(async (publicKey: string) => {
    setError(null)
    const registration = await withTimeout(navigator.serviceWorker.ready, SW_READY_TIMEOUT_MS)
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // 서버를 먼저 지운다. 로컬 해지가 실패해도 발송 대상에서는 이미 빠져 있다.
      await removePushSubscription(subscription.endpoint)
      await subscription.unsubscribe().catch(() => undefined)
    }

    setPhase({ kind: 'off', publicKey })
    trackEvent({ action: 'push_unsubscribed', category: 'notification' })
  }, [])

  const onToggle = useCallback(async () => {
    if (phase.kind !== 'on' && phase.kind !== 'off') return
    setBusy(true)
    try {
      if (phase.kind === 'off') await enable(phase.publicKey)
      else await disable(phase.publicKey)
    } catch (e) {
      logger.warn('[push] toggle failed:', e)
      setError('알림 설정을 바꾸지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }, [phase, enable, disable])

  if (phase.kind === 'loading' || phase.kind === 'unsupported') return null

  const isOn = phase.kind === 'on'
  const interactive = phase.kind === 'on' || phase.kind === 'off'

  const note =
    phase.kind === 'unavailable'
      ? '준비 중입니다. 곧 신탁을 기기로 전해 드릴 수 있습니다.'
      : phase.kind === 'denied'
        ? '브라우저에서 알림이 차단되어 있습니다. 사이트 설정에서 알림을 허용해 주세요.'
        : isOn
          ? '신이 신탁을 내리면 이 기기로 알려 드립니다.'
          : '신당에 오지 않아도 새 신탁을 이 기기로 받아 보세요.'

  return (
    <div className="rounded-xl border border-gold-500/15 bg-surface/30 p-3.5 mb-4">
      <div className="flex items-center gap-2.5">
        <span
          className={`w-8 h-8 rounded-full grid place-items-center flex-shrink-0 ${
            isOn ? 'bg-gold-500/15 text-gold-300' : 'bg-white/5 text-ink-light/40'
          }`}
        >
          <BellRing className="w-4 h-4" strokeWidth={1.5} />
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-serif font-bold text-ink-light/85">신탁 알림 받기</p>
          <p className="text-[11px] text-ink-light/50 leading-snug mt-0.5">{note}</p>
        </div>

        {interactive && (
          <button
            type="button"
            onClick={() => void onToggle()}
            disabled={busy}
            role="switch"
            aria-checked={isOn}
            aria-label="신탁 알림 받기"
            className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${
              isOn ? 'bg-gold-500/70' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-ink-light grid place-items-center transition-all ${
                isOn ? 'left-[22px]' : 'left-0.5'
              }`}
            >
              {busy && <Loader2 className="w-3 h-3 animate-spin text-surface" />}
            </span>
          </button>
        )}
      </div>

      {error && <p className="text-[11px] text-seal/90 mt-2 pl-[42px]">{error}</p>}
    </div>
  )
}
