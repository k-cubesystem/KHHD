import { loadTossPayments, type TossPaymentsSDK } from '@tosspayments/tosspayments-sdk'

const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY ?? ''

let sdkPromise: Promise<TossPaymentsSDK> | null = null

export const getTossPaymentsSDK = () => {
  if (!sdkPromise && typeof window !== 'undefined') {
    sdkPromise = loadTossPayments(clientKey)
  }
  return sdkPromise
}
