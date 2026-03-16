'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, Gift, Coins } from 'lucide-react'
import { spinRoulette } from '@/app/actions/payment/roulette'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { WALLET_BALANCE_KEY } from '@/hooks/use-wallet'

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
  { label: '1만냥', color: '#C8B273' },
  { label: '3만냥', color: '#E2D5B5' },
  { label: '5만냥', color: '#A89660' },
  { label: '10만냥', color: '#F4E4BA' },
  { label: '꽝', color: '#3D3A33' },
]

// 파티클 랜덤값 — 모듈 레벨 상수 (렌더마다 재계산 방지)
const COIN_PARTICLES = Array.from({ length: 24 }, () => ({
  left: Math.random() * 100,
  delay: Math.random() * 0.5,
  duration: 1.5 + Math.random() * 1,
  size: 12 + Math.random() * 14,
  rotation: Math.random() * 360,
}))

// Subtle coin particle effect — one-shot이므로 framer-motion AnimatePresence 유지
function CoinParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {COIN_PARTICLES.slice(0, 5).map((p, i) => (
        <motion.div
          key={i}
          initial={{ y: '50%', opacity: 0, scale: 0 }}
          animate={{
            y: ['-10%', '110%'],
            opacity: [0, 0.7, 0],
            scale: [0, 1, 0.5],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
          className="absolute w-2 h-2 rounded-full bg-gold-500"
          style={{ left: `${p.left}%` }}
        />
      ))}
    </div>
  )
}

// Miss effect - simple fade
function MissEffect() {
  return null
}

