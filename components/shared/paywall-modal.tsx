'use client'

import { useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { GA } from '@/lib/analytics/ga4'
import { useTranslations } from 'next-intl'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
  isExhausted?: boolean
  usedCount?: number
  limit?: number
}

export function PaywallModal({ open, onClose, isExhausted = true, usedCount = 3, limit = 3 }: PaywallModalProps) {
  const t = useTranslations('paywall')
  useEffect(() => {
    if (open) GA.paywallView()
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm mx-auto p-0 overflow-hidden border border-amber-400/30 bg-[#1a1208]">
        <div className="relative bg-gradient-to-b from-amber-900/60 to-transparent px-6 pt-8 pb-4">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-amber-400/60 hover:text-amber-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          <DialogHeader className="text-center">
            <DialogTitle className="text-amber-200 text-lg font-bold leading-snug">
              {isExhausted ? (
                <>
                  무료 분석 {limit}회를
                  <br />
                  모두 사용했습니다
                </>
              ) : (
                <>무료 분석 1회 남았습니다</>
              )}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div className="flex items-center gap-1 justify-center">
            {Array.from({ length: limit }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 flex-1 rounded-full transition-colors',
                  i < usedCount ? 'bg-amber-500' : 'bg-amber-900/40 border border-amber-700/30'
                )}
              />
            ))}
          </div>
          <p className="text-amber-300/70 text-xs text-center">
            {usedCount} / {limit} 무료 분석 사용
          </p>

          {isExhausted ? (
            <p className="text-amber-100/80 text-sm text-center leading-relaxed">
              {t('exhausted')}
              <br />
              <span className="text-amber-400 font-semibold">{t('unlockAction')}</span>
            </p>
          ) : (
            <p className="text-amber-100/80 text-sm text-center leading-relaxed">
              {t('lastChance')}
              <br />
              <span className="text-amber-400 font-semibold">{t('unlockUnlimited')}</span>
            </p>
          )}

          <div className="space-y-2 pt-1">
            <Button
              asChild
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold h-12 text-base"
              onClick={() => {
                GA.paywallClick('unlock')
                onClose()
              }}
            >
              <Link href="/protected/membership">
                <Sparkles className="w-4 h-4 mr-2" />
                {t('unlock')}
              </Link>
            </Button>

            <div className="text-center">
              <Link
                href="/protected/membership#bokchae"
                onClick={() => {
                  GA.paywallClick('bokchae')
                  onClose()
                }}
                className="text-amber-400/50 hover:text-amber-300 text-xs transition-colors underline underline-offset-2"
              >
                {t('otherMethods')}
              </Link>
            </div>

            {!isExhausted && (
              <button
                onClick={onClose}
                className="w-full text-amber-500/60 hover:text-amber-400 text-xs py-1 transition-colors"
              >
                {t('continue')}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
