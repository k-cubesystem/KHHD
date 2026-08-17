import { loadTossPayments, type TossPaymentsSDK } from '@tosspayments/tosspayments-sdk'
import { logger } from '@/lib/utils/logger'

/**
 * 토스 SDK 로더 — 상점(MID)이 둘이라 **클라이언트 키도 둘**이다.
 *
 * · `general` → 일반결제 `khaehwjxqe`      : 복채 충전(결제위젯 · requestPayment)
 * · `billing` → 정기결제 `bill_khaehqj1a`  : 멤버십(requestBillingAuth)
 *
 * 🔴 하나의 SDK 인스턴스를 둘이 같이 쓰면, 한쪽 상점의 결제가 다른 상점 키로 나가 거절된다.
 *    결제를 여는 화면은 반드시 **자기 용도**를 밝힌다.
 *
 * 🔴 `process.env.NEXT_PUBLIC_*` 은 **리터럴로** 써야 Next 가 빌드 때 값을 박아 넣는다.
 *    변수로 조립하면 런타임에 `undefined` 가 되어 결제창이 조용히 안 뜬다.
 *
 * ⚠️ 그래서 키를 바꾸면 **재배포**해야 반영된다(환경변수만 고쳐서는 안 바뀐다).
 *
 * 폴백: 새 이름이 비어 있으면 옛 이름(`NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY`)으로 떨어진다.
 * 빌링 키가 없으면 일반 키를 쓴다 — 키 한 쌍이던 지금 동작 그대로다.
 */
export type TossPurpose = 'general' | 'billing'

const GENERAL_CLIENT_KEY =
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY || ''

const BILLING_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY || GENERAL_CLIENT_KEY

/** 용도별 클라이언트 키. 화면에서 «어떤 변수를 심어야 하는지» 안내할 때도 쓴다. */
export const TOSS_CLIENT_KEY_ENV_NAME: Record<TossPurpose, string> = {
  general: 'NEXT_PUBLIC_TOSS_CLIENT_KEY',
  billing: 'NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY',
}

function clientKeyFor(purpose: TossPurpose): string {
  return purpose === 'billing' ? BILLING_CLIENT_KEY : GENERAL_CLIENT_KEY
}

const sdkCache = new Map<TossPurpose, Promise<TossPaymentsSDK>>()

export const getTossPaymentsSDK = (purpose: TossPurpose = 'general') => {
  if (typeof window === 'undefined') return null

  const cached = sdkCache.get(purpose)
  if (cached) return cached

  const clientKey = clientKeyFor(purpose)
  if (!clientKey) {
    // 🔴 console.error 단독으로 두면 Sentry 에 안 올라가 «결제가 안 된다» 는 제보만 남는다.
    logger.error('[TossPayments] 클라이언트 키 미설정 — 결제창을 열 수 없습니다', {
      purpose,
      expectedEnv: TOSS_CLIENT_KEY_ENV_NAME[purpose],
    })
    return null
  }

  const promise = loadTossPayments(clientKey)
  sdkCache.set(purpose, promise)
  return promise
}

/** 결제위젯(복채 충전) — 일반결제 상점 전용. */
export const getTossWidgets = async (customerKey: string) => {
  const sdk = await getTossPaymentsSDK('general')
  if (!sdk) return null
  return sdk.widgets({ customerKey })
}
