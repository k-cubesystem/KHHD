'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Crown, Ticket, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePassSummary } from '@/hooks/use-passes'
import { formatPassUnits, passSummaryLines } from '@/lib/domain/entitlement/pass'

interface InsufficientPassModalProps {
  isOpen: boolean
  onClose: () => void
  requiredUnits: number
  /** 예: "관상 풀이" */
  featureLabel?: string
}

/** 이용권이 모자랄 때 — 멤버십(매달 받는 몫)과 이용권 구매 두 길만 보인다. */
export function InsufficientPassModal({ isOpen, onClose, requiredUnits, featureLabel }: InsufficientPassModalProps) {
  const { data: summary } = usePassSummary()
  const lines = summary ? passSummaryLines(summary) : []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#1a1208] border border-gold-500/30 text-ink-primary max-w-sm p-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">이용권 부족 안내</DialogTitle>
        <DialogDescription className="sr-only">이용권을 구매하거나 멤버십으로 이어서 볼 수 있어요.</DialogDescription>

        <div className="relative bg-gradient-to-b from-[#2a1f08] to-[#1a1208] px-6 pt-6 pb-4 text-center border-b border-gold-500/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gold-500/60 hover:text-gold-500 transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/30 mb-3"
          >
            <Ticket size={32} className="text-gold-500" />
          </motion.div>

          <h2 className="text-lg font-semibold text-ink-primary leading-snug">이용권이 부족해요</h2>
          <p className="text-sm text-gold-300/70 mt-1">
            {featureLabel
              ? `${featureLabel}에는 ${formatPassUnits(requiredUnits)}이 필요해요`
              : `${formatPassUnits(requiredUnits)}이 필요해요`}
          </p>
        </div>

        <div className="px-6 py-4 space-y-1.5">
          {lines.length > 0 ? (
            lines.map((line) => (
              <p key={line} className="text-sm text-gold-200/80">
                {line}
              </p>
            ))
          ) : (
            <p className="text-sm text-gold-200/80">지금 쓸 수 있는 이용권이 없어요.</p>
          )}
        </div>

        <div className="px-6 pb-6 space-y-2.5">
          <Button
            asChild
            className="w-full bg-gold-500 hover:bg-[#c9a62e] text-black font-semibold h-11 rounded-xl"
            onClick={onClose}
          >
            <Link href="/protected/store?tab=pass">
              <Ticket size={16} className="mr-2" />
              이용권 구매하기
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full border-gold-500/30 text-gold-200 hover:bg-gold-500/10 hover:text-ink-primary h-11 rounded-xl bg-transparent"
            onClick={onClose}
          >
            <Link href="/protected/store?tab=membership">
              <Crown size={16} className="mr-2" />
              멤버십 — 매달 이용권 받기
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
