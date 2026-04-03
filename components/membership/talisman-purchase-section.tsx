'use client'

import { useState } from 'react'
import { getTossPaymentsSDK } from '@/lib/services/tosspayments'
import { Button } from '@/components/ui/button'
import { Check, Coins, Loader2, Zap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { addTestCredits } from '@/app/actions/payment/products'
import type { PricePlan, UserRole } from '@/types/auth'

interface TalismanPurchaseSectionProps {
  initialPlans: PricePlan[]
  userRole: UserRole | string
  memberId: string
}

// 복채 충전 상품 기본값 (DB 연동 실패 시 fallback)
const DEFAULT_BOKCHAE_PLANS = [
  {
    credits: 5,
    price: 50000,
    name: '소복 씨앗',
    description: '가볍게 시작하는 입문 복채 패키지',
    badge_text: null,
    features: ['복채 5만냥', '테마운세 5회', '관상/손금/풍수 2회', '영구 지급'],
  },
  {
    credits: 10,
    price: 99000,
    name: '행운 꾸러미',
    description: '가장 많이 선택하는 실속 복채 패키지',
    badge_text: '가장 인기',
    features: ['복채 10만냥', '테마운세 10회', '관상/손금/풍수 5회', '천지인사주 2회', '영구 지급'],
  },
  {
    credits: 30,
    price: 290000,
    name: '대복 창고',
    description: '넉넉하게 채우는 고급 복채 패키지',
    badge_text: '최대 할인',
    features: ['복채 30만냥', '모든 서비스 자유 이용', '천지인사주 6회', '고민상담 300문', '영구 지급'],
  },
]

// 복채 단가 계산 (만냥 기준)
function getUnitPrice(credits: number, price: number) {
  return Math.round(price / credits / 1000) / 10 // 만냥/복채
}

// 할인율 계산
function getDiscountRate(credits: number, price: number) {
  const basePrice = credits * 10000 // 정가 (1복채=1만냥)
  return Math.round((1 - price / basePrice) * 100)
}

export function TalismanPurchaseSection({ initialPlans, userRole, memberId }: TalismanPurchaseSectionProps) {
  const [loadingPlan, setLoadingPlan] = useState<number | null>(null)
  const [isTestLoading, setIsTestLoading] = useState(false)

  const displayPlans = (initialPlans.length > 0 ? initialPlans : DEFAULT_BOKCHAE_PLANS) as any[]
  const sortedPlans = [...displayPlans].sort((a, b) => (a.sort_order ?? a.price) - (b.sort_order ?? b.price))

  const handleCharge = async (plan: any) => {
    setLoadingPlan(plan.credits)
    try {
      const sdk = await getTossPaymentsSDK()
      if (!sdk) {
        toast.error('결제 모듈을 불러올 수 없습니다.')
        setLoadingPlan(null)
        return
      }

      const orderId = `BOKCHAE_${Date.now()}_${memberId.slice(0, 6)}`
      const payment = sdk.payment({ customerKey: `HHD_${memberId.slice(0, 8)}` })
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: plan.price },
        orderId,
        orderName: `${plan.name} (복채 ${plan.credits}만냥)`,
        successUrl: `${window.location.origin}/protected/analysis/success?memberId=${memberId}&credits=${plan.credits}`,
        failUrl: `${window.location.origin}/protected/analysis/fail`,
        windowTarget: 'self',
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      toast.error(msg)
      setLoadingPlan(null)
    }
  }

  const handleTestCharge = async () => {
    setIsTestLoading(true)
    try {
      const result = await addTestCredits(10)
      if (result.success) {
        toast.success('테스트 복채 10만냥 충전 완료!')
        window.location.reload()
      } else {
        toast.error(result.error || '충전 실패')
      }
    } catch {
      toast.error('시스템 오류')
    } finally {
      setIsTestLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500/10 to-gold-300/10 border border-gold-500/30 rounded-full">
          <Coins className="w-4 h-4 text-gold-400" />
          <span className="text-sm font-serif font-bold text-gold-400 tracking-wide">복채 충전</span>
        </div>
        <p className="text-xs text-white/60">1 복채 = 1만냥 · 충전한 복채는 영구 지급됩니다</p>
      </div>

      {/* 서비스 이용 안내 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: '테마운세', cost: '1만냥', icon: 'theme' },
          { label: '관상·풍수', cost: '2만냥', icon: 'studio' },
          { label: '천지인사주', cost: '5만냥', icon: 'saju' },
        ].map((item) => (
          <div key={item.label} className="bg-white/3 border border-white/8 rounded-lg py-2 px-1">
            <Sparkles className="w-4 h-4 mx-auto mb-0.5 text-gold-400/60" />
            <p className="text-[9px] text-white/50 mb-0.5">{item.label}</p>
            <p className="text-[10px] font-bold text-gold-400">{item.cost}</p>
          </div>
        ))}
      </div>

      {/* 충전 상품 카드 */}
      <div className="space-y-3">
        {sortedPlans.map((plan: any) => {
          const discount = getDiscountRate(plan.credits, plan.price)
          const isPopular = plan.badge_text === '가장 인기'
          const isLoading = loadingPlan === plan.credits

          return (
            <div
              key={plan.credits}
              className={cn(
                'relative rounded-xl border transition-all duration-200 overflow-hidden',
                isPopular
                  ? 'border-gold-500/50 bg-gradient-to-br from-gold-500/8 to-transparent shadow-[0_0_20px_rgba(212,175,55,0.15)]'
                  : 'border-white/10 bg-white/3 hover:border-white/20'
              )}
            >
              {/* 인기 뱃지 */}
              {plan.badge_text && (
                <div
                  className={cn(
                    'absolute top-0 right-0 px-3 py-1 text-[10px] font-bold rounded-bl-xl',
                    isPopular ? 'bg-gold-500 text-background' : 'bg-white/10 text-white/70'
                  )}
                >
                  {plan.badge_text}
                </div>
              )}

              <div className="p-4">
                {/* 상단: 이름 + 금액 */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-serif font-bold text-white">{plan.name}</h3>
                    <p className="text-[11px] text-white/60 mt-0.5">{plan.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    {discount > 0 && (
                      <div className="text-[9px] text-red-400 line-through text-right mb-0.5">
                        {(plan.credits * 10000).toLocaleString()}원
                      </div>
                    )}
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className={cn('text-xl font-serif font-bold', isPopular ? 'text-gold-400' : 'text-white')}>
                        {plan.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-white/60">원</span>
                    </div>
                    {discount > 0 && (
                      <div className="text-[9px] text-green-400 font-bold text-right">{discount}% 할인</div>
                    )}
                  </div>
                </div>

                {/* 복채 수량 강조 */}
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg mb-3',
                    isPopular ? 'bg-gold-500/10 border border-gold-500/20' : 'bg-white/5'
                  )}
                >
                  <Coins className={cn('w-4 h-4', isPopular ? 'text-gold-400' : 'text-white/60')} />
                  <span className={cn('text-sm font-bold', isPopular ? 'text-gold-300' : 'text-white/80')}>
                    복채 {plan.credits}만냥 지급
                  </span>
                  <span className="ml-auto text-[9px] text-white/40">
                    단가{' '}
                    {(plan.price / plan.credits / 1000) % 1 === 0
                      ? plan.price / plan.credits / 1000
                      : (plan.price / plan.credits / 1000).toFixed(1)}
                    천원/복채
                  </span>
                </div>

                {/* 혜택 목록 */}
                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {(plan.features || []).map((feature: string, i: number) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-primary/70 flex-shrink-0" />
                      <span className="text-[10px] text-white/60">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* 충전 버튼 */}
                <Button
                  onClick={() => handleCharge(plan)}
                  disabled={loadingPlan !== null}
                  className={cn(
                    'w-full h-11 font-bold text-sm transition-all',
                    isPopular
                      ? 'bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 text-background shadow-md hover:shadow-gold-500/30'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/15 hover:border-white/30'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      복채 {plan.credits}만냥 충전하기
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 충전 안내 */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-1.5">
        <p className="text-[10px] font-bold text-white/60 mb-2">복채 충전 안내</p>
        {[
          '충전된 복채는 만료 기간 없이 영구 사용 가능합니다',
          '결제 완료 즉시 복채가 지급됩니다',
          '환불은 미사용 복채에 한해 7일 이내 가능합니다',
          '멤버십 일일 복채와 별도로 합산 적용됩니다',
        ].map((text, i) => (
          <p key={i} className="text-[9px] text-white/40 flex items-start gap-1.5">
            <span className="text-primary/40 mt-0.5">·</span>
            {text}
          </p>
        ))}
      </div>

      {/* Admin 테스트 충전 */}
      {(userRole === 'admin' || userRole === 'tester') && (
        <div className="border-2 border-dashed border-seal/30 bg-seal/5 rounded-xl p-4 text-center">
          <p className="text-[10px] text-seal/60 mb-3 uppercase tracking-widest font-bold">Admin Zone</p>
          <Button
            onClick={handleTestCharge}
            disabled={isTestLoading}
            variant="ghost"
            className="text-seal hover:text-seal-light hover:bg-seal/10 font-mono text-[10px] gap-2 border border-seal/30"
          >
            {isTestLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            TEST: 복채 10만냥 무료 충전
          </Button>
        </div>
      )}
    </div>
  )
}
