'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'
import Link from 'next/link'
import { GA } from '@/lib/analytics/ga4'

function FailContent() {
  const searchParams = useSearchParams()
  const t = useTranslations('payment')
  const message = searchParams.get('message') || t('failDesc')
  const code = searchParams.get('code')

  GA.paywallClick('payment_fail')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-error-light rounded-full flex items-center justify-center border border-error-border">
          <XCircle className="w-10 h-10 text-error-text" strokeWidth={1} />
        </div>

        <div>
          <h1 className="text-xl font-serif font-light text-ink-light mb-2">{t('fail')}</h1>
          <p className="text-ink-light/70 text-sm">{message}</p>
          {code && (
            <p className="text-ink-light/50 text-xs mt-1">
              {t('errorCode')}: {code}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Button
            asChild
            className="w-full h-12 bg-primary hover:bg-primary/90 text-background font-serif font-bold rounded-lg"
          >
            <Link href="/protected/membership">{t('retryPayment')}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full h-12 border-primary/20 text-white hover:bg-surface rounded-lg"
          >
            <Link href="/protected">{t('goToDashboard')}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function MembershipFailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-primary">Loading...</div>}>
      <FailContent />
    </Suspense>
  )
}
