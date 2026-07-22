'use client'

import { User, Hand, Compass, Loader2 } from 'lucide-react'
import { AmbientVideo } from '@/components/shared/AmbientVideo'

export type AnimationType = 'faceScanning' | 'palmReading' | 'qiFlow' | 'default'

interface AnalyzingAnimationProps {
  type: AnimationType
  message?: string
}

const TYPE_CONFIG: Record<AnimationType, { icon: typeof User; defaultMessage: string }> = {
  faceScanning: { icon: User, defaultMessage: '관상 특징을 분석하고 있습니다...' },
  palmReading: { icon: Hand, defaultMessage: '손금을 판독하고 있습니다...' },
  qiFlow: { icon: Compass, defaultMessage: '공간의 기 흐름을 분석하고 있습니다...' },
  default: { icon: Loader2, defaultMessage: '분석 중입니다...' },
}

export function AnalyzingAnimation({ type, message }: AnalyzingAnimationProps) {
  const config = TYPE_CONFIG[type]
  const Icon = config.icon

  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center py-16 px-6 gap-6">
      {/* 앰비언트 배경 영상 — 관상·손금·풍수 로딩 공용(1곳 수정=3화면). 없으면 폴백(렌더 안 함), reduced-motion 존중 */}
      <AmbientVideo
        id="analysis-ambient"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.18, mixBlendMode: 'screen' }}
      />
      <div className="relative z-10 w-16 h-16 flex items-center justify-center">
        {/* Subtle rotating ring */}
        <div
          className="absolute inset-0 border border-gold-500/30 rounded-full animate-spin"
          style={{ animationDuration: '3s' }}
        />
        <Icon className="w-8 h-8 text-gold-500" />
      </div>

      <p className="relative z-10 text-center text-white/70 text-base font-sans">{message || config.defaultMessage}</p>

      {/* Three subtle dots */}
      <div className="relative z-10 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-gold-500/60 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
