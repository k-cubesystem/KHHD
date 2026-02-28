'use client'

import { motion } from 'framer-motion'
import { Shield, Compass, Palette, Hash, Users, AlertTriangle, CheckCircle } from 'lucide-react'
import type { DailyAvoidanceResult, DailySeverity } from '@/lib/saju-engine/daily-avoidance'

interface DailyAvoidanceCardProps {
  dailyAvoidance: DailyAvoidanceResult
  className?: string
}

const SEVERITY_CONFIG: Record<
  DailySeverity,
  {
    bg: string
    border: string
    text: string
    icon: string
    pulse: boolean
  }
> = {
  safe: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary-dim',
    icon: '◇',
    pulse: false,
  },
  caution: {
    bg: 'bg-primary/15',
    border: 'border-primary/25',
    text: 'text-primary',
    icon: '◈',
    pulse: false,
  },
  warning: {
    bg: 'bg-primary-dark/20',
    border: 'border-primary-dark/30',
    text: 'text-primary-dark',
    icon: '◆',
    pulse: true,
  },
  danger: {
    bg: 'bg-primary-dark/25',
    border: 'border-primary-dark/40',
    text: 'text-gold-700',
    icon: '⬥',
    pulse: true,
  },
}

const DIRECTION_ANGLES: Record<string, number> = {
  동쪽: 90,
  서쪽: 270,
  남쪽: 180,
  북쪽: 0,
  동남쪽: 135,
  동북쪽: 45,
  서남쪽: 225,
  서북쪽: 315,
}

function MiniCompass({ avoidDirections }: { avoidDirections: string[] }) {
  const dirs = [
    { label: '북', angle: 0, x: 50, y: 8 },
    { label: '동', angle: 90, x: 92, y: 50 },
    { label: '남', angle: 180, x: 50, y: 92 },
    { label: '서', angle: 270, x: 8, y: 50 },
  ]

  const avoidAngles = avoidDirections.map((d) => DIRECTION_ANGLES[d]).filter((a) => a !== undefined)

  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20">
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-white/20" strokeWidth="1" />
      {/* 위험 방향 표시 */}
      {avoidAngles.map((angle, i) => {
        const rad = ((angle - 90) * Math.PI) / 180
        const x1 = 50 + 25 * Math.cos(rad)
        const y1 = 50 + 25 * Math.sin(rad)
        const x2 = 50 + 40 * Math.cos(rad)
        const y2 = 50 + 40 * Math.sin(rad)
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#C8B273"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />
        )
      })}
      {/* 방위 라벨 */}
      {dirs.map((d) => {
        const isDanger = avoidAngles.includes(d.angle)
        return (
          <text
            key={d.label}
            x={d.x}
            y={d.y + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            className={isDanger ? 'fill-primary-dark' : 'fill-white/60'}
          >
            {d.label}
          </text>
        )
      })}
      {/* 중앙 */}
      {avoidDirections.includes('중앙') && <circle cx="50" cy="50" r="6" fill="#C8B273" opacity="0.5" />}
    </svg>
  )
}

export default function DailyAvoidanceCard({ dailyAvoidance, className = '' }: DailyAvoidanceCardProps) {
  const config = SEVERITY_CONFIG[dailyAvoidance.severity]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border ${config.border} bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm p-5 ${className}`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="text-[#D4AF37] font-bold text-sm">오늘의 회피 가이드</h3>
          <span className="text-white/40 text-xs">{dailyAvoidance.date}</span>
        </div>
        <motion.div
          animate={config.pulse ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text} border ${config.border}`}
        >
          {config.icon} {dailyAvoidance.severityLabel}
        </motion.div>
      </div>

      {/* 점수 바 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/50 mb-1">
          <span>위험도</span>
          <span>{dailyAvoidance.severityScore}점</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${dailyAvoidance.severityScore}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              dailyAvoidance.severityScore >= 75
                ? 'bg-gold-700'
                : dailyAvoidance.severityScore >= 50
                  ? 'bg-primary-dark'
                  : dailyAvoidance.severityScore >= 30
                    ? 'bg-primary'
                    : 'bg-primary-dim'
            }`}
          />
        </div>
      </div>

      {/* 4분할 회피 정보 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* 색상 */}
        <div className="bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Palette className="w-3.5 h-3.5 text-white/60" />
            <span className="text-white/60 text-xs font-medium">피할 색상</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {dailyAvoidance.avoidColorHexes.slice(0, 4).map((hex, i) => (
              <div key={i} className="relative">
                <div className="w-7 h-7 rounded-full border border-white/20" style={{ backgroundColor: hex }} />
                {(dailyAvoidance.severity === 'danger' || dailyAvoidance.severity === 'warning') && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-7 h-0.5 bg-primary-dark rotate-45 rounded" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-white/40 text-[10px] mt-1.5">{dailyAvoidance.avoidColors.join(', ')}</p>
        </div>

        {/* 방위 */}
        <div className="bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Compass className="w-3.5 h-3.5 text-white/60" />
            <span className="text-white/60 text-xs font-medium">피할 방위</span>
          </div>
          <div className="flex justify-center">
            <MiniCompass avoidDirections={dailyAvoidance.avoidDirections} />
          </div>
        </div>

        {/* 숫자 */}
        <div className="bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Hash className="w-3.5 h-3.5 text-white/60" />
            <span className="text-white/60 text-xs font-medium">피할 숫자</span>
          </div>
          <div className="flex gap-1.5">
            {dailyAvoidance.avoidNumbers.map((n, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${config.border} ${config.text}`}
              >
                {n}
              </div>
            ))}
          </div>
        </div>

        {/* 관계 */}
        <div className="bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-white/60" />
            <span className="text-white/60 text-xs font-medium">주의 관계</span>
          </div>
          <div className="space-y-1">
            {dailyAvoidance.avoidRelationships.map((r, i) => (
              <p key={i} className="text-white/70 text-[11px] leading-tight">
                {r}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* 오늘의 조언 */}
      <div className={`rounded-xl p-3 ${config.bg} border ${config.border}`}>
        <div className="flex items-start gap-2">
          {dailyAvoidance.severity === 'safe' ? (
            <CheckCircle className="w-4 h-4 mt-0.5 text-primary-dim shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5 text-primary-dark shrink-0" />
          )}
          <div className="space-y-1">
            {dailyAvoidance.dailyAdvice.map((advice, i) => (
              <p key={i} className="text-white/80 text-xs leading-relaxed">
                {advice}
              </p>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
