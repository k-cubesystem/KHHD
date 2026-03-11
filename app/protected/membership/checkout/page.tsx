'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getMembershipPlan, createBillingAuthUrl, type MembershipPlan } from '@/app/actions/payment/subscription'
import { getTossPaymentsSDK } from '@/lib/services/tosspayments'
import { Button } from '@/components/ui/button'
import { Crown, Loader2, ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const planId = searchParams.get('plan')

  const [plan, setPlan] = useState<MembershipPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!planId) {
      router.replace('/protected/membership')
      return
    }
    getMembershipPlan(planId).then((p) => {
      if (!p) router.replace('/protected/membership')
      else setPlan(p)
      setLoading(false)
    })
  }, [planId])

  const handleCheckout = async () => {
    if (!plan || !planId) return
    setPaying(true)
    setError('')

    try {
      const result = await createBillingAuthUrl(planId)
      if (!result.success || !result.customerKey) {
        setError(result.error || '결제 준비에 실패했습니다.')
        setPaying(false)
        return
      }

      const sdk = await getTossPaymentsSDK()
      if (!sdk) {
        setError('결제 모듈을 불러올 수 없습니다.')
        setPaying(false)
        return
      }

      const payment = sdk.payment({ customerKey: result.customerKey })
      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${window.location.origin}/protected/membership/success?customerKey=${result.customerKey}&planId=${planId}`,
        failUrl: `${window.location.origin}/protected/membership/fail`,
        windowTarget: 'self',
      })
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error('[Checkout] error:', errMsg)
      if (errMsg.includes('UserCancel') || errMsg.includes('사용자')) {
        setError('결제가 취소되었습니다.')
      } else if (errMsg.includes('clientKey') || errMsg.includes('client_key')) {
        setError('결제 모듈 초기화 실패: 환경변수(TOSS_CLIENT_KEY)를 확인해주세요.')
      } else {
        setError(errMsg || '결제 중 오류가 발생했습니다.')
      }
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!plan) return null

  const tierLabel: Record<string, string> = {
    SINGLE: '싱글',
    FAMILY: '패밀리',
    BUSINESS: '비즈니스',
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-[480px] mx-auto px-4 py-8 pb-24">
        <Link
          href="/protected/membership"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1} />
          멤버십으로 돌아가기
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-4">
            <Crown className="w-4 h-4 text-primary" strokeWidth={1} />
            <span className="text-primary text-xs tracking-wide">결제 확인</span>
          </div>
          <h1 className="text-2xl font-serif font-light text-white">{tierLabel[plan.tier] || plan.name} 멤버십</h1>
        </div>

        {/* 플랜 요약 */}
        <div className="bg-surface/30 border border-primary/20 rounded-xl p-6 mb-6">
          <div className="text-center mb-4 pb-4 border-b border-primary/10">
            <div className="text-3xl font-serif font-bold text-primary">월 {plan.price.toLocaleString()}원</div>
            <p className="text-white/50 text-xs mt-1">매월 자동 결제 · 언제든 해지 가능</p>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-white/80">
              <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
              일일 복채 {plan.daily_talisman_limit}만냥 지급
            </li>
            <li className="flex items-center gap-2 text-sm text-white/80">
              <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
              인연 {plan.relationship_limit}명 등록
            </li>
            <li className="flex items-center gap-2 text-sm text-white/80">
              <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
              결과 {plan.storage_limit === 999 ? '무제한' : `${plan.storage_limit}개`} 저장
            </li>
          </ul>
        </div>

        {error && <p className="text-red-400 text-sm text-center mb-4 bg-red-400/10 rounded-lg p-3">{error}</p>}

        <Button
          onClick={handleCheckout}
          disabled={paying}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-background font-serif font-bold text-base rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          {paying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              결제 준비 중...
            </>
          ) : (
            `월 ${plan.price.toLocaleString()}원 결제하기`
          )}
        </Button>

        <p className="text-center text-white/40 text-xs mt-4">토스페이먼츠 안전 결제 · SSL 암호화</p>
      </div>
    </div>
  )
}

export default function MembershipCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
