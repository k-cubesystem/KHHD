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
      {/* Floating Button */}
      <motion.button
        onClick={() => setShowModal(true)}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
        className={cn(
          'fixed bottom-24 right-6 z-40',
          'w-14 h-14 rounded-full',
          'bg-gradient-to-br from-primary/90 to-primary/70',
          'shadow-lg hover:shadow-xl',
          'flex items-center justify-center',
          'transition-all duration-300 hover:scale-110',
          'border border-primary/30'
        )}
      >
        <Sparkles className="w-6 h-6 text-ink-900" strokeWidth={1.5} />
        {canSpin && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </motion.button>

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
