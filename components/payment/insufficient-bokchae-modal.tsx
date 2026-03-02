'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Coins, Calendar, Crown, X } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface InsufficientBokchaeModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
  requiredAmount: number
  /** Optional label for the feature being attempted, e.g. "관상 분석" */
  featureLabel?: string
}

export function InsufficientBokchaeModal({
  isOpen,
  onClose,
  currentBalance,
  requiredAmount,
  featureLabel,
}: InsufficientBokchaeModalProps) {
  const shortfall = Math.max(0, requiredAmount - currentBalance)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#1a1208] border border-[#D4AF37]/30 text-amber-50 max-w-sm p-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">복채 부족 안내</DialogTitle>

        {/* Header gradient band */}
        <div className="relative bg-gradient-to-b from-[#2a1f08] to-[#1a1208] px-6 pt-6 pb-4 text-center border-b border-[#D4AF37]/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-amber-400/60 hover:text-amber-400 transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 mb-3"
          >
            <Coins size={32} className="text-[#D4AF37]" />
          </motion.div>

          <h2 className="text-lg font-semibold text-amber-100 leading-snug">복채가 부족합니다</h2>
          <p className="text-sm text-amber-300/70 mt-1">
            {featureLabel ? `${featureLabel}을(를) 보려면 복채가 필요합니다` : '운명을 보려면 복채가 필요합니다'}
          </p>
        </div>

        {/* Balance info */}
        <div className="px-6 py-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-amber-300/70">현재 잔액</span>
            <span className="text-amber-200 font-medium">{currentBalance}만냥</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-amber-300/70">필요 복채</span>
            <span className="text-amber-200 font-medium">{requiredAmount}만냥</span>
          </div>
          <div className="h-px bg-[#D4AF37]/20" />
          <div className="flex justify-between items-center text-sm font-semibold">
            <span className="text-amber-300">부족한 복채</span>
            <span className="text-[#D4AF37]">{shortfall}만냥</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 space-y-2.5">
          <Button
            asChild
            className="w-full bg-[#D4AF37] hover:bg-[#c9a62e] text-black font-semibold h-11 rounded-xl"
            onClick={onClose}
          >
            <Link href="/protected/membership">
              <Coins size={16} className="mr-2" />
              복채 충전하기
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full border-[#D4AF37]/30 text-amber-200 hover:bg-[#D4AF37]/10 hover:text-amber-100 h-11 rounded-xl bg-transparent"
            onClick={onClose}
          >
            <Link href="/protected/fortune">
              <Calendar size={16} className="mr-2" />
              출석체크로 모으기
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full border-[#D4AF37]/20 text-amber-300/70 hover:bg-[#D4AF37]/5 hover:text-amber-200 h-10 rounded-xl bg-transparent text-sm"
            onClick={onClose}
          >
            <Link href="/protected/membership">
              <Crown size={14} className="mr-2" />
              멤버십 업그레이드
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
