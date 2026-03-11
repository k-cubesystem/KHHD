import type { Metadata } from 'next'
import { LoginForm } from '@/components/login-form'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: '로그인',
  description: '청담해화당에 로그인하여 AI 사주 분석 서비스를 이용하세요.',
}

export default function Page() {
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
      <div className="relative z-10 w-full max-w-[400px] px-6 py-12">
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <h1 className="font-serif text-2xl tracking-[0.4em] text-gold-400 mb-3">청담해화당</h1>
          <div className="flex items-center gap-3">
            <div className="h-px w-10 bg-gold-500/40" />
            <span className="text-gold-500/60 text-xs tracking-widest">命理</span>
            <div className="h-px w-10 bg-gold-500/40" />
          </div>
          <p className="mt-4 text-stone-400 text-sm text-center leading-relaxed">당신의 운명을 밝히는 AI 사주 분석</p>
        </div>

        {/* Form */}
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-gold-500/60" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
