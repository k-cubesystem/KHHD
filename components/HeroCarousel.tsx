'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BLUR_DATA_URL } from '@/lib/utils/image'
import { ArrowRight, Flower } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const SLIDE_INTERVAL_MS = 8000

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

interface Slide {
  id: number
  image: string
  headline: string
  subhead: string
  buttonText: string
  link: string
}

const slides: Slide[] = [
  {
    id: 1,
    image: '/images/hanok-night-hero.jpg',
    headline: '모두가 부러워하는 삶, 정작 당신은 행복하십니까?',
    subhead: '조명이 꺼진 뒤 밀려오는 공허함, 말 못 한 그 마음을 함께 짚어드립니다.',
    buttonText: '마음의 매듭 풀기',
    link: '/auth/sign-up',
  },
  {
    id: 2,
    image: '/images/intro-wealth-v2.jpg',
    headline: '그 집 아이만 유독 잘 풀리는 이유',
    subhead: '노력만으로 닿지 않는 운의 영역. 아이의 결정적 시기를 짚어드립니다.',
    buttonText: '합격운·재물운 보기',
    link: '/auth/sign-up',
  },
  {
    id: 3,
    image: '/landing-section-2.jpg',
    headline: '내 인생에도 다시 봄바람이 불어올까요?',
    subhead: '메마른 가슴에 단비처럼 찾아올 인연. 그 사람이 어디쯤 왔는지 짚어드립니다.',
    buttonText: '인연 시기 보기',
    link: '/auth/sign-up',
  },
]

