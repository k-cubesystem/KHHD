'use client'

import Link from 'next/link'
import { LogIn, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('auth')
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
            <p className="text-sm text-ink-light/70 font-light">{description || t('guestGate')}</p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <Link href="/auth/sign-up">
              <Button className="w-full bg-primary hover:bg-primary-dim text-background font-serif">
                <LogIn className="w-4 h-4 mr-2" />
                {t('startFree')}
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                variant="outline"
                className="w-full border-primary/30 text-ink-light hover:border-primary hover:bg-primary/10"
              >
                {t('alreadyMember')} {t('login')}
              </Button>
            </Link>
          </div>

          {/* Feature Highlight */}
          <div className="pt-4 border-t border-primary/10">
            <p className="text-xs text-ink-light/70">{t('allFeatures')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
