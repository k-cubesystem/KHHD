'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AnalysisDashboard } from '@/components/analysis/AnalysisDashboard'
import { JourneyCard } from '@/components/analysis/journey-card'
import { HUB_SECTIONS, hubHeadingId } from '@/lib/domain/analysis/hub-sections'

export function AnalysisHubClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      setTimeout(() => {
        toast.success('🎁 50만냥이 지급되었습니다!', {
          description: '신규 회원 가입 축하 복채 50만냥이 지갑에 입금되었습니다.',
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
        <AnalysisDashboard />

        {/* 종합사주풀이 여정 — 맨 하단(CEO 2026-08-13).
            좌우 여백을 대시보드와 같은 px-2 로 맞춰 위 카드들과 한 줄로 선다.
            바닥 여백(pb-40)은 화면의 마지막 요소가 진다 — 고정 하단 바에 카드가 깔리지 않게. */}
        <section
          id={HUB_SECTIONS.journey.id}
          aria-labelledby={hubHeadingId(HUB_SECTIONS.journey.id)}
          tabIndex={-1}
          className="max-w-screen-sm mx-auto px-2 pb-40 scroll-mt-20 outline-none"
        >
          <h2 id={hubHeadingId(HUB_SECTIONS.journey.id)} className="sr-only">
            {HUB_SECTIONS.journey.title}
          </h2>
          <div className="dancheong-divider my-4" />
          <JourneyCard variant="full" />
        </section>
      </div>
    </div>
  )
}
