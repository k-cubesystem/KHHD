import type { Metadata } from 'next'
import { HeroCarousel } from '@/components/HeroCarousel'
import { MiniReadingSection } from '@/components/landing/mini-reading-section'
import { ReviewMarquee } from '@/components/landing/review-marquee'
import { LiveMemberCounter } from '@/components/landing/live-member-counter'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '청담해화당 - AI 사주 운세 분석',
  description: '전통 명리학과 AI가 만나 당신의 운명을 분석합니다. 사주, 궁합, 관상, 손금, 풍수 분석.',
}

export default function Home() {
  return (
    <div className="relative min-h-screen w-full flex flex-col bg-background text-ink-light overflow-x-hidden antialiased font-serif selection:bg-primary/30">
      {/* Texture Overlay */}
      <div className="hanji-overlay" />

      {/* Screen 1: Hanok Night Intro (Carousel) */}
      <HeroCarousel />

      {/* Screen 2: Mini Reading — 가입 전 가치 제공 */}
      <MiniReadingSection />

      {/* Screen 3: Social Proof */}
      <section className="w-full py-6 space-y-4 overflow-hidden">
        <LiveMemberCounter />
        <ReviewMarquee />
      </section>

      {/* Screen 4: CTA */}
      <section className="w-full px-4 pb-12">
        <div className="max-w-[420px] mx-auto">
          <Link
            href="/auth/sign-up"
            className="block w-full py-3.5 text-center rounded-xl bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 text-gold-500 font-sans text-sm transition-colors"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>
    </div>
  )
}
