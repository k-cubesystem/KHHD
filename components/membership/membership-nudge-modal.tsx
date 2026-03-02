'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, Zap, Star, X, Check, ArrowRight, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── Tier definitions (mirrors DB data) ─────────────────────────────────────

export type MembershipTier = 'FREE' | 'SINGLE' | 'FAMILY' | 'BUSINESS'

export type NudgeTrigger = 'DAILY_LIMIT' | 'PREMIUM_FEATURE' | 'GENTLE_REMINDER'

interface TierInfo {
  tier: MembershipTier
  name: string
  price: number
  dailyLimit: number
  relationshipLimit: number
  storageLimit: number | '무제한'
  color: string
  borderColor: string
  badgeClass: string
  icon: React.ReactNode
  perks: string[]
}

const TIER_INFO: Record<MembershipTier, TierInfo> = {
  FREE: {
    tier: 'FREE',
    name: '무료',
    price: 0,
    dailyLimit: 0,
    relationshipLimit: 1,
    storageLimit: 3,
    color: 'text-zinc-400',
    borderColor: 'border-zinc-600/40',
    badgeClass: 'bg-zinc-700 text-zinc-300',
    icon: <Star className="w-4 h-4" />,
    perks: ['기본 사주 조회', '인연 1명 등록'],
  },
  SINGLE: {
    tier: 'SINGLE',
    name: '싱글 멤버십',
    price: 9900,
    dailyLimit: 10,
    relationshipLimit: 3,
    storageLimit: 10,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    badgeClass: 'bg-amber-900/60 text-amber-300',
    icon: <Star className="w-4 h-4" />,
    perks: ['일일 복채 10만냥', '인연 3명 등록', '분석 기록 10개', 'AI 무당 상담', '출석체크 보너스'],
  },
  FAMILY: {
    tier: 'FAMILY',
    name: '패밀리 멤버십',
    price: 29900,
    dailyLimit: 30,
    relationshipLimit: 10,
    storageLimit: 50,
    color: 'text-[#D4AF37]',
    borderColor: 'border-[#D4AF37]/50',
    badgeClass: 'bg-[#D4AF37]/20 text-[#D4AF37]',
    icon: <Crown className="w-4 h-4" />,
    perks: [
      '일일 복채 30만냥',
      '인연 10명 등록',
      '분석 기록 50개',
      'AI 무당 상담',
      '가족 궁합 분석',
      '인연 네트워크 시각화',
      '복채 충전 15% 보너스',
    ],
  },
  BUSINESS: {
    tier: 'BUSINESS',
    name: '비즈니스 멤버십',
    price: 99000,
    dailyLimit: 100,
    relationshipLimit: 50,
    storageLimit: '무제한',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    badgeClass: 'bg-purple-900/60 text-purple-300',
    icon: <Zap className="w-4 h-4" />,
    perks: [
      '일일 복채 100만냥',
      '인연 50명 등록',
      '분석 기록 무제한',
      '우선 처리 AI 상담',
      '맞춤 보고서',
      '복채 충전 20% 보너스',
    ],
  },
}

// Returns the next tier up from the given tier
function getNextTier(current: MembershipTier | null | undefined): MembershipTier {
  if (!current || current === 'FREE') return 'SINGLE'
  if (current === 'SINGLE') return 'FAMILY'
  if (current === 'FAMILY') return 'BUSINESS'
  return 'BUSINESS'
}

// Map numeric discount by tier upgrade path
const UPGRADE_DISCOUNTS: Partial<Record<`${MembershipTier}->${MembershipTier}`, number>> = {
  'FREE->SINGLE': 15,
  'SINGLE->FAMILY': 20,
  'FAMILY->BUSINESS': 25,
}

// ─── Trigger copy ─────────────────────────────────────────────────────────────

