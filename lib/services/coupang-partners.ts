/**
 * 쿠팡 파트너스 오픈API 클라이언트 — 딥링크 생성 (P1-A).
 *
 * 🔴 키는 서버 환경변수 전용: COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY.
 *    코드·레포·클라이언트 번들에 절대 넣지 않는다. 키 부재·API 오류 시 null 을 돌려주고,
 *    호출측(app/actions/ads/coupang.ts)이 수동 폴백 링크(system_settings.coupang_partners_url)로 내려간다
 *    — 광고 기능은 «조용히 숨는» 쪽으로 실패한다(사용자에게 깨진 버튼을 보이지 않는다).
 */

import { createHmac } from 'node:crypto'
import { logger } from '@/lib/utils/logger'
import {
  COUPANG_API_HOST,
  COUPANG_DEEPLINK_PATH,
  coupangAuthorization,
  coupangSignMessage,
  coupangSignedDate,
} from '@/lib/domain/ads/coupang'

const FETCH_TIMEOUT_MS = 6_000

export function hasCoupangApiKeys(): boolean {
  return !!process.env.COUPANG_ACCESS_KEY && !!process.env.COUPANG_SECRET_KEY
}

interface DeeplinkItem {
  originalUrl?: string
  shortenUrl?: string
  landingUrl?: string
}

/** 추적 딥링크 생성. subId 로 방문↔사용자 논스를 잇는다(수익 리포트 대조용). 실패 시 null. */
export async function createCoupangDeeplink(targetUrl: string, subId: string): Promise<string | null> {
  const accessKey = process.env.COUPANG_ACCESS_KEY
  const secretKey = process.env.COUPANG_SECRET_KEY
  if (!accessKey || !secretKey) return null

  try {
    const signedDate = coupangSignedDate(new Date())
    const signature = createHmac('sha256', secretKey)
      .update(coupangSignMessage(signedDate, 'POST', COUPANG_DEEPLINK_PATH))
      .digest('hex')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(`${COUPANG_API_HOST}${COUPANG_DEEPLINK_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: coupangAuthorization(accessKey, signedDate, signature),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coupangUrls: [targetUrl], subId }),
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)

    if (!res.ok) {
      logger.warn('[coupang-partners] deeplink HTTP 실패:', res.status)
      return null
    }
    const json = (await res.json()) as { rCode?: string; data?: DeeplinkItem[] }
    const url = json.data?.[0]?.shortenUrl || json.data?.[0]?.landingUrl
    if (json.rCode !== '0' || !url) {
      logger.warn('[coupang-partners] deeplink 응답 이상 rCode:', json.rCode ?? 'none')
      return null
    }
    return url
  } catch (e) {
    logger.warn('[coupang-partners] deeplink 호출 실패:', e)
    return null
  }
}
