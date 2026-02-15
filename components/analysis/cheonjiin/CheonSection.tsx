'use client'

import { motion } from 'framer-motion'
import { BookOpen, Star, Crown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CheonSectionProps {
  data: any
}

export function CheonSection({ data }: CheonSectionProps) {
  if (!data) return null;

  const { title, content, strengths, weaknesses } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="max-w-4xl mx-auto mb-6 px-1"
    >
      <Card className="relative overflow-hidden card-glass-manse p-6 md:p-8 border-primary/20 bg-[#0A0A0A]">
        {/* Background Decor - Heavenly/Cloud Theme */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-900/10 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 space-y-6">
          {/* Section Header */}
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a1c2e] to-[#0A0A0A] border border-blue-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <span className="text-2xl font-serif text-blue-200">天</span>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-serif font-medium text-ink-light flex items-center gap-2">
                천(天) <span className="text-sm font-sans text-ink-light/40 font-light">• 사주명리</span>
              </h2>
              <p className="text-xs text-blue-200/60 font-light tracking-wide">
                하늘이 정한 타고난 운명의 설계도
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif text-ink-light">{title || '타고난 기운의 흐름'}</h3>
            <p className="text-sm md:text-base text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">
              {content}
            </p>
          </div>

          {/* Strengths & Weaknesses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Strengths */}
            {strengths && strengths.length > 0 && (
              <div className="bg-blue-950/20 rounded-xl p-4 border border-blue-500/10 space-y-3">
                <div className="flex items-center gap-2 text-blue-300">
                  <Crown className="w-4 h-4" />
                  <span className="text-sm font-serif font-medium">타고난 강점</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {strengths.map((s: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 border-blue-500/20 font-light">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Weaknesses */}
            {weaknesses && weaknesses.length > 0 && (
              <div className="bg-red-950/10 rounded-xl p-4 border border-red-500/10 space-y-3">
                <div className="flex items-center gap-2 text-red-300/80">
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-serif font-medium">보완할 점</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {weaknesses.map((w: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-ink-light/60 border-white/10 font-light">
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
