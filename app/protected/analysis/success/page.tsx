'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { confirmPayment } from '@/app/actions/payment/payment'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import confetti from 'canvas-confetti'
import { GA } from '@/lib/analytics/ga4'
import { logger } from '@/lib/utils/logger'
import { useHydrated } from '@/hooks/use-hydrated'

/**
 * 복채 충전 결제의 승인 화면.
 *
 * 🔴 여기서 풀이를 돌리지 않는다. 2026-09-01 까지 이 화면은 승인 직후
 *    `startFateAnalysis` 를 무조건 호출해 Gemini PRO 종합 리포트를 만들고
 *    /protected/history 로 보냈다. 사용자는 «복채»를 샀는데 요청하지도 않은
 *    간판 유료 상품이 공짜로 나갔고(PRO 호출 원가도 결제 건마다 붙었다),
 *    그 호출이 실패하면 승인은 이미 끝났는데 화면은 「결제 승인 실패」를 띄웠다.
 *    이 화면을 부르는 곳은 복채 충전 두 경로뿐이다 — 풀이를 기대하는 호출자는 없다.
 */
function PaymentProcessor() {
  // 결제 승인은 하이드레이션 이후에만 — 서버 렌더 단계에서 돌지 않게 막는 기존 관문 그대로다.
  const isMounted = useHydrated()
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations('analysis')
  const processed = useRef(false)

  useEffect(() => {
    if (!isMounted || processed.current) return
    processed.current = true

    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const memberId = searchParams.get('memberId')
    const credits = Number(searchParams.get('credits')) || 1

    if (!paymentKey || !orderId || !memberId) {
      toast.error('잘못된 결제 정보입니다.')
      router.push('/protected/analysis')
      return
    }

    const processAll = async () => {
      try {
        // 1. 결제 승인 (금액·보너스·첫구매2배는 서버에서 검증·계산)
        const confirmRes = await confirmPayment(paymentKey, orderId, credits)
        const credited = confirmRes && typeof confirmRes.creditedTotal === 'number' ? confirmRes.creditedTotal : credits
        GA.bokchaeCharge(credits * 10000)
        // 충전 완료 연출 — 컨페티(F-4)
        confetti({
          particleCount: 120,
          spread: 72,
          origin: { y: 0.6 },
          colors: ['#C9A84C', '#E8D5A0', '#9E2B2B', '#ffffff'],
        })
        toast.success(
          confirmRes?.isFirstPurchase
            ? `첫 충전 2배! 복채 ${credited}만냥이 들어왔습니다 🎉`
            : `복채 ${credited}만냥이 들어왔습니다 🎉`
        )

        // 2. 충전이 끝났으면 여기서 끝이다 — 사용자는 복채를 샀지 풀이를 산 게 아니다.
        router.push('/protected/analysis')
      } catch (err: unknown) {
        logger.error('[결제 승인 실패]', err)
        toast.error(err instanceof Error ? err.message : String(err))
        router.push('/protected/analysis')
      }
    }

    processAll()
  }, [searchParams, router, isMounted])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <Loader2 className="w-16 h-16 animate-spin text-primary" />
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gold">{t('processing')}</h2>
        <p className="text-muted-foreground">{t('processingDesc')}</p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-gold">준비 중입니다</h2>
            <p className="text-muted-foreground">잠시만 기다려 주십시오.</p>
          </div>
        </div>
      }
    >
      <PaymentProcessor />
    </Suspense>
  )
}
