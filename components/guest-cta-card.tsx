'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GuestCTACardProps {
  title: string
  description: string
  ctaText?: string
  ctaHref?: string
  preview?: React.ReactNode
  icon?: React.ReactNode
}

/**
 * GuestCTACard - Empty state with CTA for data-driven pages
 * Shows sample preview and encourages sign-up
 */
export function GuestCTACard({
  title,
  description,
  ctaText = '가입하고 시작하기',
  ctaHref = '/auth/sign-up',
  preview,
  icon,
}: GuestCTACardProps) {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Preview Section (Optional) */}
        {preview && (
          <div className="mb-8 relative">
            <div className="blur-sm opacity-50 pointer-events-none select-none">{preview}</div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
          </div>
        )}

        {/* Main CTA Card */}
        <div className="bg-surface/40 border border-primary/20 p-8 md:p-12 text-center space-y-6 relative overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 opacity-5">
            <Sparkles className="w-32 h-32 text-primary" strokeWidth={0.5} />
          </div>

          {/* Icon */}
          <div className="relative z-10">
            {icon ? (
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                {icon}
              </div>
            ) : (
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" strokeWidth={1} />
              </div>
            )}
          </div>

          {/* Text Content */}
          <div className="space-y-3 relative z-10">
            <h2 className="text-3xl md:text-4xl font-serif text-ink-light">{title}</h2>
            <p className="text-sm md:text-base text-ink-light/70 font-light max-w-lg mx-auto leading-relaxed">
              {description}
            </p>
          </div>

          {/* CTA Button */}
          <div className="relative z-10 pt-4">
            <Link href={ctaHref}>
              <Button className="bg-primary hover:bg-primary-dim text-background font-serif px-8 py-6 text-base">
                {ctaText}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="relative z-10 pt-6 border-t border-primary/10">
            <p className="text-xs text-ink-light/70">무료 가입 후 모든 기능을 즉시 사용할 수 있습니다</p>
          </div>
        </div>
      </div>
    </div>
  )
}
