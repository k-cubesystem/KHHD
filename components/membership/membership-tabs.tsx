'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { GA } from '@/lib/analytics/ga4'
import {
  intervalWords,
  servicePeriodLine,
  membershipBenefitLines,
  toPlanFacts,
} from '@/lib/domain/payment/membership-benefits'

interface Plan {
  id: string
  name: string
  tier: string
  price: number
  interval: string
  relationship_limit: number
  storage_limit: number
  monthly_passes: number
}

interface MembershipTabsProps {
  plans: Plan[]
  isGuest: boolean
}

export function MembershipTabs({ plans, isGuest }: MembershipTabsProps) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState(plans?.[1]?.tier || plans?.[0]?.tier || 'FAMILY')

  // 플랜이 없으면 에러 방지
  if (!plans || plans.length === 0) {
    return (
      <div className="text-center p-8 text-white/60">
        <p className="text-sm">멤버십 플랜을 불러오는 중입니다...</p>
      </div>
    )
  }

  const currentPlan = plans.find((p) => p.tier === selectedPlan) || plans[0]

  // currentPlan이 없으면 에러 방지
  if (!currentPlan) {
    return (
      <div className="text-center p-8 text-white/60">
        <p className="text-sm">플랜 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  // 등급별 특징 — 문구·숫자는 membership-benefits.ts·membership-tiers.ts(단일 출처)에서 파생한다.
  // 🔴 여기에 숫자나 «매일/무제한»을 직접 쓰지 말 것: 월 이용권은 이월되지 않고, 멤버십이 여는 것은
  //    기능과 한 달 몫이지 사용량 무제한이 아니다. 실제로 없는 기능(예정·우선 지원 등)을 적지 않는다.
  // 🔴 membership_plans.features 의 깃발(pdf_archive·kakao_daily)로 혜택 줄을 만들지 않는다 — 깃발은 전 등급 true 인데
  //    PDF 내려받기는 구현이 없고, 카카오 알림 크론은 구독 상태를 소문자 'active' 로 찾아 받는 사람이 0명이다.
  const tierFeatures = membershipBenefitLines(toPlanFacts(currentPlan))

  const handleSelectPlan = () => {
    GA.membershipCta(currentPlan.tier)
    if (isGuest) {
      router.push('/auth/login')
    } else {
      router.push(`/protected/membership/checkout?plan=${currentPlan.id}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="멤버십 플랜 선택"
        className="flex gap-2 p-1.5 bg-surface/50 border border-primary/20 rounded-xl"
      >
        {plans.map((plan) => (
          <button
            key={plan.tier}
            role="tab"
            aria-selected={selectedPlan === plan.tier}
            onClick={() => setSelectedPlan(plan.tier)}
            className={`flex-1 py-3 px-4 text-sm font-serif font-bold transition-all rounded-lg ${
              selectedPlan === plan.tier ? 'bg-primary text-background shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            {plan.name}
          </button>
        ))}
      </div>

      {/* Selected Plan Card */}
      <div
        role="tabpanel"
        aria-label={currentPlan.name + ' 플랜 상세'}
        className="bg-surface/30 border-2 border-primary/30 rounded-xl p-6 shadow-lg dancheong-border-top"
      >
        {/* Price */}
        <div className="text-center mb-6 pb-6 border-b border-primary/10">
          <div className="text-4xl md:text-5xl font-serif font-bold text-primary mb-2">
            {intervalWords(currentPlan.interval).price} {(currentPlan.price || 0).toLocaleString()}원
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-sm text-white/60">
              {/* 판매 실적이 없는 «가장 인기» 같은 최상급 표현은 쓰지 않는다(표시광고법). */}
              {currentPlan.tier === 'FAMILY'
                ? '가족과 함께 쓰는 플랜'
                : currentPlan.tier === 'BUSINESS'
                  ? '여럿을 함께 보는 플랜'
                  : '기본 플랜'}
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-6">
          <div className="text-sm font-serif font-bold text-primary mb-4">• 이 등급에서 쓰실 수 있는 것</div>
          <div className="space-y-3">
            {tierFeatures.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 flex-shrink-0" />
                <span className="text-sm text-white/90 leading-relaxed flex-1 min-w-0">{feature}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/45 leading-relaxed border-t border-primary/10 pt-3">
            {servicePeriodLine()}
            <br />
            멤버십 이용권은 구독 시작일을 기준으로 한 달마다 새로 열리고, 남은 장은 다음 달로 넘어가지 않습니다. 다 쓰신
            뒤에는 이용권을 따로 구매해 이어 보실 수 있습니다.
          </p>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleSelectPlan}
          className="tap-glow-gold w-full bg-primary hover:bg-primary/90 text-background font-serif font-bold h-14 text-base rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all"
        >
          {isGuest ? '로그인하고 시작하기' : '지금 시작하기'}
        </Button>

        {/* Additional Info */}
        {currentPlan.tier === 'FAMILY' && (
          <div className="mt-4 text-center">
            <p className="text-xs text-white/60">⭐ 가족 구성원 관리와 궁합 분석에 최적화된 플랜</p>
          </div>
        )}
      </div>
    </div>
  )
}