export function LuckyRoulette({
  canSpin: initialCanSpin,
  nextAvailableTime,
  segments = DEFAULT_SEGMENTS,
}: LuckyRouletteProps) {
  const [canSpin, setCanSpin] = useState(initialCanSpin)
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<{ isMiss: boolean; label: string; value: number } | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [showMiss, setShowMiss] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [earnedBalance, setEarnedBalance] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const handleSpin = useCallback(async () => {
    if (!canSpin || isSpinning) return
    setIsSpinning(true)
    setShowResult(false)
    setShowParticles(false)
    setShowMiss(false)
    setResult(null)
    setEarnedBalance(null)

    const spinResult = await spinRoulette()

    const spins = 5 + Math.random() * 3
    const targetRotation = rotation + spins * 360
    setRotation(targetRotation)

    setTimeout(() => {
      setIsSpinning(false)

      if (spinResult.success && spinResult.reward) {
        setResult(spinResult.reward)
        setShowResult(true)
        setCanSpin(false)

        if (spinResult.reward.isMiss) {
          setShowMiss(true)
          toast.error('아쉽게도 꽝! 내일 다시 도전하세요.', { duration: 3000 })
        } else {
          setShowParticles(true)
          setEarnedBalance(spinResult.currentBalance || null)

          if (spinResult.currentBalance !== undefined) {
            queryClient.setQueryData(WALLET_BALANCE_KEY, spinResult.currentBalance)
          }
          queryClient.invalidateQueries({ queryKey: WALLET_BALANCE_KEY })

          toast.success(`축하합니다! 복채 ${spinResult.reward.value}만냥 당첨!`, { duration: 5000 })

          setTimeout(() => setShowParticles(false), 3000)
        }
      } else {
        toast.error(spinResult.error || '룰렛 회전에 실패했습니다.')
      }
    }, 2500)
  }, [canSpin, isSpinning, rotation, queryClient])

  const segmentAngle = 360 / segments.length
  const conicParts = segments.map((s, i) => `${s.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`).join(', ')

  return (
    <Card className="bg-surface/30 border-primary/20 overflow-hidden relative">
      <CardContent className="p-4">
        {/* 코인 파티클 — one-shot AnimatePresence */}
        <AnimatePresence>
          {showParticles && <CoinParticles />}
          {showMiss && <MissEffect />}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Sparkles wiggle — CSS infinite when canSpin */}
            <div
              className="anim-wiggle"
              style={canSpin ? { animation: 'wiggle 2s ease-in-out 1s infinite' } : undefined}
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-ink-light">행운의 룰렛</h3>
          </div>
          {/* Badge scale pulse — CSS infinite when canSpin */}
          <div
            className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-full anim-scale-pulse"
            style={canSpin ? { animation: 'scale-pulse 1.5s ease-in-out infinite' } : undefined}
          >
            <span className="text-xs font-bold text-primary-dark">1일 1회 무료</span>
          </div>
        </div>

        {/* Roulette Visual */}
        <div className="relative mb-4">
          {/* 외곽 발광 링 — isSpinning 시 CSS glow */}
          <div
            className="rounded-full"
            style={isSpinning ? { animation: 'fortune-glow 0.5s ease-in-out infinite' } : undefined}
          >
            {/* 룰렛 회전은 state-driven → CSS transition */}
            <div
              className="w-full aspect-square rounded-full border-2 border-primary/40 relative flex items-center justify-center shadow-lg"
              style={{
                background: `conic-gradient(from 0deg, ${conicParts})`,
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 2.5s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none',
              }}
            >
              {/* Segment Labels */}
              {segments.map((seg, i) => {
                const angle = (i + 0.5) * segmentAngle - 90
                const rad = (angle * Math.PI) / 180
                const r = 38
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

              {/* 세그먼트 구분선 */}
              {segments.map((_, i) => {
                const angle = i * segmentAngle
                return (
                  <div
                    key={`line-${i}`}
                    className="absolute w-[1px] h-1/2 bg-white/30 origin-bottom pointer-events-none"
                    style={{
                      left: '50%',
                      top: '0',
                      transform: `translateX(-50%) rotate(${angle}deg)`,
                      transformOrigin: '50% 100%',
                    }}
                  />
                )
              })}

              {/* Center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-16 h-16 bg-background rounded-full border-2 border-primary/40 flex items-center justify-center z-10 shadow-xl"
                  style={isSpinning ? {
                    animation: 'scale-pulse 0.6s ease-in-out infinite',
                    boxShadow: '0 0 25px rgba(212,175,55,0.6)',
                  } : undefined}
                >
                  {isSpinning ? (
                    <span
                      className="inline-flex anim-spin-loading"
                      style={{ animation: 'spin-loading 0.3s linear infinite' }}
                    >
                      <Sparkles className="w-6 h-6 text-primary" />
                    </span>
                  ) : (
                    <Coins className="w-6 h-6 text-gold-400" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pointer (고정) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
            <div style={isSpinning ? { animation: 'bounce-y 0.15s ease-in-out infinite' } : undefined}>
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-primary drop-shadow-lg" />
            </div>
          </div>

          {/* Result Overlay — one-shot AnimatePresence */}
          <AnimatePresence>
            {showResult && result && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-full z-20"
              >
                <div className="text-center">
                  {result.isMiss ? (
                    <div>
                      <p className="text-sm font-bold text-muted-foreground">아쉽게도 꽝!</p>
                      <p className="text-[10px] text-ink-light/50 mt-1">내일 다시 도전하세요</p>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.3, 1] }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                      {/* Gift bounce — CSS infinite */}
                      <div
                        className="anim-gift-bounce"
                        style={{ animation: 'gift-bounce 1.5s ease-in-out infinite' }}
                      >
                        <Gift className="w-12 h-12 text-primary mx-auto mb-2" />
                      </div>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-lg font-black text-primary"
                      >
                        {result.label} 당첨!
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-xs text-primary mt-1"
                      >
                        복채 지급 완료!
                      </motion.p>
                      {earnedBalance !== null && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.7 }}
                          className="text-[10px] text-ink-light/60 mt-1"
                        >
                          현재 잔액: {earnedBalance}만냥
                        </motion.p>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Spin Button */}
        <motion.div whileTap={canSpin && !isSpinning ? { scale: 0.95 } : {}}>
          <Button
            onClick={handleSpin}
            disabled={!canSpin || isSpinning}
            aria-label={isSpinning ? '행운을 불러오는 중' : canSpin ? '룰렛 돌리기' : '내일 다시 도전'}
            className={cn(
              'w-full h-11 font-bold transition-all text-sm',
              canSpin && !isSpinning
                ? 'bg-gradient-to-r from-primary/80 to-primary-dark hover:from-primary hover:to-gold-600 text-background shadow-md shadow-primary/10'
                : 'bg-surface border border-primary/15 text-ink-light/40 cursor-not-allowed'
            )}
          >
            {isSpinning ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-flex anim-spin-loading"
                  style={{ animation: 'spin-loading 0.6s linear infinite' }}
                >
                  <Sparkles className="w-4 h-4" />
                </span>
                행운을 불러오는 중...
              </span>
            ) : canSpin ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                룰렛 돌리기
              </span>
            ) : (
              '내일 다시 도전'
            )}
          </Button>
        </motion.div>

        {/* Next Available Time */}
        {!canSpin && nextAvailableTime && !isSpinning && (
          <p
            className="text-[10px] text-ink-light/50 text-center mt-2 anim-fade-in-up"
            style={{ animation: 'fade-in-up 0.4s ease-out both' }}
          >
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
              { label: '1만냥', color: 'text-primary-dark', prob: '40%' },
              { label: '3만냥', color: 'text-primary', prob: '30%' },
              { label: '5만냥', color: 'text-gold-600', prob: '15%' },
              { label: '10만냥', color: 'text-primary-light', prob: '10%' },
              { label: '꽝', color: 'text-ink-light/40', prob: '5%' },
            ].map((item, i) => (
              <div
                key={item.label}
                className="text-center anim-fade-in-up"
                style={{
                  '--fade-y': '5px',
                  animation: `fade-in-up 0.3s ease-out ${i * 0.05}s both`,
                } as React.CSSProperties}
              >
                <p className={cn('text-[10px] font-bold', item.color)}>{item.label}</p>
                <p className="text-[8px] text-ink-light/40">{item.prob}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
