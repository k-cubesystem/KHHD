'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { setLocale } from '@/i18n/navigation'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/i18n/request'

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    const next: Locale = locale === 'ko' ? 'en' : 'ko'
    startTransition(async () => {
      await setLocale(next)
      window.location.reload()
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      aria-label={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
        'text-ink-light/70 hover:text-ink-light hover:bg-white/5',
        isPending && 'opacity-50',
        className
      )}
    >
      <Globe className="w-3.5 h-3.5" />
      <span>{locale === 'ko' ? 'EN' : '한국어'}</span>
    </button>
  )
}
