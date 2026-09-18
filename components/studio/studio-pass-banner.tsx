'use client'

import { Ticket } from 'lucide-react'
import { usePassSummary } from '@/hooks/use-passes'
import { formatPassUnits, heldPassCount, passBadgeLabel } from '@/lib/domain/entitlement/pass'
import { formatFeatureCost, type FeatureCostKey } from '@/lib/domain/payment/feature-costs'

interface StudioPassBannerProps {
  /** 예: "관상 분석" */
  featureLabel: string
  costKey: FeatureCostKey
  /** 배경 그라디언트 색(화면마다 다르다). 예: "from-[#1A0F00]/80 to-[#0A192F]/80" */
  toneClassName: string
}

/**
 * 스튜디오 풀이 화면 머리의 «지금 쓸 수 있는 이용권 · 이 풀이에 드는 장 수» 띠.
 *
 * 🔴 멤버십 이번 달 몫과 보유 이용권을 한 숫자로 합치지 않는다. 멤버십이 있으면 이번 달 몫을
 *    먼저 말하고, 보유 이용권이 따로 있으면 그 옆에 따로 적는다.
 */
export function StudioPassBanner({ featureLabel, costKey, toneClassName }: StudioPassBannerProps) {
  const { data: summary } = usePassSummary()
  const extraHeld = summary && !summary.unlimited && summary.membership ? heldPassCount(summary) : 0

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-br ${toneClassName} p-4 backdrop-blur-sm`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.12),transparent_60%)]" />
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Ticket className="h-4 w-4 shrink-0 text-gold-500" />
          <span className="truncate font-serif text-sm font-bold text-gold-500">
            {summary ? passBadgeLabel(summary) : '—'}
            {extraHeld > 0 && (
              <span className="ml-1 font-sans text-xs font-normal text-white/50">
                · 보유 {formatPassUnits(extraHeld)}
              </span>
            )}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-gold-500/20 bg-gold-500/10 px-3 py-1">
          <span className="text-xs font-medium text-gold-500">{featureLabel}</span>
          <span className="text-xs text-white/50">·</span>
          <span className="font-serif text-sm font-bold text-gold-500">{formatFeatureCost(costKey)}</span>
        </div>
      </div>
    </div>
  )
}
