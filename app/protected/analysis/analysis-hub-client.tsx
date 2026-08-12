'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AnalysisDashboard } from '@/components/analysis/AnalysisDashboard'
import { HubSectionNav } from '@/components/analysis/HubSectionNav'
import { JourneyCard } from '@/components/analysis/journey-card'
import { HUB_SECTIONS, hubHeadingId, visibleHubSections } from '@/lib/domain/analysis/hub-sections'

interface AnalysisHubClientProps {
  userName?: string
}

export function AnalysisHubClient({ userName }: AnalysisHubClientProps = {}) {
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold-500/3 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 w-full pt-6">
        {/* 섹션 바로가기 — 화면 맨 위. 아래로 한참 스크롤해야 닿던 섹션들을 한 번에 연다.
            ⚠️ sticky 로 만들지 않았다. 이 화면의 조상 두 곳(ProtectedLayout 의 overflow-x-hidden,
               아래 허브 루트의 overflow-hidden)이 스크롤 컨테이너를 만들어, position:sticky 는
               «문서» 가 아니라 그 컨테이너에 붙는다 — 컨테이너 자체는 스크롤하지 않으므로 고정은
               조용히 아무 일도 하지 않는다. 그걸 살리려면 레이아웃의 overflow-x-hidden 을 걷어야
               하는데, 그 클래스는 배경 블러(가로 800px)가 만드는 가로 스크롤을 막고 있다. */}
        <div className="max-w-screen-sm mx-auto px-4 mb-4">
          <HubSectionNav sections={visibleHubSections({ hasDailyFortune: Boolean(userName) })} />
        </div>

        {/* 종합사주풀이 여정 — 사주/궁합 허브 상단부 (사용자 지정 위치) */}
        <section
          id={HUB_SECTIONS.journey.id}
          aria-labelledby={hubHeadingId(HUB_SECTIONS.journey.id)}
          tabIndex={-1}
          className="max-w-screen-sm mx-auto px-4 mb-6 scroll-mt-20 outline-none"
        >
          <h2 id={hubHeadingId(HUB_SECTIONS.journey.id)} className="sr-only">
            {HUB_SECTIONS.journey.title}
          </h2>
          <JourneyCard variant="full" />
        </section>
        <AnalysisDashboard userName={userName} />
      </div>
    </div>
  )
}