export function HeroCarousel() {
  const t = useTranslations('brand')
  const tAuth = useTranslations('auth')
  // 항상 0번 슬라이드로 시작 — 첫인상 일관성 + 마운트 후 교체로 인한 깜빡임 제거
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    // 모션 최소화 설정에서는 자동 전환을 하지 않는다 (도트로 수동 전환은 유지)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, SLIDE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  const slide = slides[currentSlide]

  return (
    <main
      role="region"
      aria-roledescription="carousel"
      aria-label="청담해화당 소개"
      className="relative z-40 flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 pb-32 pt-[8.75rem] text-center sm:pb-36 sm:pt-44"
    >
      {/* Background Layer (Transitioning) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {`슬라이드 ${currentSlide + 1} / ${slides.length}`}
      </div>
      {slides.map((s, index) => (
        <div
          key={s.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`슬라이드 ${index + 1} / ${slides.length}`}
          aria-hidden={index !== currentSlide}
          className={cn(
            'absolute inset-0 z-0 h-full w-full transition-opacity duration-1000 ease-in-out',
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={s.image}
              alt=""
              fill
              // 첫 슬라이드(LCP)만 즉시 로드, 나머지는 지연 로드.
              // 🔴 `loading` 을 함께 주지 말 것. `priority` 와 같이 넘기면 서버와 클라이언트가
              //    <img> 속성을 다르게 만들어 **랜딩 전체가 하이드레이션 실패**한다
              //    (React #418, 2026-08-17 프로덕션에서 실측). priority=true 면 즉시 로드,
              //    false 면 next/image 가 알아서 lazy 를 붙인다 — 지금 동작과 정확히 같다.
              priority={index === 0}
              quality={75}
              sizes="100vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover object-center transition-transform duration-[20000ms] hover:scale-105"
            />
          </div>
          {/* Dark Overlay Gradient — 헤드라인 구간(높이 22~40%) 명암비 4.5:1 이상 확보.
              세 stop 모두 Tailwind 기본 투명도 스케일(5단위) 값만 쓴다. 스케일 밖 값(/92)은 클래스가
              생성되지 않고, arbitrary 형식(/[0.92])은 dev(Turbopack)와 prod 빌드 결과가 갈린다.
              from/via 가 각각 --tw-gradient-to 를 0 으로 깔기 때문에, to 가 누락되면 하단 스크림이 통째로 사라진다. */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/75 to-background/90" />
        </div>
      ))}

      {/* Header Group — 상단 진입 바(h-14) 아래로 배치 */}
      <div className="absolute left-0 right-0 top-[4.5rem] z-20 flex flex-col items-center gap-3.5 sm:top-24 sm:gap-5">
        <span className="gold-glow animate-in font-serif text-lg font-bold tracking-[0.5em] text-primary duration-1000 fade-in md:text-xl lg:text-2xl">
          {t('name')}
        </span>
        <div className="flex animate-in items-center gap-3 opacity-80 delay-100 duration-1000 fade-in md:gap-4">
          <div className="h-px w-8 bg-primary/50 md:w-12" />
          <Flower className="h-4 w-4 text-primary md:h-5 md:w-5" strokeWidth={1} />
          <div className="h-px w-8 bg-primary/50 md:w-12" />
        </div>
      </div>

      {/* Content Container (Centered) */}
      <div className="relative z-10 flex w-full flex-col items-center">
        <div
          key={currentSlide}
          className="flex animate-in flex-col items-center duration-700 fade-in slide-in-from-bottom-8"
        >
          <h1 className="max-w-[20rem] break-keep font-serif text-[1.375rem] font-light leading-snug tracking-tight text-ink-light drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:max-w-[26rem] sm:text-[1.75rem] md:max-w-[32rem] md:text-3xl">
            {slide.headline}
          </h1>

          <p className="mt-5 max-w-[19rem] break-keep font-sans text-[13px] font-light leading-relaxed tracking-wide text-ink-light/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] sm:max-w-sm sm:text-sm">
            {slide.subhead}
          </p>

          <Link
            href={slide.link}
            className={cn(
              'group mt-8 inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 sm:mt-10 sm:gap-3 sm:px-9',
              'border border-primary/35 bg-black/25 shadow-gold-glow backdrop-blur-[2px]',
              'transition-all duration-long hover:scale-[1.02] hover:border-seal hover:bg-seal',
              FOCUS_RING
            )}
          >
            <span className="whitespace-nowrap pt-0.5 font-serif text-[13px] font-light tracking-[0.12em] text-ink-light/90 transition-colors group-hover:text-ink-light sm:text-sm sm:tracking-[0.18em]">
              {slide.buttonText}
            </span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 shadow-inner transition-colors group-hover:bg-white/20">
              <ArrowRight className="h-3 w-3 text-ink-light/70 transition-colors group-hover:text-ink-light" />
            </span>
          </Link>

          {/* 기존 회원용 보조 진입점 — 결정 지점에서 바로 로그인 */}
          <Link
            href="/auth/login"
            className={cn(
              'mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3',
              'font-sans text-xs text-ink-light/70 transition-colors duration-short hover:text-ink-light',
              FOCUS_RING
            )}
          >
            <span>{tAuth('alreadyMember')}</span>
            <span className="font-medium text-gold-400 underline underline-offset-4">{tAuth('login')}</span>
          </Link>
        </div>
      </div>

      {/* Dancheong Divider */}
      <div className="dancheong-divider absolute bottom-24 left-1/2 z-10 w-3/4 -translate-x-1/2" />

      {/* Pagination Dots */}
      <div className="absolute bottom-6 z-10 flex">
        {slides.map((s, index) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrentSlide(index)}
            className={cn('flex h-11 w-11 items-center justify-center rounded-lg', FOCUS_RING)}
            aria-label={`${index + 1}번 슬라이드로 이동`}
            aria-current={index === currentSlide ? 'true' : undefined}
          >
            <span
              className={cn(
                'block h-2 rounded-full transition-all duration-300',
                index === currentSlide ? 'w-6 bg-primary gold-glow' : 'w-2 bg-white/20 hover:bg-white/40'
              )}
            />
          </button>
        ))}
      </div>
    </main>
  )
}
