'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getTossPaymentsSDK } from '@/lib/services/tosspayments'
import { PurchaseConsent } from '@/components/payment/purchase-consent'
import { GA } from '@/lib/analytics/ga4'
import { logger } from '@/lib/utils/logger'

/**
 * 복채 주문 확인 화면의 결제 버튼.
 *
 * 🔴 결제창을 여는 값(금액·상품명)은 **서버가 DB 에서 읽어 내려준 것**만 쓴다.
 *    이 컴포넌트가 가격을 계산하면 브라우저에서 바꿔 부를 수 있다.
 * 🔴 동의 전에는 버튼이 잠긴다 — 체크를 받고도 결제가 되면 받는 의미가 없다.
 */
export function BokchaeCheckoutClient({
  memberId,
  packId,
  orderName,
  amount,
  credits,
}: {
  memberId: string
  packId: string
  orderName: string
  amount: number
  credits: number
}) {
  const [agreed, setAgreed] = useState(false)
  const [paying, setPaying] = useState(false)

  const handlePay = async () => {
    if (!agreed) {
      toast.error('구매조건에 동의하셔야 결제를 진행할 수 있습니다.')
      return
    }
    setPaying(true)
    GA.checkoutStart(orderName, amount)

    try {
      const sdk = await getTossPaymentsSDK('general')
      if (!sdk) {
        GA.checkoutFail(orderName, 'sdk_unavailable')
        toast.error('결제 모듈을 불러올 수 없습니다.')
        setPaying(false)
        return
      }

      const orderId = `BOKCHAE_${Date.now()}_${memberId.slice(0, 6)}`
      const payment = sdk.payment({ customerKey: `HHD_${memberId.slice(0, 8)}` })
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName,
        successUrl: `${window.location.origin}/protected/analysis/success?memberId=${memberId}&credits=${credits}`,
        failUrl: `${window.location.origin}/protected/analysis/fail`,
        windowTarget: 'self',
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      logger.error('[복채 결제] error:', msg)
      GA.checkoutFail(orderName, msg.slice(0, 40))
      toast.error(msg)
      setPaying(false)
    }
  }

  void packId

  return (
    <>
      <div className="mb-4">
        <PurchaseConsent checked={agreed} onChange={setAgreed} orderName={orderName} amount={amount} />
      </div>

      <Button
        onClick={handlePay}
        disabled={paying || !agreed}
        className="h-14 w-full rounded-lg bg-gold-500 font-serif text-base font-bold text-ink-950 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:bg-gold-400"
      >
        {paying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            결제 준비 중...
          </>
        ) : (
          `${amount.toLocaleString('ko-KR')}원 결제하기`
        )}
      </Button>

      <p className="mt-4 text-center font-sans text-xs text-ink-light/40">토스페이먼츠 안전 결제 · SSL 암호화</p>
    </>
  )
}
