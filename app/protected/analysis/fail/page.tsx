'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { GA } from '@/lib/analytics/ga4'

function PaymentFailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations()

  const code = searchParams.get('code')
  const message = searchParams.get('message')

  GA.paywallClick('payment_fail')

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
      <div className="relative">
        <div className="absolute -inset-4 bg-seal/10 blur-xl rounded-full" />
        <AlertCircle className="w-20 h-20 text-seal relative animate-bounce" strokeWidth={1} />
      </div>

      <div className="text-center space-y-3 max-w-md">
        <h2 className="text-3xl font-serif font-bold text-ink-light">{t('payment.fail')}</h2>
        <div className="p-4 bg-surface rounded-xl border border-primary/20">
          <p className="text-sm text-ink-light/70 mb-1">
            {t('payment.errorCode')}: {code || 'UNKNOWN'}
          </p>
          <p className="text-base text-seal font-medium font-serif">
            {message || '알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link href="/protected/analysis" className="flex-1">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-primary/20 hover:bg-surface text-ink-light font-serif"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            분석 단계로 돌아가기
          </Button>
        </Link>
        <Button
          onClick={() => window.location.reload()}
          className="flex-1 h-12 rounded-xl bg-primary text-background hover:bg-primary/90 font-bold font-serif"
        >
          새로고침
        </Button>
      </div>

      <p className="text-xs text-ink-light/60">{t('payment.contactSupport')}</p>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-primary">Loading...</div>}>
      <PaymentFailContent />
    </Suspense>
  )
}
