'use client'

import { motion } from 'framer-motion'
import { Shield, AlertTriangle, TrendingUp, Activity } from 'lucide-react'
import type { UnifiedRiskResult, URSLevel } from '@/lib/saju-engine/unified-risk'

interface UnifiedRiskDashboardProps {
  urs: UnifiedRiskResult
  className?: string
}

const LEVEL_COLORS: Record<URSLevel, { ring: string; bg: string; text: string; glow: string }> = {
  safe: {
    ring: 'stroke-emerald-400',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  caution: { ring: 'stroke-yellow-400', bg: 'bg-yellow-500/20', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
  warning: { ring: 'stroke-orange-400', bg: 'bg-orange-500/20', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  danger: { ring: 'stroke-red-400', bg: 'bg-red-500/20', text: 'text-red-400', glow: 'shadow-red-500/20' },
  critical: { ring: 'stroke-red-600', bg: 'bg-red-600/20', text: 'text-red-500', glow: 'shadow-red-600/30' },
}

function ScoreRing({ score, level }: { score: number; level: URSLevel }) {
  const colors = LEVEL_COLORS[level]
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-white/10" strokeWidth="6" />
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          className={colors.ring}
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-3xl font-black ${colors.text}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-white/50 text-[10px] font-medium">URS</span>
      </div>
    </div>
  )
}

function FusionBar({ label, score, weight, color }: { label: string; score: number; weight: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-white/50">
        <span>
          {label} (×{Math.round(weight * 100)}%)
        </span>
        <span>{score}점</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

export default function UnifiedRiskDashboard({ urs, className = '' }: UnifiedRiskDashboardProps) {
  const colors = LEVEL_COLORS[urs.level]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border border-white/10 bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm p-5 ${colors.glow} shadow-lg ${className}`}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-[#D4AF37]" />
        <h3 className="text-[#D4AF37] font-bold text-sm">통합 위험 분석 (URS)</h3>
        <motion.span
          animate={urs.level === 'critical' || urs.level === 'danger' ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={`ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold ${colors.bg} ${colors.text}`}
        >
          {urs.label}
        </motion.span>
      </div>

      {/* 점수 링 + 퓨전 breakdown */}
      <div className="flex items-center gap-5 mb-4">
        <ScoreRing score={urs.totalScore} level={urs.level} />
        <div className="flex-1 space-y-2">
          <FusionBar
            label="원국 분석"
            score={urs.fusionBreakdown.staticScore}
            weight={urs.fusionBreakdown.staticWeight}
            color="bg-blue-500"
          />
          <FusionBar
            label="시간축 동적"
            score={urs.fusionBreakdown.dynamicScore}
            weight={urs.fusionBreakdown.dynamicWeight}
            color="bg-purple-500"
          />
          <FusionBar
            label="첩경 룰베이스"
            score={urs.fusionBreakdown.ruleScore}
            weight={urs.fusionBreakdown.ruleWeight}
            color="bg-amber-500"
          />
        </div>
      </div>

      {/* Top Risks */}
      {urs.topRisks.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-white/60" />
            <span className="text-white/60 text-xs font-medium">주요 위험 요인</span>
          </div>
          <div className="space-y-1.5">
            {urs.topRisks.map((risk, i) => (
              <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg ${colors.bg}`}>
                <span className={`text-xs font-bold ${colors.text} mt-0.5`}>{i + 1}</span>
                <p className="text-white/80 text-xs leading-relaxed">{risk}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 카테고리 바 차트 */}
      {urs.categories.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 text-white/60" />
            <span className="text-white/60 text-xs font-medium">분석 항목별 위험도</span>
          </div>
          <div className="space-y-1">
            {urs.categories.slice(0, 6).map((cat, i) => {
              const catColors = LEVEL_COLORS[cat.level]
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-white/50 text-[10px] w-20 truncate">{cat.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.score}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className={`h-full rounded-full`}
                      style={{
                        backgroundColor:
                          cat.level === 'critical' || cat.level === 'danger'
                            ? '#ef4444'
                            : cat.level === 'warning'
                              ? '#f97316'
                              : cat.level === 'caution'
                                ? '#eab308'
                                : '#10b981',
                      }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold w-6 text-right ${catColors.text}`}>{cat.score}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 행동 지침 */}
      {urs.actionItems.length > 0 && (
        <div
          className={`rounded-xl p-3 ${colors.bg} border ${urs.level === 'critical' ? 'border-red-600/30' : 'border-white/10'}`}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[#D4AF37] text-xs font-bold">행동 지침</span>
          </div>
          <div className="space-y-1">
            {urs.actionItems.map((action, i) => (
              <p key={i} className="text-white/70 text-[11px] leading-relaxed">
                • {action}
              </p>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
