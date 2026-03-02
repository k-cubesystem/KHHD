'use client'

/**
 * SajuLoadingOverlay
 *
 * 두 가지 모드:
 * 1. timed   — duration ms 동안 0→98%, 완료 후 자동으로 onComplete 호출 (해화당 사주풀이)
 * 2. api-wait — 0→98% 에서 정지, isApiComplete=true 되면 98→100% 후 onComplete 호출 (천지인종합)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SAJU_LOADING_MESSAGES } from '@/lib/constants/saju-messages'

interface SajuLoadingOverlayProps {
  targetName: string
  /** timed 모드: ms 단위 총 소요 시간 (기본 10000ms) */
  duration?: number
  /** api-wait 모드: true 가 되면 98→100% 이후 onComplete 호출 */
  isApiComplete?: boolean
  /** 로딩 완료 후 콜백 */
  onComplete: () => void
}

export function SajuLoadingOverlay({
  targetName,
  duration = 10000,
  isApiComplete = false,
  onComplete,
}: SajuLoadingOverlayProps) {
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random() * SAJU_LOADING_MESSAGES.length))
  const [msgVisible, setMsgVisible] = useState(true)
  const [progress, setProgress] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const progressBarRef = useRef<HTMLDivElement>(null)

  const handleComplete = useCallback(() => {
    if (finishing) return
    setFinishing(true)
    // 98→100% 빠르게 채우고 완료
    setProgress(100)
    setTimeout(() => onComplete(), 600)
  }, [finishing, onComplete])

  // 메시지 순환
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgVisible(false)
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % SAJU_LOADING_MESSAGES.length)
        setMsgVisible(true)
      }, 400)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  // 진행바: 0 → 98% (duration ms 동안) — ref로 DOM 직접 조작해 리렌더 방지
  useEffect(() => {
    const start = Date.now()
    const target = 98
    let rafId: number

    const frame = () => {
      const elapsed = Date.now() - start
      const p = Math.min((elapsed / duration) * target, target)
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p}%`
      }
      setProgress(p)
      if (p < target) {
        rafId = requestAnimationFrame(frame)
      }
      // 98%에서 멈춤 — isApiComplete가 true일 때 handleComplete 호출됨
    }

    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [duration])

  // api-wait 모드: isApiComplete가 true가 되고 progress≥98이면 완료
  useEffect(() => {
    if (isApiComplete && progress >= 97 && !finishing) {
      handleComplete()
    }
  }, [isApiComplete, progress, finishing, handleComplete])

  // timed 모드: isApiComplete가 항상 false일 때 — duration 경과 후 자동 완료
  useEffect(() => {
    if (isApiComplete) return // api-wait 모드면 스킵
    const timer = setTimeout(() => {
      handleComplete()
    }, duration + 200) // 진행바가 98%에 도달한 직후
    return () => clearTimeout(timer)
  }, [duration, isApiComplete, handleComplete])

  const msg = SAJU_LOADING_MESSAGES[msgIndex]
  const displayProgress = Math.round(progress)

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{
        zIndex: 'var(--z-modal)' as string,
        background: 'linear-gradient(160deg, #080604 0%, #0f0c08 50%, #080604 100%)',
      }}
    >
      {/* 파티클 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              left: `${6 + i * 6.5}%`,
              bottom: '-6px',
              background: 'rgba(212,175,55,0.4)',
            }}
            animate={{ y: [0, -(280 + i * 35)], opacity: [0, 0.7, 0] }}
            transition={{
              duration: 4.5 + i * 0.25,
              repeat: Infinity,
              delay: i * 0.35,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* 로딩 비주얼 */}
      <div className="relative mb-10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="w-32 h-32 rounded-full"
          style={{ border: '1px dashed rgba(212,175,55,0.2)' }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-3 rounded-full"
          style={{ border: '1px solid rgba(212,175,55,0.3)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.5)',
              boxShadow: '0 0 30px rgba(212,175,55,0.35)',
            }}
          >
            <span style={{ fontFamily: 'serif', fontSize: '1.75rem', color: '#D4AF37' }}>
              {finishing ? '合' : '天'}
            </span>
          </motion.div>
        </div>
      </div>

      {/* 대상 이름 */}
      <p
        className="tracking-[0.3em] uppercase mb-3"
        style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontWeight: 300 }}
      >
        {targetName} 님의 운명을 읽는 중
      </p>

      {/* 감성 문구 */}
      <div className="min-h-[76px] flex flex-col items-center justify-center text-center mb-10 px-4 max-w-sm">
        <AnimatePresence mode="wait">
          {msgVisible && (
            <motion.div
              key={msgIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-2"
            >
              <p
                className="font-serif leading-snug break-keep"
                style={{ fontSize: '1.1rem', color: 'rgba(212,175,55,0.9)' }}
              >
                {msg.headline}
              </p>
              <p
                className="font-light leading-relaxed break-keep"
                style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}
              >
                {msg.sub}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 진행바 */}
      <div
        className="rounded-full overflow-hidden"
        style={{ width: '200px', height: '2px', background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          ref={progressBarRef}
          className="h-full rounded-full"
          style={{
            width: `${displayProgress}%`,
            background: 'linear-gradient(90deg, rgba(212,175,55,0.5), #D4AF37, rgba(212,175,55,0.5))',
            transition: finishing ? 'width 0.5s ease' : 'none',
          }}
        />
      </div>
      <p
        className="mt-2.5 tracking-widest"
        style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', fontWeight: 300 }}
      >
        {finishing ? '분석 완료' : `${displayProgress}%`}
      </p>
    </div>
  )
}