const TRIGGER_COPY: Record<NudgeTrigger, { title: string; subtitle: string }> = {
  DAILY_LIMIT: {
    title: '오늘의 복채 한도에 도달했습니다',
    subtitle: '업그레이드하면 더 많은 운세를 볼 수 있어요',
  },
  PREMIUM_FEATURE: {
    title: '프리미엄 기능입니다',
    subtitle: '이 기능은 더 높은 멤버십 등급에서 이용 가능합니다',
  },
  GENTLE_REMINDER: {
    title: '운세 분석이 쌓이고 있어요',
    subtitle: '업그레이드로 한도를 늘리고 더 많은 혜택을 누리세요',
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MembershipNudgeModalProps {
  isOpen: boolean
  onClose: () => void
  trigger: NudgeTrigger
  /** Current tier – pass null / undefined for unsubscribed users */
  currentTier?: MembershipTier | null
  /** Optional feature name that triggered the nudge */
  featureLabel?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembershipNudgeModal({
  isOpen,
  onClose,
  trigger,
  currentTier,
  featureLabel,
}: MembershipNudgeModalProps) {
  const current = currentTier ?? 'FREE'
  const next = getNextTier(current)
  const currentInfo = TIER_INFO[current]
  const nextInfo = TIER_INFO[next]
  const discountKey = `${current}->${next}` as `${MembershipTier}->${MembershipTier}`
  const discount = UPGRADE_DISCOUNTS[discountKey]
  const copy = TRIGGER_COPY[trigger]

  // Features only in next tier (diff)
  const currentPerks = new Set(currentInfo.perks)
  const newPerks = nextInfo.perks.filter((p) => !currentPerks.has(p))

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#1a1208] border border-[#D4AF37]/30 text-amber-50 max-w-md p-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">멤버십 업그레이드 안내</DialogTitle>

        {/* Header */}
        <div className="relative bg-gradient-to-b from-[#2a1f08] to-[#1a1208] px-6 pt-6 pb-5 border-b border-[#D4AF37]/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-amber-400/60 hover:text-amber-400 transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30"
            >
              <Crown size={24} className="text-[#D4AF37]" />
            </motion.div>

            <div>
              <h2 className="text-base font-semibold text-amber-100 leading-snug">{copy.title}</h2>
              <p className="text-xs text-amber-300/70 mt-0.5">
                {featureLabel ? `${featureLabel} · ` : ''}
                {copy.subtitle}
              </p>
            </div>
          </div>

          {/* Discount urgency badge */}
          {discount && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-1.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-full px-3 py-1"
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-xs font-semibold text-[#D4AF37]">지금 업그레이드하면 {discount}% 할인 혜택</span>
            </motion.div>
          )}
        </div>

        {/* Tier comparison */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs text-amber-300/60 font-medium uppercase tracking-wider">등급 비교</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Current tier */}
            <div className={cn('rounded-xl border p-3 bg-white/[0.02]', currentInfo.borderColor)}>
              <div className="flex items-center gap-1.5 mb-2">
                <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full', currentInfo.badgeClass)}>현재</Badge>
              </div>
              <p className={cn('text-sm font-semibold', currentInfo.color)}>{currentInfo.name}</p>
              <p className="text-xs text-amber-300/50 mt-1">
                {currentInfo.price === 0 ? '무료' : `${currentInfo.price.toLocaleString()}원/월`}
              </p>
              <ul className="mt-2 space-y-1">
                <li className="text-xs text-amber-300/60">복채 {currentInfo.dailyLimit}만냥/일</li>
                <li className="text-xs text-amber-300/60">인연 {currentInfo.relationshipLimit}명</li>
                <li className="text-xs text-amber-300/60">
                  기록 {currentInfo.storageLimit}
                  {typeof currentInfo.storageLimit === 'number' ? '개' : ''}
                </li>
              </ul>
            </div>

            {/* Next tier */}
            <div
              className={cn(
                'rounded-xl border p-3 relative overflow-hidden',
                nextInfo.borderColor,
                'bg-gradient-to-br from-[#2a1f08]/80 to-[#1a1208]/80'
              )}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-[#D4AF37]/5 pointer-events-none" />

              <div className="flex items-center gap-1.5 mb-2">
                <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full', nextInfo.badgeClass)}>추천</Badge>
              </div>
              <p className={cn('text-sm font-semibold', nextInfo.color)}>{nextInfo.name}</p>
              <p className="text-xs text-amber-300/50 mt-1">{nextInfo.price.toLocaleString()}원/월</p>
              <ul className="mt-2 space-y-1">
                <li className="text-xs text-[#D4AF37]/90 font-medium">복채 {nextInfo.dailyLimit}만냥/일</li>
                <li className="text-xs text-[#D4AF37]/90 font-medium">인연 {nextInfo.relationshipLimit}명</li>
                <li className="text-xs text-[#D4AF37]/90 font-medium">
                  기록 {nextInfo.storageLimit}
                  {typeof nextInfo.storageLimit === 'number' ? '개' : ''}
                </li>
              </ul>
            </div>
          </div>

          {/* New perks list */}
          {newPerks.length > 0 && (
            <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl px-4 py-3">
              <p className="text-xs text-[#D4AF37] font-semibold mb-2 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                업그레이드 시 추가 혜택
              </p>
              <ul className="space-y-1.5">
                {newPerks.map((perk, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-amber-200/80">
                    <Check className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 space-y-2.5">
          <Button
            asChild
            className="w-full h-11 bg-[#D4AF37] hover:bg-[#c9a62e] text-black font-semibold rounded-xl"
            onClick={onClose}
          >
            <Link href="/protected/membership">
              <Crown size={16} className="mr-2" />
              {nextInfo.name}으로 업그레이드
              <ArrowRight size={15} className="ml-2" />
            </Link>
          </Button>

          <button
            onClick={onClose}
            className="w-full text-xs text-amber-300/50 hover:text-amber-300/80 transition-colors py-1"
          >
            나중에 하기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
