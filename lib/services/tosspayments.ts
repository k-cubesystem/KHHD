import { loadTossPayments, type TossPaymentsSDK } from '@tosspayments/tosspayments-sdk'

const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY ?? ''

let sdkPromise: Promise<TossPaymentsSDK> | null = null

export const getTossPaymentsSDK = () => {
  if (!sdkPromise && typeof window !== 'undefined') {
    if (!clientKey) {
      console.error('[TossPayments] NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY 미설정')
      return null
    }
    sdkPromise = loadTossPayments(clientKey)
  }
  return sdkPromise
}

export const getTossWidgets = async (customerKey: string) => {
  const sdk = await getTossPaymentsSDK()
  if (!sdk) return null
  return sdk.widgets({ customerKey })
}
