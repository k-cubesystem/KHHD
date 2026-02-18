'use client'

import { Sparkles } from 'lucide-react'

interface MembershipBenefitsProps {
  tier: 'SINGLE' | 'FAMILY' | 'BUSINESS' | 'TESTER' | null
}

const tierBenefits = {
  SINGLE: ['일일 복채 10만냥', '인연 등록 3명', '분석 결과 10개 저장'],
  FAMILY: [
    '일일 복채 30만냥 (3배)',
    '인연 등록 10명',
    '분석 결과 50개 저장',
    '가족 인연 네트워크 시각화',
    '복채 15% 보너스',
  ],
  BUSINESS: [
    '일일 복채 100만냥',
    '인연 등록 50명',
    '분석 결과 무제한 저장',
    '복채 20% 보너스',
    '우선 고객 지원',
  ],
  TESTER: ['일일 복채 100만냥', '인연 등록 10명', '분석 결과 10개 저장', '모든 기능 테스트 가능'],
}

/**
 * 멤버십 혜택 카드 컴포넌트
 * 현재 등급의 혜택을 카드 형식으로 표시
 */
export function MembershipBenefits({ tier }: MembershipBenefitsProps) {
  const benefits = tierBenefits[tier || 'SINGLE']

  return (
    <section className="bg-surface/30 rounded-xl p-6 border border-zen-border">
      <h3 className="text-lg font-bold text-zen-text mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-zen-gold" />내 멤버십 혜택
      </h3>
      <ul className="space-y-3">
        {benefits.map((benefit, idx) => (
          <li key={idx} className="flex items-center gap-3 text-zen-text">
            <Sparkles className="w-4 h-4 text-zen-gold flex-shrink-0" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
