import type { Metadata } from 'next'
import { HeroCarousel } from '@/components/HeroCarousel'

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
    </div>
  )
}
