'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, Gift, Coins } from 'lucide-react'
import { spinRoulette } from '@/app/actions/roulette-actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RouletteSegment {
  label: string
  color: string
  probability?: number
}

interface LuckyRouletteProps {
  canSpin: boolean
  nextAvailableTime?: string
  segments?: RouletteSegment[]
}

const DEFAULT_SEGMENTS: RouletteSegment[] = [
  { label: '1만냥', color: '#f59e0b' },
  { label: '3만냥', color: '#10b981' },
  { label: '5만냥', color: '#3b82f6' },
  { label: '10만냥', color: '#8b5cf6' },
  { label: '꽝',    color: '#ef4444' },
]

export function LuckyRoulette({ canSpin: initialCanSpin, nextAvailableTime, segments = DEFAULT_SEGMENTS }: LuckyRouletteProps) {
  const [canSpin, setCanSpin] = useState(initialCanSpin)
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showResult, setShowResult] = useState(false)
  const [rotation, setRotation] = useState(0)

  const handleSpin = async () => {
    setIsSpinning(true)
    setShowResult(false)
    setResult(null)

    // 먼저 서버에서 결과 가져오기
    const spinResult = await spinRoulette()

    // 룰렛 회전 애니메이션 (2초)
    const spins = 5 + Math.random() * 3 // 5~8바퀴
    const targetRotation = rotation + spins * 360
    setRotation(targetRotation)

    setTimeout(() => {
      setIsSpinning(false)

      if (spinResult.success && spinResult.reward) {
        setResult(spinResult.reward)
        setShowResult(true)
        setCanSpin(false)

        if (spinResult.reward.isMiss) {
          toast.error('아쉽게도 꽝! 내일 다시 도전하세요.', { duration: 3000 })
        } else {
          toast.success(`🎉 축하합니다! 복채 ${spinResult.reward.value}만냥 당첨!`, {
            duration: 5000,
          })
          // 잔액 새로고침
          setTimeout(() => window.location.reload(), 2000)
        }
      } else {
        toast.error(spinResult.error || '룰렛 회전에 실패했습니다.')
      }
    }, 2000)
  }

  // 세그먼트 각도 계산
  const segmentAngle = 360 / segments.length
  const conicParts = segments
    .map((s, i) => `${s.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`)
    .join(', ')

  return (
    <Card className="bg-surface/30 border-primary/20 overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-ink-light">행운의 룰렛</h3>
          </div>
          <div className="px-2 py-1 bg-seal-500/20 border border-seal-500/30 rounded-full">
            <span className="text-xs font-bold text-seal-400">1일 1회 무료</span>
          </div>
        </div>

        {/* Roulette Visual */}
        <div className="relative mb-4">
          <motion.div
            animate={{ rotate: rotation }}
            transition={isSpinning ? { duration: 2, ease: 'easeOut' } : { duration: 0 }}
            className="w-full aspect-square rounded-full border-4 border-primary relative flex items-center justify-center"
            style={{
              background: `conic-gradient(from 0deg, ${conicParts})`,
            }}
          >
            {/* Segment Labels */}
            {segments.map((seg, i) => {
              const angle = (i + 0.5) * segmentAngle - 90
              const rad = (angle * Math.PI) / 180
              const r = 38 // % from center
              const x = 50 + r * Math.cos(rad)
              const y = 50 + r * Math.sin(rad)
              return (
                <div
                  key={i}
                  className="absolute text-[9px] font-bold text-white drop-shadow-md pointer-events-none"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${(i + 0.5) * segmentAngle}deg)`,
                  }}
                >
                  {seg.label}
                </div>
              )
            })}

            {/* Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-background rounded-full border-4 border-primary flex items-center justify-center z-10">
                {isSpinning ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-6 h-6 text-primary" />
                  </motion.div>
                ) : (
                  <Coins className="w-6 h-6 text-gold-400" />
                )}
              </div>
            </div>

            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
              <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[14px] border-l-transparent border-r-transparent border-b-white drop-shadow-md" />
            </div>
          </motion.div>

          {/* Result Overlay */}
          <AnimatePresence>
            {showResult && result && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-full"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    {result.isMiss ? (
                      <span className="text-3xl">😅</span>
                    ) : (
                      <Coins className="w-10 h-10 text-gold-400 mx-auto mb-1" />
                    )}
                  </motion.div>
                  <p className={cn(
                    "text-base font-bold",
                    result.isMiss ? "text-muted-foreground" : "text-gold-400"
                  )}>
                    {result.label}
                  </p>
                  {!result.isMiss && (
                    <p className="text-xs text-primary">복채 지급 완료!</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Spin Button */}
        <Button
          onClick={handleSpin}
          disabled={!canSpin || isSpinning}
          className={cn(
            'w-full h-10 font-bold transition-all',
            canSpin && !isSpinning
              ? 'bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 text-white shadow-md'
              : 'bg-surface border border-primary/30 text-ink-light/50 cursor-not-allowed'
          )}
        >
          {isSpinning ? '회전 중...' : canSpin ? '룰렛 돌리기' : '내일 다시 도전'}
        </Button>

        {/* Next Available Time */}
        {!canSpin && nextAvailableTime && !isSpinning && (
          <p className="text-[10px] text-ink-light/50 text-center mt-2">
            다음 도전:{' '}
            {new Date(nextAvailableTime).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}

        {/* Prize Info */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="grid grid-cols-5 gap-1">
            {[
              { label: '1만냥', color: 'text-gold-400', prob: '40%' },
              { label: '3만냥', color: 'text-green-400', prob: '30%' },
              { label: '5만냥', color: 'text-blue-400', prob: '15%' },
              { label: '10만냥', color: 'text-purple-400', prob: '10%' },
              { label: '꽝', color: 'text-red-400', prob: '5%' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className={cn("text-[10px] font-bold", item.color)}>{item.label}</p>
                <p className="text-[8px] text-ink-light/40">{item.prob}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
