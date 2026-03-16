'use client'

import { cn } from '@/lib/utils'

interface BrandQuoteProps {
  children: React.ReactNode
  variant?: 'hero' | 'section' | 'card' | 'inline'
  className?: string
  animate?: boolean
}

export function BrandQuote({
  children,
  variant = 'section',
  className,
  animate = true,
}: BrandQuoteProps) {
  const variantStyles = {
    hero: 'text-lg leading-relaxed text-gold-500/90 font-light tracking-wide mb-8',
    section: 'text-[15px] leading-relaxed text-gold-500/80 font-light tracking-wide mb-6',
    card: 'text-[13px] leading-relaxed text-gold-500/70 font-light tracking-wide mb-4',
    inline: 'text-[11px] leading-relaxed text-gold-500/60 font-light tracking-wide',
  }

  if (animate) {
    return (
      <p
        className={cn(variantStyles[variant], 'anim-fade-in-up', className)}
        style={{
          '--fade-y': '8px',
          animation: 'fade-in-up 0.7s ease-out both',
        } as React.CSSProperties}
      >
        {children}
      </p>
    )
  }

  return <p className={cn(variantStyles[variant], className)}>{children}</p>
}
