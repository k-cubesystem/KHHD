'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { DURATION, EASING } from '@/lib/config/motion-tokens'

/**
 * 스크롤 중 상시 노출되는 하단 CTA 바.
 * 앱 셸(max-w-480px) 안에 정렬되도록 fixed + left-1/2 정렬을 바깥 래퍼가 담당하고,
 * 내부 motion 엘리먼트가 transform 애니메이션을 담당한다(transform 충돌 방지).
 */
export function StorySticky() {
  const shouldReduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0

    const evaluate = () => {
      frame = 0
      setVisible(window.scrollY > window.innerHeight * 0.7)
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(evaluate)
    }

    evaluate()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-sticky pointer-events-none">
      <AnimatePresence>
        {visible ? (
          <motion.div
            initial={shouldReduceMotion ? false : { y: 72, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: 72, opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : DURATION.medium, ease: EASING.move }}
            className="pointer-events-auto px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 bg-background/[0.92] backdrop-blur-md border-t border-gold-500/25"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-serif text-[13px] font-bold text-ink-light leading-tight break-keep">
                  오늘의 운세는 무료입니다
                </span>
                <span className="font-sans text-[11px] text-ink-light/75 leading-tight mt-0.5">
                  생년월일시만 있으면 바로 시작
                </span>
              </div>

              <Link
                href="/auth/sign-up"
                className="group shrink-0 px-4 py-3 rounded-lg bg-seal hover:bg-[#B33636] shadow-dojang flex items-center gap-1.5 transition-colors duration-medium"
              >
                <span className="font-serif text-[13px] font-bold text-ink-light whitespace-nowrap">무료 시작</span>
                <ArrowRight
                  className="w-3.5 h-3.5 text-ink-light transition-transform duration-medium group-hover:translate-x-0.5"
                  strokeWidth={2}
                  aria-hidden
                />
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
