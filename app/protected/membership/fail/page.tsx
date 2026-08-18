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

  useEffect(() => {
    GA.paywallClick(isUserCanceled(code) ? 'membership_canceled' : 'membership_fail')
  }, [code])

  return (
    <PaymentFailureView
      code={code}
      message={message}
      retryHref="/protected/membership"
      retryLabel="멤버십 다시 보기"
      exitHref="/protected"
      exitLabel="나중에 하기"
    />
  )
}

export default function MembershipFailPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <FailContent />
    </Suspense>
  )
}
