import type { Metadata } from 'next'
import Link from 'next/link'
import { StoryOpening } from '@/components/landing/story/story-opening'
import { StoryProblem } from '@/components/landing/story/story-problem'
import { StoryVisualBreak } from '@/components/landing/story/story-visual-break'
import { StoryMethod } from '@/components/landing/story/story-method'
import { StoryOfferings } from '@/components/landing/story/story-offerings'
import { StoryReportPreview } from '@/components/landing/story/story-report-preview'
import { StoryTrust } from '@/components/landing/story/story-trust'
import { StoryClosing } from '@/components/landing/story/story-closing'
import { StorySticky } from '@/components/landing/story/story-sticky-cta'

const OG_IMAGE = '/api/og?title=청담해화당&desc=전통 명리학과 AI가 함께 읽는 내 사주'

export const metadata: Metadata = {
  title: { absolute: '청담해화당 — 전통 명리학과 AI가 함께 읽는 내 사주' },
  description:
    '만세력으로 명식을 세우고 AI가 천·지·인 세 축으로 교차 해석합니다. 사주·궁합·관상·손금·풍수 리포트와 나만의 신당까지. 오늘의 운세는 무료로 시작하세요.',
  keywords: ['사주', '사주풀이', '궁합', '관상', '손금', '풍수', '오늘의 운세', 'AI 사주', '청담해화당'],
  alternates: { canonical: '/story' },
  openGraph: {
    type: 'article',
    locale: 'ko_KR',
    url: '/story',
    siteName: '청담해화당',
    title: '청담해화당 — 전통 명리학과 AI가 함께 읽는 내 사주',
    description:
      '한 줄짜리 운세가 아닙니다. 만세력 명식 위에 AI 교차 해석을 얹은 항목별 장문 리포트. 오늘의 운세는 무료.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: '청담해화당 사주 분석 안내' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '청담해화당 — 전통 명리학과 AI가 함께 읽는 내 사주',
    description: '만세력 명식 + AI 교차 해석. 사주·궁합·관상·손금·풍수 리포트. 오늘의 운세는 무료.',
    images: [OG_IMAGE],
  },
}

export default function StoryPage() {
  return (
    <div className="relative min-h-screen w-full flex flex-col bg-background text-ink-light overflow-x-hidden antialiased selection:bg-primary/30">
      <div className="hanji-overlay" />

      <main className="relative z-20 w-full flex flex-col">
        <StoryOpening />

        <StoryProblem />

        <StoryVisualBreak
          src="/landing-section-2.jpg"
          quote={
            <>
              때를 알면
              <br />
              서두르지 않게 됩니다
            </>
          }
          caption="조급함은 대개 정보가 없을 때 생깁니다. 흐름을 먼저 보면 기다림도 전략이 됩니다."
        />

        <StoryMethod />

        <StoryOfferings />

        <StoryVisualBreak
          src="/images/intro-relationship-v2.jpg"
          quote={
            <>
              혼자 보는 사주에서
              <br />
              함께 보는 사주로
            </>
          }
          caption="나의 명식만이 아니라 곁에 있는 사람들의 결까지. 궁합과 가족 관리로 이어집니다."
        />

        <StoryReportPreview />

        <StoryTrust />

        <StoryClosing />
      </main>

      <footer className="relative z-20 w-full px-6 pb-28 pt-2 flex flex-col items-center gap-3">
        <div className="dancheong-divider w-full max-w-[16rem]" />
        <nav aria-label="하단 링크" className="flex items-center gap-3">
          <Link href="/" className="font-sans text-[11.5px] text-ink-light/75 hover:text-gold-300">
            홈으로
          </Link>
          <span className="w-px h-3 bg-white/20" aria-hidden />
          <Link href="/terms" className="font-sans text-[11.5px] text-ink-light/75 hover:text-gold-300">
            이용약관
          </Link>
          <span className="w-px h-3 bg-white/20" aria-hidden />
          <Link href="/privacy" className="font-sans text-[11.5px] text-ink-light/75 hover:text-gold-300">
            개인정보처리방침
          </Link>
        </nav>
        <p className="font-sans text-[10.5px] leading-relaxed text-ink-light/65 text-center break-keep m-0">
          본 페이지의 분석 예시는 화면 구성을 보여주기 위한 것이며 특정인의 결과가 아닙니다.
        </p>
      </footer>

      <StorySticky />
    </div>
  )
}
