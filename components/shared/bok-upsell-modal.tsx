'use client'

import { useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Stamp, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { GA } from '@/lib/analytics/ga4'
import { useTranslations } from 'next-intl'

interface BokUpsellModalProps {
  open: boolean
  onClose: () => void
  currentCount: number
  limit: number
}

export function BokUpsellModal({ open, onClose, currentCount, limit }: BokUpsellModalProps) {
  const t = useTranslations('bok')

  useEffect(() => {
    if (open) GA.paywallView()
  }, [open])

  const progressPercent = Math.min((currentCount / limit) * 100, 100)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm mx-auto p-0 overflow-hidden border border-[#C83232]/30 bg-[#1a1208]">
        <div className="relative bg-gradient-to-b from-[#C83232]/40 to-transparent px-6 pt-8 pb-4 dancheong-border-top">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#C83232]/60 hover:text-[#C83232] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full bg-[#C83232]/20 border border-[#C83232]/30 flex items-center justify-center">
              <Stamp className="w-8 h-8 text-[#C83232]" />
            </div>
          </div>

          <DialogHeader className="text-center">
            <DialogTitle className="text-amber-200 text-lg font-bold leading-snug">{t('upgrade.title')}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div className="space-y-2">
            <div className="w-full h-2.5 rounded-full bg-[#C83232]/10 border border-[#C83232]/20 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500 ease-out', 'bg-[#C83232]')}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-amber-300/70 text-xs text-center">
              {currentCount} / {limit}
            </p>
          </div>

          <div className="flex justify-center">
            <span className="bok-badge">{t('upgrade.title')}</span>
          </div>

          <p className="text-amber-100/80 text-sm text-center leading-relaxed hanji-card rounded-lg p-3">
            {t('upgrade.desc')}
          </p>

          <div className="space-y-2 pt-1">
            <Button
              asChild
              className="w-full bg-[#C83232] hover:bg-[#a82828] text-white font-bold h-12 text-base"
              onClick={() => {
                GA.paywallClick('bok_upsell')
                onClose()
              }}
            >
              <Link href="/protected/membership">
                <Stamp className="w-4 h-4 mr-2" />
                {t('upgrade.cta')}
              </Link>
            </Button>

            <div className="text-center">
              <button
                onClick={onClose}
                className="text-amber-500/60 hover:text-amber-400 text-xs py-1 transition-colors"
              >
                {t('upgrade.later')}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
