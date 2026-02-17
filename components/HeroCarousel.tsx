'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Flower } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const slides = [
  {
    id: 1,
    image: '/images/hanok-night-hero.jpg',
    headline: (
      <>
        모두가 부러워하는 당신의 삶,
        <br />
        하지만 정작 당신은 행복하십니까?
      </>
    ),
    subhead: (
      <>
        시선에 맞춰 완벽해야 했던 지난날들.
        <br />
        화려한 조명이 꺼진 뒤 밀려오는 알 수 없는 공허함까지,
        <br />
        아무에게도 말 못한 당신의 그 깊은 외로움을
        <br />
        청담해화당이 안아드립니다.
      </>
    ),
    buttonText: '내 마음의 매듭 풀기',
    link: '/protected',
  },
  {
    id: 2,
    image: '/images/intro-wealth-v2.jpg',
    headline: (
      <>
        그 집 아이가 유독 잘 풀리는 이유,
        <br />
        엄마들 사이의 &apos;비밀&apos;은 따로 있습니다.
      </>
    ),
    subhead: (
      <>
        노력만으로는 닿을 수 없는 운의 영역이 있습니다.
        <br />알 만한 청담동 엄마들이 조용히 다녀간 그곳.
        <br />
        우리 아이가 가진 운명의 그릇을 가장 크게 키워줄
        <br />
        &apos;결정적 시기&apos;를 놓치지 마세요.
      </>
    ),
    buttonText: '합격운 & 재물운 확인하기',
    link: '/protected',
  },
  {
    id: 3,
    image: '/landing-section-2.jpg',
    headline: (
      <>
        다시, 내 인생에도
        <br />
        봄바람이 불어올까요?
      </>
    ),
    subhead: (
      <>
        메마른 가슴에 단비처럼 찾아올 귀한 인연.
        <br />
        당신을 아껴줄 그 사람이 지금 어디쯤 오고 있는지,
        <br />
        해화당이 미리 짚어드립니다.
      </>
    ),
    buttonText: '새로운 인연이 있을까?',
    link: '/protected',
  },
]

export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    // 클라이언트 마운트 시 랜덤 슬라이드로 시작
    setCurrentSlide(Math.floor(Math.random() * slides.length))
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  return (
    <main className="relative z-40 w-full min-h-[100dvh] flex flex-col items-center justify-start pt-[22vh] text-center overflow-hidden">
      {/* Background Layer (Transitioning) */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            'absolute inset-0 w-full h-full z-0 transition-opacity duration-1000 ease-in-out',
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Next.js Image — Vercel CDN 최적화 적용 */}
          {/* overflow-hidden으로 Ken Burns scale 클리핑 */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={slide.image}
              alt=""
              fill
              // 첫 슬라이드(LCP)만 즉시 로드, 나머지는 지연 로드
              priority={index === 0}
              quality={75}
              sizes="100vw"
              className="object-cover object-center transition-transform duration-[20000ms] hover:scale-105"
            />
          </div>
          {/* Dark Overlay Gradient — 텍스트 가독성 보존 */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background/90" />
        </div>
      ))}

      {/* Header Group (Fixed Top) */}
      <div className="absolute top-14 left-0 right-0 z-50 flex flex-col items-center gap-5">
        <span className="font-serif text-lg md:text-xl lg:text-2xl font-bold tracking-[0.5em] text-primary animate-in fade-in duration-1000 gold-glow">
          청담해화당
        </span>
        <div className="flex items-center gap-3 md:gap-4 opacity-80 animate-in fade-in duration-1000 delay-100">
          <div className="h-px w-8 md:w-12 bg-primary/50" />
          <Flower className="w-4 h-4 md:w-5 md:h-5 text-primary" strokeWidth={1} />
          <div className="h-px w-8 md:w-12 bg-primary/50" />
        </div>
      </div>

      {/* Content Container (Centered) */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-4xl pb-10">
        <div
          key={currentSlide}
          className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700"
        >
          <h1 className="font-serif text-2xl font-light leading-relaxed tracking-tight text-ink-light drop-shadow-sm break-keep">
            {slides[currentSlide].headline}
          </h1>

          <p className="font-sans text-ink-light/80 font-light text-sm tracking-wide leading-7 max-w-[85%] break-keep opacity-90">
            {slides[currentSlide].subhead}
          </p>

          <Link href={slides[currentSlide].link} className="pt-8">
            <button className="group relative px-10 py-3.5 bg-surface/10 backdrop-blur-[2px] rounded-xl border border-primary/30 shadow-[0_0_20px_rgba(236,182,19,0.1)] flex items-center gap-3 transition-all duration-500 hover:bg-seal hover:border-seal hover:shadow-[0_0_30px_rgba(154,42,42,0.4)] hover:scale-[1.02]">
              <span className="font-serif font-light text-sm tracking-[0.2em] pt-0.5 text-ink-light/90 group-hover:text-ink-light transition-colors">
                {slides[currentSlide].buttonText}
              </span>
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors shadow-inner">
                <ArrowRight className="w-3 h-3 text-ink-light/70 group-hover:text-ink-light transition-colors" />
              </div>
            </button>
          </Link>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-12 flex gap-3 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              index === currentSlide ? 'bg-primary w-6 gold-glow' : 'bg-white/20 hover:bg-white/40'
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </main>
  )
}
