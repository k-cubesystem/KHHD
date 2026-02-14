'use client'

import { Card } from '@/components/ui/card'
import { Flame, Sparkles, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export function Year2026Section() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAnalyze = () => {
    setLoading(true)
    router.push('/protected/analysis/new-year')
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="w-full"
    >
      <Card
        onClick={handleAnalyze}
        className="relative overflow-hidden bg-gradient-to-r from-[#1a0505] to-[#2b0a0a] border-red-900/30 hover:border-red-500/50 transition-all duration-500 p-0 min-h-[90px] flex items-center justify-between group cursor-pointer luxury-card-glow"
      >
        <div className="absolute inset-0 bg-noise-pattern opacity-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />

        {/* Left Info */}
        <div className="flex items-center gap-5 relative z-10 p-5">
          <div className="relative">
            <div className="absolute inset-0 bg-red-600 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-900/80 to-black flex items-center justify-center border border-red-500/30 group-hover:border-red-400/60 transition-colors shadow-inner">
              <Flame className="w-6 h-6 text-red-500 group-hover:text-red-400 transition-colors duration-300" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-3 h-3 text-yellow-400/80 animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-red-400 tracking-[0.2em] uppercase border border-red-800/50 px-2 py-0.5 rounded-sm bg-red-950/30">
                2026 SPECIAL
              </span>
            </div>
            <h3 className="text-lg font-serif font-medium text-red-50 group-hover:text-white transition-colors tracking-tight">
              병오년(丙午年) <span className="text-red-400 font-light">붉은 말의 해</span>
            </h3>
            <p className="text-xs text-red-200/50 font-sans group-hover:text-red-200/70 transition-colors">
              미리보는 당신의 2026년 운명 흐름
            </p>
          </div>
        </div>

        {/* Right Action */}
        <div className="relative z-10 pr-6 pl-4 flex items-center">
          <div className="w-10 h-10 rounded-full border border-red-500/20 flex items-center justify-center group-hover:bg-red-500/10 group-hover:border-red-500/40 transition-all duration-300">
            {loading ? (
              <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
            ) : (
              <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-red-200 group-hover:translate-x-0.5 transition-all" />
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
