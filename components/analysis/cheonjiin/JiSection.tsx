'use client'

import { motion } from 'framer-motion'
import { Compass } from 'lucide-react'

interface JiSectionProps {
  data: any
}

export function JiSection({ data }: JiSectionProps) {
  if (!data) return null

  const { title, content, daewoon_phase, lucky_direction } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="max-w-2xl mx-auto px-3 py-8"
    >
      <div className="bg-card border border-[#D4AF37]/20 rounded-lg p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
            <Compass className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-light text-[#D4AF37]">지(地)</h2>
            <p className="text-sm text-muted-foreground">{title || '현실과 환경'}</p>
          </div>
        </div>

        {/* 본문 */}
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-ink-light/80 leading-relaxed whitespace-pre-line">{content}</p>
        </div>

        {/* 대운 & 방향 카드 */}
        <div className="grid grid-cols-2 gap-4">
          {daewoon_phase && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <div className="text-xs text-muted-foreground">현재 대운</div>
              <div className="text-sm font-medium">{daewoon_phase}</div>
            </div>
          )}
          {lucky_direction && (
            <div className="bg-[#D4AF37]/10 rounded-lg p-4 space-y-1">
              <div className="text-xs text-muted-foreground">행운의 방향</div>
              <div className="text-sm font-medium text-[#D4AF37]">{lucky_direction}</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
