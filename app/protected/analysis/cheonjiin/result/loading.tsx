'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SAJU_LOADING_MESSAGES } from '@/lib/constants/saju-messages'
import { GOLD_500 } from '@/lib/config/design-tokens'

export default function CheonjiinResultLoading() {
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random() * SAJU_LOADING_MESSAGES.length))
  const [msgVisible, setMsgVisible] = useState(true)

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

  const msg = SAJU_LOADING_MESSAGES[msgIndex]

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
            <span style={{ fontFamily: 'serif', fontSize: '1.75rem', color: GOLD_500 }}>天</span>
          </motion.div>
        </div>
      </div>

      {/* 감성 문구 */}
      <div className="min-h-[76px] flex flex-col items-center justify-center text-center mb-8 px-4 max-w-sm">
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

      {/* 펄스 인디케이터 (게이지 대신) */}
      <div className="flex items-center gap-1.5 mb-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'rgba(212,175,55,0.6)' }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* 안내 문구 */}
      <p
        className="text-center tracking-wide leading-relaxed break-keep"
        style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 300, maxWidth: '260px' }}
      >
        청담해화당 사주풀이가 완료되면
        <br />
        결과페이지로 자동 이동합니다
      </p>
    </div>
  )
}
