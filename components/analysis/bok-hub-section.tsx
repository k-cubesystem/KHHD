'use client'

import { useState, useEffect } from 'react'
import { Sprout, Flower2, TreePine, Trees, Leaf, Check, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getBokPointsBalance,
  getBokMissions,
  completeBokMission,
  type BokPointsStatus,
  type BokMission,
} from '@/app/actions/payment/bok-points'
import { getTierLabel, getNextTierThreshold, type BokTier } from '@/lib/config/bok-tiers'
import { toast } from 'sonner'
import { GA } from '@/lib/analytics/ga4'
import { useTranslations } from 'next-intl'

const TIER_ICONS: Record<BokTier, typeof Leaf> = {
  SEED: Leaf,
  SPROUT: Sprout,
  FLOWER: Flower2,
  TREE: TreePine,
  FOREST: Trees,
}

const TIER_COLORS: Record<BokTier, string> = {
  SEED: 'text-amber-600',
  SPROUT: 'text-green-500',
  FLOWER: 'text-pink-400',
  TREE: 'text-emerald-500',
  FOREST: 'text-emerald-300',
}

export function BokHubSection() {
  const t = useTranslations('bok')
  const [status, setStatus] = useState<BokPointsStatus | null>(null)
  const [missions, setMissions] = useState<BokMission[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [bokStatus, bokMissions] = await Promise.all([getBokPointsBalance(), getBokMissions()])
      setStatus(bokStatus)
      setMissions(bokMissions)
    } catch {
      setStatus({ balance: 0, tier: 'SEED', lifetimeEarned: 0 })
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete(missionId: string) {
    setCompleting(missionId)
    const result = await completeBokMission(missionId)
    if (result.success) {
      toast.success(`+${result.pointsEarned}p 복 포인트 적립!`)
      GA.paywallClick('bok_mission_complete')
      await loadData()
    } else {
      toast.error(result.error || '미션 완료에 실패했습니다.')
    }
    setCompleting(null)
  }

  if (loading) {
    return (
      <div className="bg-surface/30 border border-gold-500/20 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-1/3 mb-4" />
        <div className="h-8 bg-white/5 rounded w-2/3" />
      </div>
    )
  }

  if (!status) return null

  const TierIcon = TIER_ICONS[status.tier]
  const nextThreshold = getNextTierThreshold(status.tier)
  const progress =
    status.tier === 'FOREST' ? 100 : Math.min(100, Math.round((status.lifetimeEarned / nextThreshold) * 100))
  const completedCount = missions.filter((m) => m.isCompleted).length
  const totalMissions = missions.length

  return (
    <div className="space-y-3">
      {/* 복 등급 + 포인트 */}
      <div className="hanji-card p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full bg-surface flex items-center justify-center border border-gold-500/20',
                TIER_COLORS[status.tier]
              )}
            >
              <TierIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-ink-light/60 font-sans">{getTierLabel(status.tier)}</p>
              <p className="text-sm font-serif font-medium text-ink-light">{status.balance.toLocaleString()}p</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-ink-light/40 font-sans">{t('accumulated')}</p>
            <p className="text-xs text-gold-500 font-medium">{status.lifetimeEarned.toLocaleString()}p</p>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold-500/60 to-gold-500 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        {status.tier !== 'FOREST' && (
          <p className="text-[10px] text-ink-light/40 mt-1 text-right font-sans">
            다음 등급까지 {(nextThreshold - status.lifetimeEarned).toLocaleString()}p
          </p>
        )}
      </div>

      {/* 오늘의 복 미션 */}
      {totalMissions > 0 && (
        <div className="hanji-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold-500" />
              <h3 className="text-xs font-serif text-gold-500/80">{t('mission')}</h3>
            </div>
            <span className="text-[10px] text-ink-light/40 font-sans">
              {completedCount}/{totalMissions}
            </span>
          </div>

          <div className="space-y-2">
            {missions.slice(0, 5).map((mission) => (
              <button
                key={mission.id}
                onClick={() => !mission.isCompleted && handleComplete(mission.id)}
                disabled={mission.isCompleted || completing === mission.id}
                className={cn(
                  'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all',
                  mission.isCompleted ? 'bg-white/3 opacity-60' : 'bg-white/5 hover:bg-white/8 active:scale-[0.98]'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors',
                    mission.isCompleted
                      ? 'bg-gold-500/20 border-gold-500/40'
                      : 'border-white/20 hover:border-gold-500/30'
                  )}
                >
                  {completing === mission.id ? (
                    <Loader2 className="w-3 h-3 text-gold-500 animate-spin" />
                  ) : mission.isCompleted ? (
                    <Check className="w-3 h-3 text-gold-500" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs font-sans truncate',
                      mission.isCompleted ? 'text-ink-light/40 line-through' : 'text-ink-light/80'
                    )}
                  >
                    {mission.missionTitle}
                  </p>
                </div>
                <span className="text-[10px] text-gold-500/60 font-mono flex-shrink-0">+{mission.pointsReward}p</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
