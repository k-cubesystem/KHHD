'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, Zap, Star, X, Check, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getMembershipPlans, type MembershipPlan } from '@/app/actions/payment/subscription'
import {
  FREE_RETENTION_DAYS,
  FREE_TIER_LIMITS,
  UNLIMITED_STORAGE_LIMIT,
  intervalWords,
  membershipBenefitLines,
  toPlanFacts,
  type MembershipPlanFacts,
} from '@/lib/domain/payment/membership-benefits'
import { logger } from '@/lib/utils/logger'

// ─── Tier presentation ───────────────────────────────────────────────────────
//
// 🔴 등급의 «숫자»(가격·복채·인연·기록)는 여기에 적지 않는다. 예전엔 이 파일이 DB 를 손으로 베껴
//    두었다가 실제와 어긋났다(무료 인연 1명·기록 3개로 적혀 있었으나 실제는 3명·10개, 지급 주기도
//    «매일»로 잘못 적혀 있었다). 이제 membership_plans 를 그대로 읽고 문구는
//    lib/domain/payment/membership-benefits.ts 가 만든다. 여기 남는 것은 색·아이콘뿐이다.

export type MembershipTier = 'FREE' | 'SINGLE' | 'FAMILY' | 'BUSINESS'

export type NudgeTrigger = 'DAILY_LIMIT' | 'PREMIUM_FEATURE' | 'GENTLE_REMINDER'

interface TierStyle {
  name: string
  color: string
  borderColor: string
  badgeClass: string
  icon: React.ReactNode
}

/** 이름은 플랜을 못 불러왔을 때의 폴백 — 불러오면 DB 의 plan.name 이 이긴다. */
const TIER_STYLE: Record<MembershipTier, TierStyle> = {
  FREE: {
    name: '무료',
    color: 'text-ink-light/60',
    borderColor: 'border-white/10',
    badgeClass: 'bg-white/[0.08] text-ink-light/80',
    icon: <Star className="w-4 h-4" />,
  },
  SINGLE: {
    name: '싱글 멤버십',
    color: 'text-gold-300',
    borderColor: 'border-gold-500/40',
    badgeClass: 'bg-gold-700/40 text-gold-300',
    icon: <Star className="w-4 h-4" />,
  },
  FAMILY: {
    name: '패밀리 멤버십',
    color: 'text-gold-500',
    borderColor: 'border-gold-500/50',
    badgeClass: 'bg-gold-500/20 text-gold-500',
    icon: <Crown className="w-4 h-4" />,
  },
  BUSINESS: {
    name: '비즈니스 멤버십',
    color: 'text-gold-antique',
    borderColor: 'border-gold-antique/40',
    badgeClass: 'bg-gold-antique/15 text-gold-antique',
    icon: <Zap className="w-4 h-4" />,
  },
}

/** 화면이 실제로 쓰는 등급 정보 — 스타일 + DB 에서 온 사실. */
interface TierView {
  tier: MembershipTier
  name: string
  style: TierStyle
  /** 원(KRW). 무료는 0. */
  price: number
  facts: MembershipPlanFacts | null
  perks: string[]
}

/** 무료 등급은 파는 상품이 아니라 «지금 상태»라 플랜 행이 없다 — 단일 출처 상수로 세운다. */
function freeTierView(): TierView {
  return {
    tier: 'FREE',
    name: TIER_STYLE.FREE.name,
    style: TIER_STYLE.FREE,
    price: 0,
    facts: {
      interval: 'MONTH',
      talismansPerPeriod: FREE_TIER_LIMITS.talismansPerPeriod,
      relationshipLimit: FREE_TIER_LIMITS.relationshipLimit,
      storageLimit: FREE_TIER_LIMITS.storageLimit,
    },
    perks: [`사주·궁합·관상·손금 개별 과금 이용`, `기록은 최근 ${FREE_RETENTION_DAYS}일까지 열람`],
  }
}

function planTierView(plan: MembershipPlan): TierView {
  const style = TIER_STYLE[plan.tier] ?? TIER_STYLE.SINGLE
  const facts = toPlanFacts(plan)
  return {
    tier: plan.tier,
    name: plan.name,
    style,
    price: plan.price,
    facts,
    perks: membershipBenefitLines(facts),
  }
}

/** 가격 표기 — 주기도 플랜에서 온다(연 결제 플랜이 생겨도 «/월»로 굳지 않게). */
function priceLabel(view: TierView): string {
  if (view.tier === 'FREE') return '무료'
  if (!view.facts) return ''
  return `${view.price.toLocaleString()}원/${intervalWords(view.facts.interval).price}`
}

/**
 * 등급 비교 3줄. «복채 N만냥/일»이라 적던 자리 — 그건 지급량이 아니라 하루 사용 상한이었다.
 * 지급은 주기 단위이므로 그대로 «달마다 N만냥»으로 적는다.
 */
function factLines(view: TierView): string[] {
  const f = view.facts
  if (!f) return []
  const bokchae =
    f.talismansPerPeriod > 0
      ? `복채 ${intervalWords(f.interval).every}마다 ${f.talismansPerPeriod}만냥`
      : '복채 지급 없음'
  const records = f.storageLimit === UNLIMITED_STORAGE_LIMIT ? '기록 제한 없음' : `기록 ${f.storageLimit}개`
  return [bokchae, `인연 ${f.relationshipLimit}명`, records]
}

