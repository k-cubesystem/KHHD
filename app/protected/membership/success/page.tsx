'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { issueBillingKey, executeFirstPayment } from '@/app/actions/payment/subscription'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Crown, Loader2, XCircle, Gift } from 'lucide-react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { logger } from '@/lib/utils/logger'

type Step = 'issuing' | 'paying' | 'success' | 'error'

function MembershipSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('issuing')
  const [error, setError] = useState<string>('')

  const customerKey = searchParams.get('customerKey')
  const authKey = searchParams.get('authKey')
  const planId = searchParams.get('planId')
  const isMock = searchParams.get('mock') === 'true'

  useEffect(() => {
    if (!customerKey || !planId) {
      setError('잘못된 접근입니다.')
      setStep('error')
      return
    }

    processSubscription()
  }, [])

  const processSubscription = async () => {
    try {
      // Mock 모드 (개발 환경)
      if (isMock) {
        setStep('paying')
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Mock 첫 결제 실행
        const paymentResult = await executeFirstPayment(customerKey!)

        if (!paymentResult.success) {
          setError(paymentResult.error || '결제에 실패했습니다.')
          setStep('error')
          return
        }

        setStep('success')
        triggerConfetti()
        return
      }

      // 실제 환경: 빌링키 발급
      if (!authKey) {
        setError('인증 정보가 없습니다.')
        setStep('error')
        return
      }

      // Step 1: 빌링키 발급
      setStep('issuing')
      const billingResult = await issueBillingKey(authKey, customerKey!)

      if (!billingResult.success) {
        setError(billingResult.error || '빌링키 발급에 실패했습니다.')
        setStep('error')
        return
      }

      // Step 2: 첫 결제 실행
      setStep('paying')
      const paymentResult = await executeFirstPayment(customerKey!)

      if (!paymentResult.success) {
        setError(paymentResult.error || '첫 결제에 실패했습니다.')
        setStep('error')
        return
      }

      // Success!
      setStep('success')
      triggerConfetti()
    } catch (err) {
      logger.error('Subscription process error:', err)
      setError('처리 중 오류가 발생했습니다.')
      setStep('error')
    }
  }

  const triggerConfetti = () => {
    const duration = 3000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ECB613', '#C49710', '#FFFFFF'],
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ECB613', '#C49710', '#FFFFFF'],
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-background relative overflow-hidden">
      <div className="hanji-overlay" />

      <Card className="w-full max-w-md bg-background/50 backdrop-blur-md border-primary/20 rounded-xl shadow-2xl overflow-hidden relative z-10">
        <div className="h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

        <CardContent className="p-8 text-center">
          {/* Loading States */}
          {(step === 'issuing' || step === 'paying') && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="w-20 h-20 mx-auto bg-surface rounded-full flex items-center justify-center border border-primary/20">
                <Loader2 className="w-10 h-10 text-primary animate-spin" strokeWidth={1} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-ink-light mb-2">
                  {step === 'issuing' ? '결제 수단 등록 중...' : '첫 결제 진행 중...'}
                </h2>
                <p className="text-ink-light/60 text-sm">잠시만 기다려주세요.</p>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-2 pt-4">
                <div
                  className={`w-3 h-3 rounded-full transition-colors ${step === 'issuing' ? 'bg-primary' : 'bg-white/10'}`}
                />
                <div className="w-8 h-px bg-white/10" />
                <div
                  className={`w-3 h-3 rounded-full transition-colors ${step === 'paying' ? 'bg-primary' : 'bg-white/10'}`}
                />
                <div className="w-8 h-px bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                <Crown className="w-12 h-12 text-primary" strokeWidth={1} />
              </div>

              <div>
                <h2 className="text-2xl font-serif font-bold text-ink-light mb-2">멤버십 가입 완료!</h2>
                <p className="text-ink-light/60 text-sm">해화 멤버십에 오신 것을 환영합니다.</p>
              </div>

              <div className="bg-surface/50 rounded-lg p-4 space-y-3 border border-primary/20">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Gift className="w-5 h-5" strokeWidth={1} />
                  <span className="font-bold">부적 10장이 지급되었습니다!</span>
                </div>
                <p className="text-sm text-ink-light/60">오늘의 운세도 이제 무제한으로 확인할 수 있어요.</p>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  asChild
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-background font-serif font-bold rounded-lg"
                >
                  <Link href="/protected/saju/today">오늘의 운세 확인하기</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-12 border-primary/20 text-ink-light hover:bg-surface rounded-lg"
                >
                  <Link href="/protected">대시보드로 이동</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="w-20 h-20 mx-auto bg-seal/10 rounded-full flex items-center justify-center border border-seal/30">
                <XCircle className="w-10 h-10 text-seal" strokeWidth={1} />
              </div>

              <div>
                <h2 className="text-xl font-serif font-bold text-ink-light mb-2">처리 실패</h2>
                <p className="text-seal font-medium">{error}</p>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  onClick={() => router.push('/protected/membership')}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-background font-serif font-bold rounded-lg"
                >
                  다시 시도하기
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-12 border-primary/20 text-ink-light hover:bg-surface rounded-lg"
                >
                  <Link href="/protected">대시보드로 이동</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function MembershipSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-primary">Loading...</div>}>
      <MembershipSuccessContent />
    </Suspense>
  )
}
