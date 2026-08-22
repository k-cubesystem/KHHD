'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { GA } from '@/lib/analytics/ga4'
import { useTranslations } from 'next-intl'
import {
  servicePeriodLine,
  dailySpendCapLine,
  membershipBenefitLines,
  toPlanFacts,
} from '@/lib/domain/payment/membership-benefits'

interface Plan {
  id: string
  name: string
  tier: string
  price: number
  interval: string
  daily_talisman_limit: number
  relationship_limit: number
  storage_limit: number
  talismans_per_period: number
  features: Record<string, boolean | number>
}

interface MembershipTabsProps {
  plans: Plan[]
  isGuest: boolean
}

export function MembershipTabs({ plans, isGuest }: MembershipTabsProps) {
  const router = useRouter()
  const t = useTranslations('payment')
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

  const features = (currentPlan.features as Record<string, boolean | number>) || {}

  // 등급별 특징 — 문구·숫자는 membership-benefits.ts(단일 출처)에서 파생한다.
  // 🔴 여기에 숫자나 «매일/무제한»을 직접 쓰지 말 것: 지급은 결제 주기당 1회이고,
  //    멤버십이 여는 것은 «입장»이지 사용량 무제한이 아니다(membership-benefits.ts 주석 참조).
  const tierFeatures: string[] = [...membershipBenefitLines(toPlanFacts(currentPlan))]
  tierFeatures.push('출석 체크 시 추가 복채 지급')

  if (features.kakao_daily) tierFeatures.push('카카오톡 매일 운세 알림')
  if (features.pdf_archive) tierFeatures.push('PDF 결과 내려받기')

  // 등급별 추가 특징
  if (currentPlan.tier === 'FAMILY') {
    tierFeatures.push('가족 궁합 매트릭스')
    tierFeatures.push('인연 네트워크 시각화')
  }

  if (currentPlan.tier === 'BUSINESS') {
    tierFeatures.push('가족 궁합 매트릭스')
    tierFeatures.push('인연 네트워크 시각화')
    tierFeatures.push('API 접근 (예정)')
    tierFeatures.push('우선 지원')
    tierFeatures.push('맞춤형 리포트')
  }

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
            {t('perMonth')} {(currentPlan.price || 0).toLocaleString()}원
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-sm text-white/60">
              {currentPlan.tier === 'FAMILY'
                ? '가장 인기있는 플랜'
                : currentPlan.tier === 'BUSINESS'
                  ? '프리미엄'
                  : '기본 플랜'}
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-6">
          <div className="text-sm font-serif font-bold text-primary mb-4">• 멤버십 회원만 누리는 특별 혜택!</div>
          <div className="space-y-3">
            {tierFeatures.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 flex-shrink-0" />
                <span className="text-sm text-white/90 leading-relaxed flex-1 min-w-0">{feature}</span>
              </div>
            ))}
          </div>
          {/* 지급과 «하루 사용 상한»은 다른 개념 — 혜택 줄과 섞지 않고 각주로 분리한다. */}
          <p className="text-xs text-white/45 leading-relaxed border-t border-primary/10 pt-3">
            {servicePeriodLine()}
            <br />
            {dailySpendCapLine(currentPlan.daily_talisman_limit)}
            <br />
            멤버십은 신당·가족관리·속풀이의 «입장»을 엽니다. 풀이는 회원도 복채로 봅니다.
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
