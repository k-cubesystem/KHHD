import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HeroCarousel } from '@/components/HeroCarousel'
import { LandingAuthBar } from '@/components/landing/landing-auth-bar'
import { MiniReadingSection } from '@/components/landing/mini-reading-section'
import { SocialProof } from '@/components/landing/social-proof'
import { SiteFooter } from '@/components/site-footer'

export const metadata: Metadata = {
  title: '청담해화당 - AI 사주 운세 분석',
  description: '전통 명리학과 AI가 만나 당신의 운명을 분석합니다. 사주, 궁합, 관상, 손금, 풍수 분석.',
}

export default async function Home() {
  const t = await getTranslations('landing')

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-background text-ink-light overflow-x-hidden antialiased font-serif selection:bg-primary/30">
      {/* Texture Overlay */}
      <div className="hanji-overlay" />

      {/* 최상단 진입 바 — 로그인 / 무료 시작. absolute이므로 루트 relative 컨테이너 안에 있어야 한다. */}
      <LandingAuthBar />

      {/* Screen 1: Hanok Night Intro (Carousel) */}
      <HeroCarousel />

      {/* Screen 2: Mini Reading — 가입 전 가치 제공 */}
      <MiniReadingSection />

      {/* Screen 3: Social Proof */}
      <SocialProof />

      {/* Screen 3.5: 상세 안내 — 후기로 데워진 직후, 가입 결심 직전 */}
      <section className="w-full px-4 pb-4">
        <div className="max-w-[420px] mx-auto">
          <Link
            href="/story"
            className="group flex items-center justify-between gap-3 w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-gold-500/30 transition-colors"
          >
            <span className="flex flex-col text-left">
              <span className="font-serif text-[14px] font-bold text-ink-light">해화당은 사주를 어떻게 읽나요?</span>
              <span className="font-sans text-[11.5px] text-ink-light/70 mt-0.5">
                만세력 명식부터 리포트까지 · 2분 안내
              </span>
            </span>
            <ArrowRight className="w-4 h-4 text-gold-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Screen 4: CTA */}
      <section className="w-full px-4 pb-8">
        <div className="max-w-[420px] mx-auto space-y-3">
          <Link
            href="/auth/sign-up"
            className="block w-full py-3.5 text-center rounded-xl bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 text-gold-500 font-sans text-sm transition-colors"
          >
            {t('cta')}
          </Link>
          <p className="text-center font-sans text-[12px] text-ink-light/60">
            이미 계정이 있으신가요?{' '}
            <Link href="/auth/login" className="text-gold-400 underline underline-offset-4 hover:text-gold-300">
              로그인
            </Link>
          </p>
        </div>
      </section>

      {/* 사업자 정보 · 약관 — 공개 페이지에도 노출되어야 한다(전자상거래법) */}
      <SiteFooter className="pb-10" />
    </div>
  )
}
