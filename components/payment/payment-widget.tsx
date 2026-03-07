'use client'

import { useState, useEffect } from 'react'
import { getTossPaymentsSDK } from '@/lib/services/tosspayments'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Check,
  Sparkles,
  Loader2,
  Zap,
  ShieldCheck,
  Crown,
  Gift,
  Calendar,
  MessageCircle,
  Ticket,
  Users,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getActivePlans, getCurrentUserRole, addTestCredits } from '@/app/actions/payment/products'
import { getMembershipPlans, createBillingAuthUrl, getSubscriptionStatus } from '@/app/actions/payment/subscription'
import type { PricePlan, UserRole } from '@/types/auth'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PaymentWidgetProps {
  memberId: string
  homeAddress?: string
  onCancel?: () => void
}

interface DisplayPlan {
  id?: string
  credits: number
  price: number
  label: string
  description: string
  badge?: string
  features: string[]
  popular?: boolean
}

export function PaymentWidget({ memberId, homeAddress, onCancel }: PaymentWidgetProps) {
  const [activeTab, setActiveTab] = useState<string>('membership')
  const [selectedPlan, setSelectedPlan] = useState<number>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [pricePlans, setPricePlans] = useState<DisplayPlan[]>([])
  const [membershipPlans, setMembershipPlans] = useState<any[]>([])
  const [userRole, setUserRole] = useState<UserRole>('user')
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
    loadData()
  }, [])

  async function loadData() {
    try {
      const [plansData, memberPlansData, roleData, statusData] = await Promise.all([
        getActivePlans(),
        getMembershipPlans(),
        getCurrentUserRole(),
        getSubscriptionStatus(),
      ])

      const displayPlans: DisplayPlan[] = plansData.map((plan: PricePlan) => ({
        credits: plan.credits,
        price: plan.price,
        label: plan.name,
        description: plan.description || '',
        badge: plan.badge_text || undefined,
        features: plan.features || [],
        popular: plan.badge_text === '가장 인기',
      }))

      setPricePlans(displayPlans)
      setMembershipPlans(memberPlansData)
      setUserRole(roleData.role)
      setSubscriptionStatus(statusData)

      if (statusData.isSubscribed) {
        setActiveTab('talisman')
      }
    } catch (error) {
      console.error('[PaymentWidget] Error loading data:', error)
      // Fallback plans if DB fails
      setPricePlans([
        {
          credits: 3,
          price: 9900,
          label: '소복 씨앗',
          description: '가볍게 시작하는 입문 복채 패키지',
          features: ['복채 3만냥', '정밀 분석 리포트', '영구 소장'],
        },
        {
          credits: 10,
          price: 99000,
          label: '행운 꾸러미',
          description: '많은 분들이 선택하는 실속 패키지',
          badge: '가장 인기',
          features: ['복채 10만냥', '정밀 분석 리포트', '영구 소장', '커플/궁합 분석'],
        },
        {
          credits: 30,
          price: 290000,
          label: '대복 창고',
          description: '전문가 및 다인 분석 패키지',
          badge: '최저가',
          features: ['복채 30만냥', 'VIP 우선 분석', 'PDF 리포트 제공', '무제한 가족 등록'],
        },
      ])
    }
  }

  const handleMembershipPayment = async (planId: string) => {
    setIsLoading(true)
    try {
      const result = await createBillingAuthUrl(planId)
      if (!result.success || !result.customerKey) {
        toast.error(result.error || '구독 준비에 실패했습니다.')
        return
      }

      const sdk = await getTossPaymentsSDK()
      if (!sdk) throw new Error('결제 모듈 로드 실패')

      const payment = sdk.payment({ customerKey: result.customerKey })
      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${window.location.origin}/protected/membership/success?customerKey=${result.customerKey}&planId=${planId}`,
        failUrl: `${window.location.origin}/protected/membership/fail`,
        windowTarget: 'self',
      })
    } catch (error) {
      toast.error('구독 처리 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  const handleTalismanPayment = async () => {
    setIsLoading(true)
    try {
      const sdk = await getTossPaymentsSDK()
      if (!sdk) {
        toast.error('결제 모듈을 불러올 수 없습니다.')
        setIsLoading(false)
        return
      }
      const plan = pricePlans.find((p) => p.credits === selectedPlan)!
      const orderId = `HHD_${Date.now()}_${memberId.slice(0, 4)}`

      const payment = sdk.payment({ customerKey: `HHD_${memberId.slice(0, 8)}` })
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: plan.price },
        orderId,
        orderName: plan.label,
        successUrl: `${window.location.origin}/protected/analysis/success?memberId=${memberId}&homeAddress=${encodeURIComponent(homeAddress || '')}&credits=${plan.credits}`,
        failUrl: `${window.location.origin}/protected/analysis/fail`,
        windowTarget: 'self',
      })
    } catch (error: any) {
      toast.error(error.message || '결제 준비 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  const handleTestCharge = async () => {
    setIsTestLoading(true)
    try {
      const result = await addTestCredits(100)
      if (result.success) {
        toast.success(`테스트 복채 100만냥 충전 완료!`)
        window.location.reload()
      } else {
        toast.error(result.error || '충전 실패')
      }
    } catch (error) {
      toast.error('시스템 오류')
    } finally {
      setIsTestLoading(false)
    }
  }

  if (!isMounted) return null

  return (
    <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Hybrid Info Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-zen-border rounded-sm shadow-sm">
          <ShieldCheck className="w-4 h-4 text-zen-gold" />
          <span className="text-[10px] font-bold text-zen-muted uppercase tracking-[0.2em]">
            Haehwadang Hybrid Payment System
          </span>
        </div>
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-zen-text italic">
          운명을 여는 <span className="text-zen-wood">길(道)</span>의 선택
        </h2>
        <div className="text-zen-muted text-sm max-w-xl mx-auto leading-relaxed">
          <p>매달 전해지는 천기를 무제한으로 누리는 멤버십과</p>
          <p>필요할 때마다 정성을 담아 사용하는 복채 패키지 중 선택해 주세요.</p>
          <p className="mt-2 text-zen-wood font-bold">* 무료 회원은 &apos;오늘의 운세&apos;만 이용 가능합니다.</p>
        </div>
      </div>

      <div className="space-y-16">
        {/* Section 1: Membership Plans */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Crown className="w-6 h-6 text-zen-gold" />
            <h3 className="text-2xl font-serif font-bold text-zen-text">해화 멤버십 (Subscription)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {membershipPlans.map((plan) => (
              <Card
                key={plan.id}
                className="relative overflow-hidden border-zen-gold bg-white rounded-sm shadow-lg border-t-4 flex flex-col"
              >
                <div className="p-6 flex-1 space-y-6">
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-serif font-bold text-zen-text">{plan.name}</h3>
                    {plan.tier === 'FAMILY' && (
                      <Badge className="bg-zen-gold text-white font-bold px-2 py-0.5 rounded-sm mx-auto flex w-fit">
                        BEST CHOICE
                      </Badge>
                    )}
                    <p className="text-zen-muted font-sans text-sm italic h-10 flex items-center justify-center">
                      &quot;{plan.description}&quot;
                    </p>
                  </div>

                  <div className="text-center pb-4 border-b border-zen-border/50">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-serif font-bold text-zen-text">{plan.price.toLocaleString()}</span>
                      <span className="text-base text-zen-muted">원</span>
                    </div>
                    <p className="text-[10px] text-zen-muted uppercase tracking-widest mt-1">Per Month</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Gift className="w-4 h-4 text-zen-wood shrink-0" />
                      <span className="text-sm text-zen-text">
                        매월 <strong>복채 {plan.talismans_per_period}만냥</strong> 지급
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-zen-wood shrink-0" />
                      <span className="text-sm text-zen-text">
                        하루 <strong>{plan.daily_talisman_limit}만냥</strong> 사용 가능
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-zen-wood shrink-0" />
                      <span className="text-sm text-zen-text">오늘의 운세 무제한</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-4 h-4 text-zen-wood shrink-0" />
                      <span className="text-sm text-zen-text">알림톡 서비스</span>
                    </div>
                    {plan.name === '패밀리 멤버십' && (
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-zen-wood shrink-0" />
                        <span className="text-sm text-zen-text">가족 궁합 분석</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 pt-0 bg-gray-50/50 mt-auto">
                  <Button
                    onClick={() => handleMembershipPayment(plan.id)}
                    disabled={isLoading}
                    className="w-full bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold shadow-md h-12"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '구독하기'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Section 2: Talisman Plans */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Ticket className="w-6 h-6 text-zen-wood" />
            <h3 className="text-2xl font-serif font-bold text-zen-text">복채 충전소 (One-time)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricePlans.map((plan) => (
              <Card
                key={plan.credits}
                className={cn(
                  'relative flex flex-col transition-all duration-300 overflow-hidden group border rounded-sm bg-white hover:shadow-lg border-zen-border'
                )}
              >
                {plan.badge && (
                  <div className="absolute top-0 right-0">
                    <div
                      className={cn(
                        'text-[10px] font-bold px-3 py-1 rounded-bl-sm uppercase tracking-wider',
                        plan.popular ? 'bg-zen-gold text-white' : 'bg-zen-wood text-white'
                      )}
                    >
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className="p-6 flex-1 space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-serif font-bold text-xl text-zen-text">{plan.label}</h4>
                    <p className="text-xs text-zen-muted font-sans line-clamp-2 min-h-[2.5em]">{plan.description}</p>
                  </div>

                  <div className="flex items-center justify-between pb-4 border-b border-zen-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-zen-bg flex items-center justify-center text-zen-gold">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-zen-text">{plan.credits}장</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-serif font-bold text-zen-text">{plan.price.toLocaleString()}</span>
                      <span className="text-xs text-zen-muted">원</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {plan.features.slice(0, 3).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-zen-text/80">
                        <Check className="w-3 h-3 text-zen-gold shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gray-50/50">
                  <Button
                    onClick={async () => {
                      setIsLoading(true)
                      try {
                        const tossPayments = await getTossPayments()
                        if (!tossPayments) {
                          toast.error('결제 모듈을 불러올 수 없습니다.')
                          setIsLoading(false)
                          return
                        }
                        await tossPayments.requestPayment('카드', {
                          amount: plan.price,
                          orderId: `HHD_${Date.now()}_${memberId.slice(0, 4)}`,
                          orderName: plan.label,
                          successUrl: `${window.location.origin}/protected/analysis/success?memberId=${memberId}&homeAddress=${encodeURIComponent(homeAddress || '')}&credits=${plan.credits}`,
                          failUrl: `${window.location.origin}/protected/analysis/fail`,
                        })
                      } catch (error: any) {
                        toast.error(error.message || '결제 준비 중 오류가 발생했습니다.')
                        setIsLoading(false)
                      }
                    }}
                    disabled={isLoading}
                    className="w-full bg-zen-bg text-zen-wood border border-zen-wood/20 hover:bg-zen-wood hover:text-white font-bold h-10 transition-colors"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '충전하기'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Tester/Admin Test Charge Button */}
      {(userRole === 'admin' || userRole === 'tester') && (
        <div className="border-t border-zen-border pt-10 text-center">
          <Button
            onClick={handleTestCharge}
            disabled={isTestLoading}
            variant="ghost"
            className="text-zen-muted hover:text-zen-wood hover:bg-zen-bg font-mono text-xs gap-2"
          >
            {isTestLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            DEVELOPER: ADD TEST 100 TALISMANS
          </Button>
        </div>
      )}
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
    >
      {children}
    </span>
  )
}
