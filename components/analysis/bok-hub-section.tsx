'use client'

import { useEffect, useState } from 'react'
import { Sprout, Flower2, TreePine, Trees, Leaf } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { getBokTier } from '@/app/actions/payment/bok-points'
import { getTierLabel, type BokTier } from '@/lib/config/bok-tiers'

const TIER_ORDER: readonly BokTier[] = ['SEED', 'SPROUT', 'FLOWER', 'TREE', 'FOREST']

const TIER_ICONS: Record<BokTier, typeof Leaf> = {
  SEED: Leaf,
  SPROUT: Sprout,
  FLOWER: Flower2,
  TREE: TreePine,
  FOREST: Trees,
}

/**
 * 복 등급 색은 DESIGN.md 「Bok Tier Colors」가 정본이고, 그 값이 그대로
 * tailwind.config `bok.*` 토큰으로 등록돼 있다. Tailwind 기본 파스텔로 흉내 내면
 * DESIGN.md 값과 조용히 어긋나므로 토큰만 쓴다.
 */
const TIER_COLORS: Record<BokTier, string> = {
  SEED: 'text-bok-seed',
  SPROUT: 'text-bok-sprout',
  FLOWER: 'text-bok-flower',
  TREE: 'text-bok-tree',
  FOREST: 'text-bok-forest',
}

/**
 * 복 등급 게이지 — 다섯 단계 가운데 어디에 섰는지만 보인다.
 *
 * 🔴 복은 적립을 멈췄다(2026-09-18). 포인트 수·«다음 등급까지»·미션 보상을 다시 그리지 말 것 —
 *    쓸 곳 없이 쌓이는 숫자는 잔액형 재화로 읽힌다.
 */
export function BokHubSection() {
  const t = useTranslations('bok')
  const [tier, setTier] = useState<BokTier | null>(null)

  useEffect(() => {
    let alive = true
    getBokTier()
      .then((next) => {
        if (alive) setTier(next)
      })
      .catch(() => {
        if (alive) setTier('SEED')
      })
    return () => {
      alive = false
    }
  }, [])

  if (!tier) {
    return (
      <div className="bg-surface/30 border border-gold-500/20 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-1/3 mb-4" />
        <div className="h-1.5 bg-white/5 rounded w-full" />
      </div>
    )
  }

  const TierIcon = TIER_ICONS[tier]
  const reached = TIER_ORDER.indexOf(tier)

  return (
    <div className="hanji-card p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            'w-8 h-8 rounded-full bg-surface flex items-center justify-center border border-gold-500/20',
            TIER_COLORS[tier]
          )}
        >
          <TierIcon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-ink-light/60 font-sans">{t('points')}</p>
          <p className="text-sm font-serif font-medium text-ink-light">{getTierLabel(tier)}</p>
        </div>
      </div>

      <ol aria-label={t('points')} className="flex gap-1">
        {TIER_ORDER.map((step, i) => (
          <li
            key={step}
            aria-label={getTierLabel(step)}
            aria-current={step === tier ? 'step' : undefined}
            className={cn('h-1.5 flex-1 rounded-full', i <= reached ? 'bg-gold-500' : 'bg-white/5')}
          />
        ))}
      </ol>
    </div>
  )
}
