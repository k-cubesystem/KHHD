import { HeroCarousel } from '@/components/HeroCarousel'

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