// Returns the next tier up from the given tier
function getNextTier(current: MembershipTier | null | undefined): MembershipTier {
  if (!current || current === 'FREE') return 'SINGLE'
  if (current === 'SINGLE') return 'FAMILY'
  if (current === 'FAMILY') return 'BUSINESS'
  return 'BUSINESS'
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
  const [plans, setPlans] = useState<MembershipPlan[]>([])

  // 등급 비교표는 실제 판매 중인 플랜을 그대로 읽는다 — 열릴 때 한 번만.
  useEffect(() => {
    if (!isOpen || plans.length > 0) return
    let alive = true
    getMembershipPlans()
      .then((rows) => {
        if (alive) setPlans(rows)
      })
      .catch((err) => logger.warn('[MembershipNudgeModal] 플랜 조회 실패 — 숫자 없이 표시', err))
    return () => {
      alive = false
    }
  }, [isOpen, plans.length])

  const current = currentTier ?? 'FREE'
  const next = getNextTier(current)

  const viewOf = (tier: MembershipTier): TierView => {
    if (tier === 'FREE') return freeTierView()
    const plan = plans.find((p) => p.tier === tier)
    return plan
      ? planTierView(plan)
      : { tier, name: TIER_STYLE[tier].name, style: TIER_STYLE[tier], price: 0, facts: null, perks: [] }
  }

  const currentInfo = viewOf(current)
  const nextInfo = viewOf(next)
  const copy = TRIGGER_COPY[trigger]

  // Features only in next tier (diff)
  const currentPerks = new Set(currentInfo.perks)
  const newPerks = nextInfo.perks.filter((p) => !currentPerks.has(p))

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#1a1208] border border-gold-500/30 text-ink-primary max-w-md p-0 overflow-hidden rounded-2xl">
        <DialogTitle className="sr-only">멤버십 업그레이드 안내</DialogTitle>

        {/* Header */}
        <div className="relative bg-gradient-to-b from-[#2a1f08] to-[#1a1208] px-6 pt-6 pb-5 border-b border-gold-500/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gold-500/60 hover:text-gold-500 transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/30"
            >
              <Crown size={24} className="text-gold-500" />
            </motion.div>

            <div>
              <h2 className="text-base font-semibold text-ink-primary leading-snug">{copy.title}</h2>
              <p className="text-xs text-gold-300/70 mt-0.5">
                {featureLabel ? `${featureLabel} · ` : ''}
                {copy.subtitle}
              </p>
            </div>
          </div>

          {/* 🔴 여기 있던 «지금 업그레이드하면 N% 할인 혜택» 배지를 걷어냈다(2026-08-12).
              결제 경로(createBillingAuthUrl → 토스 빌링)는 언제나 plan.price 를 그대로 청구한다 —
              업그레이드 할인은 코드 어디에도 없어 «없는 가격»을 광고하고 있었다.
              프로모션을 실제로 만들면 그때 «가격 출처»와 함께 되살릴 것. */}
        </div>

        {/* Tier comparison */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs text-gold-300/60 font-medium uppercase tracking-wider">등급 비교</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Current tier */}
            <div className={cn('rounded-xl border p-3 bg-white/[0.02]', currentInfo.style.borderColor)}>
              <div className="flex items-center gap-1.5 mb-2">
                <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full', currentInfo.style.badgeClass)}>현재</Badge>
              </div>
              <p className={cn('text-sm font-semibold', currentInfo.style.color)}>{currentInfo.name}</p>
              <p className="text-xs text-gold-300/50 mt-1">{priceLabel(currentInfo)}</p>
              <ul className="mt-2 space-y-1">
                {factLines(currentInfo).map((line) => (
                  <li key={line} className="text-xs text-gold-300/60">
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            {/* Next tier */}
            <div
              className={cn(
                'rounded-xl border p-3 relative overflow-hidden',
                nextInfo.style.borderColor,
                'bg-gradient-to-br from-[#2a1f08]/80 to-[#1a1208]/80'
              )}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gold-500/5 pointer-events-none" />

              <div className="flex items-center gap-1.5 mb-2">
                <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full', nextInfo.style.badgeClass)}>추천</Badge>
              </div>
              <p className={cn('text-sm font-semibold', nextInfo.style.color)}>{nextInfo.name}</p>
              <p className="text-xs text-gold-300/50 mt-1">{priceLabel(nextInfo)}</p>
              <ul className="mt-2 space-y-1">
                {factLines(nextInfo).map((line) => (
                  <li key={line} className="text-xs text-gold-500/90 font-medium">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* New perks list */}
          {newPerks.length > 0 && (
            <div className="bg-gold-500/5 border border-gold-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-gold-500 font-semibold mb-2 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                업그레이드 시 추가 혜택
              </p>
              <ul className="space-y-1.5">
                {newPerks.map((perk, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gold-200/80">
                    <Check className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />
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
            className="w-full h-11 bg-gold-500 hover:bg-[#c9a62e] text-black font-semibold rounded-xl"
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
            className="w-full text-xs text-gold-300/50 hover:text-gold-300/80 transition-colors py-1"
          >
            나중에 하기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
