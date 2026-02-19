'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Quote } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const REVIEWS = [
  {
    id: 1,
    text: '아이 사주를 알고 나니 성향을 이해하게 되어서 다투는 일이 줄었어요.',
    author: '김**님 (자녀)',
    tag: '자녀운',
  },
  {
    id: 2,
    text: '남편과 맞지 않는 이유를 알게 되어 서로 배려하게 되었습니다.',
    author: '이**님 (배우자)',
    tag: '부부운',
  },
  {
    id: 3,
    text: '가족 모두의 건강운을 미리 챙길 수 있어서 마음이 든든해요.',
    author: '박**님 (부모님)',
    tag: '건강운',
  },
  {
    id: 4,
    text: '이사 방향 조언 덕분에 좋은 집으로 이사했습니다. 감사합니다.',
    author: '최**님 (가족)',
    tag: '이사운',
  },
  { id: 5, text: '중요한 시험 날짜를 길일로 잡았는데 합격했어요!', author: '정**님 (자녀)', tag: '합격운' },
]

export function FamilyReviewSlide() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % REVIEWS.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full relative py-8">
      <div className="flex items-center justify-center gap-2 mb-8 opacity-80">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#D4AF37]/50" />
        <span className="text-xs font-serif text-[#D4AF37] tracking-widest uppercase">Real Stories</span>
        <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#D4AF37]/50" />
      </div>

      <div className="relative h-[220px] w-full max-w-sm mx-auto overflow-hidden">
        {/* Gradient Masks for fade effect - Further reduced height to prevent text clipping */}
        <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-background via-background/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-background via-background/80 to-transparent z-20 pointer-events-none" />

        <div className="absolute inset-0 flex items-center justify-center">
          {REVIEWS.map((review, i) => {
            let offset = i - currentIndex
            const len = REVIEWS.length

            // Circular buffer logic
            if (offset > len / 2) offset -= len
            else if (offset < -len / 2) offset += len

            const isVisible = Math.abs(offset) <= 2
            if (!isVisible) return null

            const isActive = offset === 0

            return (
              <motion.div
                key={review.id}
                className="absolute w-full px-4"
                initial={false}
                animate={{
                  y: offset * 110, // Increased spacing
                  scale: isActive ? 1 : 0.85,
                  opacity: isActive ? 1 : Math.abs(offset) === 1 ? 0.3 : 0,
                  zIndex: isActive ? 10 : 0,
                  filter: isActive ? 'blur(0px)' : 'blur(4px)',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 80,
                  damping: 18,
                  mass: 1.2,
                }}
              >
                <div
                  className={cn(
                    'relative p-6 rounded-2xl transition-all duration-500 flex flex-col items-center text-center gap-3',
                    isActive
                      ? 'bg-gradient-to-br from-[#1a1510] to-[#0f0d0a] border border-[#D4AF37]/20 shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
                      : 'bg-transparent border border-transparent'
                  )}
                >
                  {isActive && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a1510] px-2">
                      <Quote className="w-6 h-6 text-[#D4AF37]/40 fill-[#D4AF37]/10" />
                    </div>
                  )}

                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full border mb-1',
                      isActive ? 'text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/5' : 'text-white/20 border-white/10'
                    )}
                  >
                    {review.tag}
                  </span>

                  <p
                    className={cn(
                      'font-serif leading-relaxed keep-all',
                      isActive ? 'text-[15px] text-[#EAEAEA]' : 'text-sm text-white/30'
                    )}
                  >
                    &ldquo;{review.text}&rdquo;
                  </p>

                  <div className={cn('flex items-center gap-2 mt-1', isActive ? 'opacity-100' : 'opacity-0')}>
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center text-[8px] text-white/50">
                      {review.author.charAt(0)}
                    </div>
                    <p className="text-xs text-[#8c8c8c]">{review.author}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
