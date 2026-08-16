'use client'

import { useEffect, useState } from 'react'
import { User, Hand, Compass, Loader2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AmbientVideo } from '@/components/shared/AmbientVideo'

export type AnimationType = 'faceScanning' | 'palmReading' | 'qiFlow' | 'default'

interface AnalyzingAnimationProps {
  type: AnimationType
  /** 단일 메시지(하위호환). steps가 없을 때 사용. */
  message?: string
  /** 단계 롤링 메시지. 제공 시 3~4초 간격으로 순환(reduced-motion이면 첫 단계 고정). */
  steps?: string[]
  /**
   * 예상 소요 시간(초). 주면 **경과 시간과 진행 막대**가 함께 뜨고, 단계 문구가 되돌지 않는다.
   *
   * 🔴 긴 대기에서 문구만 순환시키면 같은 말이 서너 번 반복되고, 사용자는 그걸 «멈춤»으로 읽는다
   *    (종합사주 실측 54초 = 5단계가 3바퀴). 오래 걸린다는 사실을 숨기지 말고 **얼마나 남았는지**를
   *    보여 주는 편이 이탈을 막는다.
   */
  expectedSeconds?: number
}

const TYPE_CONFIG: Record<AnimationType, { icon: typeof User; defaultMessage: string; defaultSteps: string[] }> = {
  faceScanning: {
    icon: User,
    defaultMessage: '관상 특징을 분석하고 있습니다...',
    defaultSteps: [
      '오관(五官)을 판독하고 있습니다...',
      '삼정(三停)의 균형을 측량하고 있습니다...',
      '기색(氣色)을 감별하고 있습니다...',
      '개운법을 정리하고 있습니다...',
    ],
  },
  palmReading: {
    icon: Hand,
    defaultMessage: '손금을 판독하고 있습니다...',
    defaultSteps: [
      '삼대 주선(主線)을 판독하고 있습니다...',
      '특수선(運命·太陽·結婚)을 탐색하고 있습니다...',
      '팔궁(八宮)을 측량하고 있습니다...',
      '시기(時期)를 산출하고 있습니다...',
    ],
  },
  qiFlow: {
    icon: Compass,
    defaultMessage: '공간의 기 흐름을 분석하고 있습니다...',
    defaultSteps: [
      '기(氣) 흐름을 살피고 있습니다...',
      '팔방위(八方位)를 측량하고 있습니다...',
      '지배 오행을 판별하고 있습니다...',
    ],
  },
  default: { icon: Loader2, defaultMessage: '분석 중입니다...', defaultSteps: [] },
}

const ROLL_INTERVAL_MS = 3200

export function AnalyzingAnimation({ type, message, steps, expectedSeconds }: AnalyzingAnimationProps) {
  const config = TYPE_CONFIG[type]
  const Icon = config.icon
  const reduce = useReducedMotion()

  // steps 우선순위: 명시 steps > (message 없을 때) 타입 기본 steps > 단일 message
  const rollSteps = steps && steps.length > 0 ? steps : !message ? config.defaultSteps : []
  const useRolling = rollSteps.length > 1 && !reduce

  const [index, setIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const longRun = typeof expectedSeconds === 'number' && expectedSeconds > 0

  useEffect(() => {
    if (!useRolling) return
    // 예상 시간을 아는 대기에서는 **마지막 단계에서 멈춘다** — 되돌면 진행이 없어 보인다.
    const timer = setInterval(
      () => setIndex((i) => (longRun ? Math.min(i + 1, rollSteps.length - 1) : (i + 1) % rollSteps.length)),
      ROLL_INTERVAL_MS
    )
    return () => clearInterval(timer)
  }, [useRolling, rollSteps.length, longRun])

  useEffect(() => {
    if (!longRun) return
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [longRun])

  const currentText =
    (rollSteps.length > 0 ? rollSteps[Math.min(index, rollSteps.length - 1)] : message) || config.defaultMessage

  // 예상보다 오래 걸려도 막대가 100%에 붙어 멈춘 것처럼 보이지 않게 95%에서 잡아 둔다.
  const progress = longRun ? Math.min(95, Math.round((elapsed / (expectedSeconds as number)) * 100)) : 0
  const overdue = longRun && elapsed > (expectedSeconds as number)

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

      <div className="relative z-10 h-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentText}
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -6 }}
            transition={{ duration: 0.4 }}
            className="text-center text-white/70 text-base font-sans"
          >
            {currentText}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* 긴 대기 — 🔴 오래 걸린다는 사실을 숨기지 않고 «얼마나 왔는지»를 보여 준다. */}
      {longRun && (
        <div className="relative z-10 w-full max-w-[260px] space-y-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gold-500/70 transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-[11px] font-light text-white/40">
            {overdue ? `${elapsed}초 지났습니다 · 조금만 더 기다려 주세요` : `${elapsed}초 / 약 ${expectedSeconds}초`}
          </p>
        </div>
      )}

      {/* 단계 진행 점 (롤링 시) 또는 기본 3점 펄스 */}
      <div className="relative z-10 flex gap-1.5">
        {useRolling
          ? rollSteps.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  i === index ? 'bg-gold-500/90' : 'bg-gold-500/25'
                }`}
              />
            ))
          : [0, 1, 2].map((i) => (
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
