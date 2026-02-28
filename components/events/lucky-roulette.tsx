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
  { label: '1만냥', color: '#f59e0b' },
  { label: '3만냥', color: '#10b981' },
  { label: '5만냥', color: '#3b82f6' },
  { label: '10만냥', color: '#8b5cf6' },
  { label: '꽝', color: '#ef4444' },
]

// 코인 파티클 컴포넌트
function CoinParticles({ count = 20 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.5
        const duration = 1.5 + Math.random() * 1
        const size = 12 + Math.random() * 14
        const rotation = Math.random() * 360
        return (
          <motion.div
            key={i}
            initial={{ y: '50%', x: `${left}%`, opacity: 1, scale: 0, rotate: 0 }}
            animate={{
              y: ['-10%', '110%'],
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 0.5],
              rotate: [0, rotation, rotation * 2],
            }}
            transition={{ duration, delay, ease: 'easeOut' }}
            className="absolute text-gold-400"
            style={{ left: `${left}%`, fontSize: size }}
          >
            💰
          </motion.div>
        )
      })}
    </div>
  )
}

// 꽝 이펙트
function MissEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.5],
            y: [0, -30 - Math.random() * 40],
            x: [0, (Math.random() - 0.5) * 80],
          }}
          transition={{ duration: 1.2, delay: i * 0.1 }}
          className="absolute top-1/2 left-1/2 text-2xl"
        >
          💨
        </motion.div>
      ))}
    </div>
  )
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

    // 서버에서 결과 먼저 가져오기
    const spinResult = await spinRoulette()

    // 룰렛 회전 애니메이션
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
          // 당첨! 코인 파티클 + 잔액 갱신
          setShowParticles(true)
          setEarnedBalance(spinResult.currentBalance || null)

          // 지갑 캐시 즉시 갱신
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

  // 세그먼트 각도 계산
  const segmentAngle = 360 / segments.length
  const conicParts = segments.map((s, i) => `${s.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`).join(', ')

  return (
    <Card className="bg-surface/30 border-primary/20 overflow-hidden relative">
      <CardContent className="p-4">
        {/* 코인 파티클 */}
        <AnimatePresence>
          {showParticles && <CoinParticles count={24} />}
          {showMiss && <MissEffect />}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.div
              animate={canSpin ? { rotate: [0, 15, -15, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </motion.div>
            <h3 className="text-sm font-bold text-ink-light">행운의 룰렛</h3>
          </div>
          <motion.div
            animate={canSpin ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="px-2 py-1 bg-seal-500/20 border border-seal-500/30 rounded-full"
          >
            <span className="text-xs font-bold text-seal-400">1일 1회 무료</span>
          </motion.div>
        </div>

        {/* Roulette Visual */}
        <div className="relative mb-4">
          {/* 외곽 발광 링 */}
          <motion.div
            animate={
              isSpinning
                ? {
                    boxShadow: [
                      '0 0 20px rgba(212,175,55,0.3)',
                      '0 0 40px rgba(212,175,55,0.6)',
                      '0 0 20px rgba(212,175,55,0.3)',
                    ],
                  }
                : {}
            }
            transition={{ duration: 0.5, repeat: Infinity }}
            className="rounded-full"
          >
            <motion.div
              animate={{ rotate: rotation }}
              transition={isSpinning ? { duration: 2.5, ease: [0.15, 0.85, 0.35, 1] } : { duration: 0 }}
              className="w-full aspect-square rounded-full border-4 border-primary relative flex items-center justify-center shadow-lg"
              style={{
                background: `conic-gradient(from 0deg, ${conicParts})`,
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
                <motion.div
                  animate={
                    isSpinning
                      ? {
                          scale: [1, 0.9, 1],
                          boxShadow: [
                            '0 0 10px rgba(212,175,55,0.3)',
                            '0 0 25px rgba(212,175,55,0.6)',
                            '0 0 10px rgba(212,175,55,0.3)',
                          ],
                        }
                      : {}
                  }
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="w-16 h-16 bg-background rounded-full border-4 border-primary flex items-center justify-center z-10 shadow-xl"
                >
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
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Pointer (고정) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
            <motion.div animate={isSpinning ? { y: [0, -3, 0] } : {}} transition={{ duration: 0.15, repeat: Infinity }}>
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-gold-400 drop-shadow-lg" />
            </motion.div>
          </div>

          {/* Result Overlay */}
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
                    <motion.div animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.6 }}>
                      <span className="text-4xl block mb-2">😅</span>
                      <p className="text-sm font-bold text-muted-foreground">아쉽게도 꽝!</p>
                      <p className="text-[10px] text-ink-light/50 mt-1">내일 다시 도전하세요</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.3, 1] }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                      <motion.div
                        animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Gift className="w-12 h-12 text-gold-400 mx-auto mb-2" />
                      </motion.div>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-lg font-black text-gold-400"
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
            className={cn(
              'w-full h-11 font-bold transition-all text-sm',
              canSpin && !isSpinning
                ? 'bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 text-white shadow-lg shadow-gold-500/20'
                : 'bg-surface border border-primary/30 text-ink-light/50 cursor-not-allowed'
            )}
          >
            {isSpinning ? (
              <span className="flex items-center gap-2">
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}>
                  <Sparkles className="w-4 h-4" />
                </motion.span>
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
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] text-ink-light/50 text-center mt-2"
          >
            다음 도전:{' '}
            {new Date(nextAvailableTime).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </motion.p>
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
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-center"
              >
                <p className={cn('text-[10px] font-bold', item.color)}>{item.label}</p>
                <p className="text-[8px] text-ink-light/40">{item.prob}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
