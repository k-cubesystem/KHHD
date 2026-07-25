'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { DURATION, EASING } from '@/lib/config/motion-tokens'

interface StoryRevealProps {
  children: ReactNode
  /** 스태거 순번 — index * 0.08s 만큼 지연 */
  index?: number
  className?: string
  /** 진입 방향 오프셋(px). 0이면 페이드만. */
  offset?: number
}

/**
 * 스크롤 진입 페이드업 래퍼.
 * prefers-reduced-motion: reduce 이면 변형 없이 즉시 표시한다.
 */
export function StoryReveal({ children, index = 0, className, offset = 18 }: StoryRevealProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: offset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25, margin: '0px 0px -40px 0px' }}
      transition={{ duration: DURATION.long, ease: EASING.enter, delay: index * 0.08 }}
    >
      {children}
    </motion.div>
  )
}
