'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, Crown, Coins, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
  /** 이미 무료 횟수를 소진한 경우 true, 마지막 1회 남은 넛지의 경우 false */
  isExhausted?: boolean
  usedCount?: number
  limit?: number
}

export function PaywallModal({ open, onClose, isExhausted = true, usedCount = 3, limit = 3 }: PaywallModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm mx-auto p-0 overflow-hidden border border-amber-400/30 bg-[#1a1208]">
        {/* 헤더 배경 */}
        <div className="relative bg-gradient-to-b from-amber-900/60 to-transparent px-6 pt-8 pb-4">
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-amber-400/60 hover:text-amber-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 아이콘 */}
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

        {/* 본문 */}
        <div className="px-6 pb-6 space-y-4">
          {/* 진행 표시 */}
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
              해화당의 AI 운세 분석을 계속 이용하시려면
              <br />
              <span className="text-amber-400 font-semibold">복채를 충전</span>하거나
              <span className="text-amber-400 font-semibold"> 멤버십</span>에 가입해주세요.
            </p>
          ) : (
            <p className="text-amber-100/80 text-sm text-center leading-relaxed">
              이번 분석 후 무료 횟수가 소진됩니다.
              <br />
              복채 충전 또는 멤버십 가입으로
              <br />
              <span className="text-amber-400 font-semibold">무제한 분석</span>을 이용하세요.
            </p>
          )}

          {/* 행동 버튼 */}
          <div className="space-y-2 pt-1">
            <Button
              asChild
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold"
              onClick={onClose}
            >
              <Link href="/protected/membership">
                <Crown className="w-4 h-4 mr-2" />
                멤버십 가입하기
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full border-amber-600/40 text-amber-300 hover:bg-amber-900/30"
              onClick={onClose}
            >
              <Link href="/protected/membership#bokchae">
                <Coins className="w-4 h-4 mr-2" />
                복채 충전하기
              </Link>
            </Button>

            {!isExhausted && (
              <button
                onClick={onClose}
                className="w-full text-amber-500/60 hover:text-amber-400 text-xs py-1 transition-colors"
              >
                이번 1회만 계속하기
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
