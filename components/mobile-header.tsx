'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Home } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export function MobileHeader() {
  const router = useRouter()
  const t = useTranslations()

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[480px]">
      <header className="h-14 bg-background/80 backdrop-blur-md border-b border-primary/10 px-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-start text-ink-light/70 hover:text-primary transition-colors"
          aria-label={t('nav.back')}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <Link
          href="/protected/analysis"
          className="text-xs font-serif font-bold text-primary tracking-[0.2em] opacity-80 hover:opacity-100 transition-opacity"
        >
          {t('brand.name')}
        </Link>

        <Link
          href="/protected/analysis"
          className="w-10 h-10 flex items-center justify-end text-ink-light/70 hover:text-primary transition-colors"
          aria-label={t('nav.home')}
        >
          <Home className="w-5 h-5" />
        </Link>
      </header>
    </div>
  )
}
