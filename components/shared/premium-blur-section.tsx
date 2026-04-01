'use client'

import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PremiumBlurSectionProps {
  children: React.ReactNode
  isPaid: boolean
  /** 블러 오버레이 위에 보여줄 CTA 문구 */
  ctaLabel?: string
}

export function PremiumBlurSection({ children, isPaid, ctaLabel = '전체 분석 잠금 해제' }: PremiumBlurSectionProps) {
  if (isPaid) return <>{children}</>

  return (
    <div className="relative">
      <div className="blur-[8px] select-none pointer-events-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
        <div className="text-center space-y-3 px-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gold-500" />
          </div>
          <p className="text-sm text-ink-light/60">프리미엄 분석 결과를 확인하세요</p>
          <Button asChild className="bg-gold-500 hover:bg-gold-400 text-stone-900 font-bold">
            <Link href="/protected/membership">{ctaLabel}</Link>
          </Button>
          <p className="text-[11px] text-ink-light/30">
            <Link
              href="/protected/membership#bokchae"
              className="hover:text-ink-light/50 transition-colors underline underline-offset-2"
            >
              다른 결제 방법 보기
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
