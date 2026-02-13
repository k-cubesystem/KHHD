'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { DestinyTarget } from '@/app/actions/destiny-targets'

interface CheonjiinLoadingStateProps {
  target: DestinyTarget
}

export function CheonjiinLoadingState({ target }: CheonjiinLoadingStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#F4E5C3]/20 flex items-center justify-center"
        >
          <div className="text-5xl">🔮</div>
        </motion.div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">{target.name}님의 운명을 분석하고 있습니다</h2>

          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>만세력을 계산하고 있습니다...</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI가 천지인을 분석하고 있습니다...</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>결과를 정리하고 있습니다...</span>
            </motion.div>
          </div>

          <p className="text-xs text-muted-foreground pt-4">
            정확한 분석을 위해 최대 30초 정도 소요됩니다
          </p>
        </div>
      </motion.div>
    </div>
  )
}
