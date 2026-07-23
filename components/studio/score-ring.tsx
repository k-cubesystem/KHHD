'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { GOLD_300, GOLD_500 } from '@/lib/config/design-tokens'

interface ScoreRingProps {
  /** 0~100 종합 점수 */
  score: number
  /** 지름(px) */
  size?: number
  /** 링 두께(px) */
  stroke?: number
  /** 링 아래 작은 라벨 (예: '종합 점수') */
  label?: string
}

/**
 * 종합 점수 링 게이지 — SVG stroke-dashoffset 방식(캔버스 금지: 과거 고DPR 캔버스 사고 이력).
 * 캡처 컨테이너 안에서 공유 이미지에 포함된다.
 */
export function ScoreRing({ score, size = 132, stroke = 9, label }: ScoreRingProps) {
  const reduce = useReducedMotion()
  const safe = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - safe / 100)
  const gradientId = `score-ring-grad-${size}`

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={GOLD_300} />
            <stop offset="100%" stopColor={GOLD_500} />
          </linearGradient>
        </defs>
        {/* 트랙 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(232,228,220,0.10)"
          strokeWidth={stroke}
        />
        {/* 진행 아크 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 1.2, ease: 'easeOut', delay: reduce ? 0 : 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-serif font-bold leading-none"
          style={{
            fontSize: size * 0.3,
            background: `linear-gradient(180deg, ${GOLD_300} 0%, ${GOLD_500} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {Math.round(safe)}
        </span>
        <span className="text-[10px] text-gold-500/50 font-sans mt-0.5">{label ?? '점'}</span>
      </div>
    </div>
  )
}
