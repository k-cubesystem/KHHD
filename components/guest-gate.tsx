'use client'

import Link from 'next/link'
import { LogIn, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GuestGateProps {
  isGuest: boolean
  children: React.ReactNode
  featureName: string
  description?: string
}

/**
 * GuestGate - Wraps AI features with authentication check
 * - Shows content normally for authenticated users
 * - Shows blurred preview + login CTA for guests
 */
export function GuestGate({ isGuest, children, featureName, description }: GuestGateProps) {
  if (!isGuest) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      {/* Blurred Content Preview */}
      <div className="blur-sm pointer-events-none select-none opacity-60">{children}</div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="max-w-md mx-auto px-6 py-12 text-center space-y-6">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" strokeWidth={1} />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h3 className="text-2xl font-serif text-ink-light">{featureName}</h3>
            <p className="text-sm text-ink-light/70 font-light">
              {description || '이 기능을 사용하려면 로그인이 필요합니다'}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <Link href="/auth/sign-up">
              <Button className="w-full bg-primary hover:bg-primary-dim text-background font-serif">
                <LogIn className="w-4 h-4 mr-2" />
                가입하고 시작하기
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                variant="outline"
                className="w-full border-primary/30 text-ink-light hover:border-primary hover:bg-primary/10"
              >
                이미 계정이 있으신가요? 로그인
              </Button>
            </Link>
          </div>

          {/* Feature Highlight */}
          <div className="pt-4 border-t border-primary/10">
            <p className="text-xs text-ink-light/70">청담 해화당의 모든 AI 분석 기능을 무제한으로 이용하세요</p>
          </div>
        </div>
      </div>
    </div>
  )
}
