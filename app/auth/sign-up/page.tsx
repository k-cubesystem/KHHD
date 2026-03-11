import type { Metadata } from 'next'
import { SignUpForm } from '@/components/sign-up-form'
import { Suspense } from 'react'
import { Loader2, Gift } from 'lucide-react'

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
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-stone-950">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hanok-night-hero.jpg')" }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/60 via-stone-950/80 to-stone-950/95" />
      {/* Texture */}
      <div className="hanji-overlay" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[400px] px-6 py-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="font-serif text-2xl tracking-[0.4em] text-gold-400 mb-3">청담해화당</h1>
          <div className="flex items-center gap-3">
            <div className="h-px w-10 bg-gold-500/40" />
            <span className="text-gold-500/60 text-xs tracking-widest">會員</span>
            <div className="h-px w-10 bg-gold-500/40" />
          </div>
          <p className="mt-4 text-stone-400 text-sm text-center leading-relaxed">운명의 문을 열어보세요</p>
        </div>

        {/* Referral Banner */}
        {isReferral && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gold-500/10 border border-gold-500/30 mb-6">
            <Gift className="w-5 h-5 text-gold-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-gold-400">추천 혜택 적용 중</p>
              <p className="text-xs text-stone-400">
                가입 완료 시 <span className="text-gold-400 font-bold">5만냥</span> 추가 지급 (코드:{' '}
                <span className="font-mono text-gold-400">{ref}</span>)
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-gold-500/60" />
            </div>
          }
        >
          <SignUpForm />
        </Suspense>
      </div>
    </div>
  )
}
