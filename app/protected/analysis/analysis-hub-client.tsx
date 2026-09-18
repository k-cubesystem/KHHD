'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AnalysisDashboard } from '@/components/analysis/AnalysisDashboard'
import { RitualBanner } from '@/components/ritual/ritual-banner'
import { trackEvent } from '@/lib/analytics/ga4'
import { ONBOARDING_PASSES, ONBOARDING_VALID_DAYS, formatPassUnits } from '@/lib/domain/entitlement/pass'

export function AnalysisHubClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    trackEvent({ action: 'screen_view', category: 'engagement', label: 'dashboard' })
  }, [])

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      setTimeout(() => {
        toast.success(`🎁 가입 선물로 ${formatPassUnits(ONBOARDING_PASSES)}을 드렸어요`, {
          description: `사주·궁합·관상 같은 풀이에 쓸 수 있어요 · 유효기간 ${ONBOARDING_VALID_DAYS}일`,
          duration: 6000,
          style: {
            background: 'linear-gradient(135deg, #1A1200 0%, #0D0900 100%)',
            border: '1px solid rgba(212,175,55,0.4)',
            color: '#F4E4BA',
          },
        })
      }, 600)
      router.replace('/protected/analysis', { scroll: false })
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('/texture/hanji_noise.png')] bg-repeat" />

      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold-500/[0.03] rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 w-full pt-6">
        <RitualBanner />
        {/* 여정(나의 복주머니)은 대시보드 안에서 사주 유도 카드 바로 아래 선다(CEO 2026-08-22).
            바닥 여백(pb-40)도 대시보드가 진다 — 고정 하단 바에 마지막 카드가 깔리지 않게. */}
        <AnalysisDashboard />
      </div>
    </div>
  )
}
