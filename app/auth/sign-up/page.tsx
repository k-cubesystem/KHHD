import type { Metadata } from 'next'
import { SignUpForm } from '@/components/sign-up-form'
import { Suspense } from 'react'
import { Loader2, Flower, Gift } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '회원가입',
  description: '청담해화당 회원가입으로 AI 사주 분석 서비스를 시작하세요.',
}

interface Props {
  searchParams: Promise<{ ref?: string; from?: string }>
}

export default async function Page({ searchParams }: Props) {
  const { ref, from } = await searchParams
  const isReferral = !!ref && from === 'invite'

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 overflow-hidden bg-background text-ink-light font-serif">
      {/* Texture Overlay */}
      <div className="hanji-overlay" />

      {/* 1. Background Layer (Hanok Night) */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0 animate-fade-in"
        style={{ backgroundImage: "url('/images/hanok-night-hero.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background z-0" />

      {/* 2. Content Container */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Header: Logo & Title (Matched to Login Page) */}
        <div className="flex flex-col items-center gap-5 md:gap-8">
          {/* Welcome Label */}
          <span className="font-serif text-lg md:text-xl lg:text-2xl font-bold tracking-[0.5em] text-primary animate-in fade-in duration-1000 gold-glow">
            청담해화당
          </span>

          {/* Decorative Divider */}
          <div className="flex items-center gap-3 md:gap-4 opacity-80 animate-in fade-in duration-1000 delay-100">
            <div className="h-px w-8 md:w-12 bg-primary/50" />
            <Flower className="w-4 h-4 md:w-5 md:h-5 text-primary" strokeWidth={1} />
            <div className="h-px w-8 md:w-12 bg-primary/50" />
          </div>
        </div>

        {/* 추천인 배너 */}
        {isReferral && (
          <div className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/30 animate-in fade-in duration-700">
            <Gift className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-bold text-primary">추천 혜택 적용 중</p>
              <p className="text-xs text-ink-light/60">
                가입 완료 시 <span className="text-primary font-bold">5만냥</span> 추가 지급 (코드:{' '}
                <span className="font-mono text-primary">{ref}</span>)
              </p>
            </div>
          </div>
        )}

        {/* Sign Up Form */}
        <div className="w-full p-2">
          <Suspense
            fallback={
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-primary" />
              </div>
            }
          >
            <SignUpForm />
          </Suspense>
        </div>

        {/* Footer Links (Matched to Login Page Style) */}
        <div className="flex flex-col items-center gap-4 mt-2">
          {/* Divider Line */}
          <div className="w-full max-w-[200px] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <div className="flex items-center justify-center gap-6 font-sans text-sm tracking-wide">
            <Link href="/auth/login" className="text-ink-light/50 hover:text-ink-light transition-colors duration-300">
              이미 계정이 있으신가요? <span className="text-primary hover:underline ml-1 font-bold">로그인</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
