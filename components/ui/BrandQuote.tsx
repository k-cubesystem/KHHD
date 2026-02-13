'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
    hero: 'text-lg leading-relaxed text-[#D4AF37]/90 font-light tracking-wide mb-8',
    section: 'text-[15px] leading-relaxed text-[#D4AF37]/80 font-light tracking-wide mb-6',
    card: 'text-[13px] leading-relaxed text-[#D4AF37]/70 font-light tracking-wide mb-4',
    inline: 'text-[11px] leading-relaxed text-[#D4AF37]/60 font-light tracking-wide',
  }

  if (animate) {
    return (
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className={cn(variantStyles[variant], className)}
      >
        {children}
      </motion.p>
    )
  }

  return <p className={cn(variantStyles[variant], className)}>{children}</p>
}
