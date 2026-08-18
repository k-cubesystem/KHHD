'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { PaymentFailureView } from '@/components/payment/payment-failure-view'
import { isUserCanceled } from '@/lib/domain/payment/payment-failure'
import { GA } from '@/lib/analytics/ga4'

function FailContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const message = searchParams.get('message')

  // 🔴 계측은 렌더 중이 아니라 마운트 후에. 렌더 중 호출은 StrictMode 이중 렌더에서 두 번 찍힌다.
  useEffect(() => {
    GA.paywallClick(isUserCanceled(code) ? 'payment_canceled' : 'payment_fail')
  }, [code])

  return (
    <PaymentFailureView
      code={code}
      message={message}
      retryHref="/protected/store"
      retryLabel="다시 충전하기"
      exitHref="/protected/analysis"
      exitLabel="분석으로 돌아가기"
    />
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <FailContent />
    </Suspense>
  )
}
