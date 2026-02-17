'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { confirmPayment } from '@/app/actions/payment/payment'
import { startFateAnalysis } from '@/app/actions/core/analysis'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

function PaymentProcessor() {
  const [isMounted, setIsMounted] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const processed = useRef(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || processed.current) return
    processed.current = true

    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const memberId = searchParams.get('memberId')
    const homeAddress = searchParams.get('homeAddress')
    const credits = Number(searchParams.get('credits')) || 1

    if (!paymentKey || !orderId || !memberId) {
      toast.error('잘못된 결제 정보입니다.')
      router.push('/protected/analysis')
      return
    }

    const processAll = async () => {
      try {
        // 1. 결제 승인 (금액은 서버에서 검증)
        await confirmPayment(paymentKey, orderId, credits)
        toast.success(`결제 완료! 복채 ${credits}만냥이 지급되었습니다.`)

        // 3. 분석 시작
        const formData = new FormData()
        formData.append('memberId', memberId)
        if (homeAddress) formData.append('homeAddress', homeAddress)

        await startFateAnalysis(formData)
        toast.success('해화당 비록이 성공적으로 완성되었습니다.')
        router.push('/protected/history')
      } catch (err: any) {
        toast.error(err.message)
        router.push('/protected/analysis')
      }
    }

    processAll()
  }, [searchParams, router, isMounted])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <Loader2 className="w-16 h-16 animate-spin text-primary" />
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gold">기운을 결합하고 있습니다</h2>
        <p className="text-muted-foreground">
          잠시만 기다려 주십시오. 결제 승인 및 비록 생성을 진행 중입니다.
        </p>
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
