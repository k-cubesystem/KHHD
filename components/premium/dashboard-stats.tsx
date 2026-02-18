'use client'

import { Ticket, TrendingUp, Users, Archive } from 'lucide-react'
import { motion } from 'framer-motion'

interface DashboardStatsProps {
  balance: number
  summary: {
    daily_talismans: { used: number; limit: number }
    relationships: { current: number; limit: number }
    storage: { current: number; limit: number }
  }
  tier: 'SINGLE' | 'FAMILY' | 'BUSINESS' | 'TESTER' | null
}

/**
 * 대시보드 통계 카드 컴포넌트
 * 4개의 주요 통계를 카드 형식으로 표시
 */
export function DashboardStats({ balance, summary, tier }: DashboardStatsProps) {
  const stats = [
    {
      icon: Ticket,
      label: '보유 복채',
      value: balance.toLocaleString(),
      unit: '만냥',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      progress: undefined,
    },
    {
      icon: TrendingUp,
      label: '일일 한도 (오늘)',
      value: `${summary.daily_talismans.used} / ${summary.daily_talismans.limit}`,
      unit: '',
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      progress: (summary.daily_talismans.used / summary.daily_talismans.limit) * 100,
    },
    {
      icon: Users,
      label: '등록 인연',
      value: `${summary.relationships.current} / ${summary.relationships.limit}`,
      unit: '',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      progress: (summary.relationships.current / summary.relationships.limit) * 100,
    },
    {
      icon: Archive,
      label: '저장 공간',
      value:
        summary.storage.limit === 999
          ? '무제한'
          : `${summary.storage.current} / ${summary.storage.limit}`,
      unit: '',
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      progress:
        summary.storage.limit === 999 ? 0 : (summary.storage.current / summary.storage.limit) * 100,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-surface/30 rounded-xl p-6 border border-zen-border hover:border-zen-gold transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-zen-muted">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value} {stat.unit && <span className="text-base">{stat.unit}</span>}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {stat.progress !== undefined && stat.progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stat.progress, 100)}%` }}
                  transition={{ delay: idx * 0.1 + 0.2, duration: 0.5 }}
                  className={`h-full ${stat.bgColor} ${stat.color}`}
                  style={{ backgroundColor: 'currentColor' }}
                />
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
