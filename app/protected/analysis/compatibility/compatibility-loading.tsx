'use client'

import { motion } from 'framer-motion'
import { Loader2, Heart } from 'lucide-react'
import { DestinyTarget } from '@/app/actions/destiny-targets'

interface CompatibilityLoadingProps {
  person1: DestinyTarget
  person2: DestinyTarget
}

export function CompatibilityLoading({ person1, person2 }: CompatibilityLoadingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center"
        >
          <Heart className="w-12 h-12 text-pink-500 fill-current" />
        </motion.div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">
            {person1.name}님과 {person2.name}님의
            <br />
            궁합을 분석하고 있습니다
          </h2>

          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>두 사람의 사주를 계산하고 있습니다...</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>오행 균형을 분석하고 있습니다...</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI가 궁합을 해석하고 있습니다...</span>
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
