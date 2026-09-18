import type { Metadata } from 'next'
import { SignUpForm } from '@/components/sign-up-form'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { Loader2, Gift } from 'lucide-react'
import { REFERRAL_PASSES } from '@/lib/domain/entitlement/pass'

export const metadata: Metadata = {
  title: '회원가입',
  description: '청담해화당 회원가입으로 AI 사주 분석 서비스를 시작하세요.',
}

export default async function Page() {
  // 배너는 가입 콜백이 실제로 읽을 추천 쿠키(/invite 가 확인하고 심는다)를 기준으로 — 주소창의 ?ref= 로는 약속하지 않는다.
  const referralCode = (await cookies()).get('referral_code')?.value ?? null

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-surface">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hanok-night-hero.jpg')" }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface/60 via-surface/80 to-surface/95" />
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
          <p className="mt-4 text-ink-light/60 text-sm text-center leading-relaxed">운명의 문을 열어보세요</p>
        </div>

        {/* Referral Banner */}
        {referralCode && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gold-500/10 border border-gold-500/30 mb-6">
            <Gift className="w-5 h-5 text-gold-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-gold-400">추천 혜택 적용 중</p>
              <p className="text-xs text-ink-light/60">
                친구 추천으로 가입하면 이용권 <span className="text-gold-400 font-bold">{REFERRAL_PASSES}장</span>을 더
                드려요 (코드: <span className="font-mono text-gold-400">{referralCode}</span>)
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
