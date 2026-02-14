'use client'

import { User, Compass, Fingerprint, ArrowRight, Layers } from 'lucide-react'
import { BrandQuote } from '@/components/ui/BrandQuote'
import Link from 'next/link'
import { BRAND_QUOTES } from '@/lib/constants/brand-quotes'

export default function StudioPage() {
  return (
    <div className="min-h-screen bg-background text-ink-light font-sans relative pb-24 overflow-x-hidden">
      <header className="px-5 pt-14 pb-8 relative z-10 text-center space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-block mb-2">
          <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] text-primary font-medium tracking-wide">
            SECRET OF FORTUNE
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-serif font-bold text-ink-light leading-snug">
          왜 그 사람은 항상 <br />
          <span className="text-primary relative inline-block">
            운이 좋을까요?
            <svg className="absolute -bottom-1 left-0 w-full h-1 text-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </span>
        </h1>

        <div className="space-y-4 max-w-sm mx-auto">
          <p className="text-sm text-ink-light/70 font-light leading-relaxed">
            타고난 운명보다 더 중요한 것은 <strong className="text-primary font-medium">'관리'</strong>입니다. <br />
            성공한 상위 1%가 남몰래 챙기는 3가지 비밀, <br />
            이제 당신의 것으로 만드세요.
          </p>

          <div className="bg-surface/30 border border-white/5 rounded-xl p-4 mt-2 backdrop-blur-sm">
            <p className="text-xs text-ink-light/50 font-light leading-normal">
              "나만 모르고 있던 기회의 신호를 놓치고 있진 않나요?" <br />
              <span className="text-primary/80 font-medium">지금 내게 필요한 운의 흐름을 확인하세요.</span>
            </p>
          </div>
        </div>
      </header>

      <main className="px-5 relative z-10 space-y-4 pb-20">
        {/* Secret 01: Palm Reading */}
        <Link href="/protected/studio/palm" className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-surface/40 p-5 transition-all duration-300 hover:border-primary/30 hover:bg-surface/60 hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-bold text-primary/60 tracking-widest uppercase">Secret 01</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>

            <h3 className="text-lg font-serif font-bold text-ink-light mb-1 group-hover:text-primary transition-colors">
              손금 <span className="text-sm font-sans font-normal text-white/40 ml-1">Palmistry</span>
            </h3>
            <p className="text-xs text-ink-light/70 font-light leading-relaxed mb-3">
              내 손안에 쥐고 있던 <strong className="text-ink-light font-medium">재물과 생명의 지도</strong>를 읽어드립니다.
              놓치고 있던 타고난 재능을 발견하세요.
            </p>
            <div className="text-[10px] text-primary/80 font-medium bg-primary/5 inline-block px-2 py-1 rounded">
              #재물운 #생명선 #숨겨진재능
            </div>
          </div>
        </Link>

        {/* Secret 02: Face Reading */}
        <Link href="/protected/studio/face" className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-surface/40 p-5 transition-all duration-300 hover:border-primary/30 hover:bg-surface/60 hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-bold text-primary/60 tracking-widest uppercase">Secret 02</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>

            <h3 className="text-lg font-serif font-bold text-ink-light mb-1 group-hover:text-primary transition-colors">
              관상 <span className="text-sm font-sans font-normal text-white/40 ml-1">Physiognomy</span>
            </h3>
            <p className="text-xs text-ink-light/70 font-light leading-relaxed mb-3">
              성공하는 사람들의 얼굴에는 공통점이 있습니다. <br />
              당신의 <strong className="text-ink-light font-medium">부와 명예를 부르는 징조</strong>를 찾아보세요.
            </p>
            <div className="text-[10px] text-primary/80 font-medium bg-primary/5 inline-block px-2 py-1 rounded">
              #성공운 #인복 #리더십
            </div>
          </div>
        </Link>

        {/* Secret 03: Feng Shui */}
        <Link href="/protected/studio/fengshui" className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-surface/40 p-5 transition-all duration-300 hover:border-primary/30 hover:bg-surface/60 hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-bold text-primary/60 tracking-widest uppercase">Secret 03</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>

            <h3 className="text-lg font-serif font-bold text-ink-light mb-1 group-hover:text-primary transition-colors">
              공간풍수 <span className="text-sm font-sans font-normal text-white/40 ml-1">Feng Shui</span>
            </h3>
            <p className="text-xs text-ink-light/70 font-light leading-relaxed mb-3">
              머무는 곳이 당신의 기운을 결정합니다. <br />
              <strong className="text-ink-light font-medium">나쁜 기운은 막고 좋은 기운을 부르는</strong> 공간의 비밀.
            </p>
            <div className="text-[10px] text-primary/80 font-medium bg-primary/5 inline-block px-2 py-1 rounded">
              #가구배치 #양택풍수 #기운전환
            </div>
          </div>
        </Link>
      </main>
    </div>
  )
}
