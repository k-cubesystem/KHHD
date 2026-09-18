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
import { useRefreshPasses } from '@/hooks/use-passes'
import { formatPassUnits } from '@/lib/domain/entitlement/pass'

/** 만료 시각 → «12월 17일». 형식이 틀리면 빈 문자열(문구에서 날짜를 빼고 말한다). */
function monthDay(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

/**
 * 이용권 구매 결제의 승인 화면.
 *
 * 🔴 여기서 풀이를 돌리지 않는다. 2026-09-01 까지 이 화면은 승인 직후
 *    `startFateAnalysis` 를 무조건 호출해 Gemini PRO 종합 리포트를 만들고
 *    /protected/history 로 보냈다. 사용자는 결제만 했는데 요청하지도 않은
 *    간판 유료 상품이 공짜로 나갔고(PRO 호출 원가도 결제 건마다 붙었다),
 *    그 호출이 실패하면 승인은 이미 끝났는데 화면은 「결제 승인 실패」를 띄웠다.
 *    이 화면을 부르는 곳은 이용권 주문 확인 화면뿐이다 — 풀이를 기대하는 호출자는 없다.
 */
function PaymentProcessor() {
  // 결제 승인은 하이드레이션 이후에만 — 서버 렌더 단계에서 돌지 않게 막는 기존 관문 그대로다.
  const isMounted = useHydrated()
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations('analysis')
  const refreshPasses = useRefreshPasses()
  const processed = useRef(false)

  useEffect(() => {
    if (!isMounted || processed.current) return
    processed.current = true

    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const memberId = searchParams.get('memberId')
    // 장 수로 서버가 상품을 다시 찾는다 — 빠졌을 때 1장으로 짐작하면 다른 상품의 금액으로 승인을 부른다.
    const passes = Number(searchParams.get('passes'))

    if (!paymentKey || !orderId || !memberId || !Number.isInteger(passes) || passes <= 0) {
      toast.error('잘못된 결제 정보입니다.')
      router.push('/protected/analysis')
      return
    }

    const processAll = async () => {
      try {
        // 1. 결제 승인 — 금액 대조·발급은 서버가 한다. 화면은 서버가 돌려준 장 수·기한만 보여준다.
        const confirmRes = await confirmPayment(paymentKey, orderId, passes)
        const granted = confirmRes.grantedPasses
        // 토스 승인 응답은 형이 없는 JSON 이다 — 금액은 있을 때만 싣는다.
        const paid =
          'totalAmount' in confirmRes && typeof confirmRes.totalAmount === 'number' ? confirmRes.totalAmount : 0
        GA.passPurchase(granted, paid)
        void refreshPasses()
        // 구매 완료 연출 — 컨페티(F-4)
        confetti({
          particleCount: 120,
          spread: 72,
          origin: { y: 0.6 },
          colors: ['#C9A84C', '#E8D5A0', '#9E2B2B', '#ffffff'],
        })
        const until = monthDay(confirmRes.expiresAt)
        toast.success(
          until
            ? `${formatPassUnits(granted)}을 드렸어요. ${until}까지 쓰실 수 있어요.`
            : `${formatPassUnits(granted)}을 드렸어요.`
        )

        // 2. 구매가 끝났으면 여기서 끝이다 — 사용자는 이용권을 샀지 풀이를 산 게 아니다.
        router.push('/protected/analysis')
      } catch (err: unknown) {
        logger.error('[결제 승인 실패]', err)
        toast.error(err instanceof Error ? err.message : String(err))
        router.push('/protected/analysis')
      }
    }

    processAll()
  }, [searchParams, router, isMounted, refreshPasses])

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
