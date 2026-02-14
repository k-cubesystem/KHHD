'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { LuckyRoulette } from './lucky-roulette'
import { cn } from '@/lib/utils'

interface LuckyRouletteButtonProps {
  canSpin: boolean
  nextAvailableTime?: string
}

export function LuckyRouletteButton({ canSpin, nextAvailableTime }: LuckyRouletteButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      {/* Grid Item Trigger */}
      <button
        onClick={() => setShowModal(true)}
        className="relative flex flex-col items-center justify-center aspect-square bg-surface/30 border border-white/5 rounded-xl hover:border-primary/10 transition-all p-4 group"
      >
        {canSpin && (
          <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
        )}
        <Sparkles className="w-7 h-7 text-primary mb-2 group-hover:scale-110 transition-transform" strokeWidth={1} />
        <span className="text-sm font-serif font-normal text-ink-light mb-1">행운의 룰렛</span>
        <span className="text-[10px] text-ink-light/50 text-center font-light">
          매일 1회 무료
        </span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-surface border border-primary/20 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-ink-900/50 hover:bg-ink-900/70 flex items-center justify-center transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-ink-light/70" strokeWidth={1} />
              </button>

              {/* Roulette Component */}
              <div className="p-4">
                <LuckyRoulette canSpin={canSpin} nextAvailableTime={nextAvailableTime} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
