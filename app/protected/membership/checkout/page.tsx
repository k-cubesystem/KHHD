'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getMembershipPlan, createBillingAuthUrl, type MembershipPlan } from '@/app/actions/payment/subscription'
import { getTossPaymentsSDK } from '@/lib/services/tosspayments'
import { Button } from '@/components/ui/button'
import { Crown, Loader2, ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'
import {
  intervalWords,
  membershipBenefitLines,
  servicePeriodLine,
  toPlanFacts,
} from '@/lib/domain/payment/membership-benefits'
import { TIER_LABEL, isMembershipTier } from '@/lib/domain/payment/membership-tiers'
import { PurchaseConsent } from '@/components/payment/purchase-consent'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const planId = searchParams.get('plan')

  const [plan, setPlan] = useState<MembershipPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  // 🔴 카드사 심사가 요구하는 «구매조건 확인 및 결제진행 동의». 동의 전에는 결제로 못 넘어간다.
  const [agreed, setAgreed] = useState(false)

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
  }, [planId, router])

  const handleCheckout = async () => {
    if (!plan || !planId) return
    if (!agreed) {
      setError('구매조건에 동의하셔야 결제를 진행할 수 있습니다.')
      return
    }
    setPaying(true)
    setError('')

    try {
      const result = await createBillingAuthUrl(planId)
      if (!result.success || !result.customerKey) {
        setError(result.error || '결제 준비에 실패했습니다.')
        setPaying(false)
        return
      }

      const sdk = await getTossPaymentsSDK('billing')
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
        setError('결제 모듈 초기화 실패: 환경변수(NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY)를 확인해주세요.')
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

  const tierName = isMembershipTier(plan.tier) ? TIER_LABEL[plan.tier] : plan.name
  const facts = toPlanFacts(plan)

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
          <h1 className="text-2xl font-serif font-light text-white">{tierName} 멤버십</h1>
        </div>

        {/* 플랜 요약 */}
        <div className="bg-surface/30 border border-primary/20 rounded-xl p-6 mb-6">
          <div className="text-center mb-4 pb-4 border-b border-primary/10">
            <div className="text-3xl font-serif font-bold text-primary">
              {intervalWords(plan.interval).price} {plan.price.toLocaleString()}원
            </div>
            <p className="text-white/50 text-xs mt-1">
              {intervalWords(plan.interval).every}마다 자동 결제 · 언제든 해지 가능
            </p>
          </div>
          {/* 상점 멤버십 탭과 같은 목록 — 결제 직전에 혜택이 줄거나 달라 보이지 않게(membership-benefits.ts 가 정본). */}
          <ul className="space-y-2">
            {membershipBenefitLines(facts).map((line) => (
              <li key={line} className="flex items-center gap-2 text-sm text-white/80">
                <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
                {line}
              </li>
            ))}
          </ul>
          <p className="text-white/40 text-[11px] mt-3 leading-relaxed">
            {servicePeriodLine()}
            <br />
            멤버십 이용권은 구독 시작일을 기준으로 한 달마다 새로 열리고, 남은 장은 다음 달로 넘어가지 않습니다. 다 쓰신
            뒤에는 이용권을 따로 구매해 이어 보실 수 있습니다.
          </p>
        </div>

        <div className="mb-4">
          <PurchaseConsent
            checked={agreed}
            onChange={setAgreed}
            orderName={`${tierName} 멤버십`}
            amount={plan.price}
            interval={`${intervalWords(plan.interval).every}마다`}
          />
        </div>

        {error && <p className="text-error-text text-sm text-center mb-4 bg-error-light rounded-lg p-3">{error}</p>}

        <Button
          onClick={handleCheckout}
          disabled={paying || !agreed}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-background font-serif font-bold text-base rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          {paying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              결제 준비 중...
            </>
          ) : (
            `${intervalWords(plan.interval).price} ${plan.price.toLocaleString()}원 결제하기`
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
