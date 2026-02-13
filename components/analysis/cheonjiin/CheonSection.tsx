'use client'

import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CheonSectionProps {
  data: any
}

export function CheonSection({ data }: CheonSectionProps) {
  if (!data) return null

  const { title, content, strengths, weaknesses } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-3 py-8"
    >
      <div className="bg-card border border-[#D4AF37]/20 rounded-lg p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-light text-[#D4AF37]">천(天)</h2>
            <p className="text-sm text-muted-foreground">{title || '타고난 운명'}</p>
          </div>
        </div>

        {/* 본문 */}
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-ink-light/80 leading-relaxed whitespace-pre-line">{content}</p>
        </div>

        {/* 강점 */}
        {strengths && strengths.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#D4AF37]">✨ 강점</h3>
            <div className="flex flex-wrap gap-2">
              {strengths.map((strength: string, idx: number) => (
                <Badge key={idx} variant="outline" className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 약점 */}
        {weaknesses && weaknesses.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">⚠️ 주의할 점</h3>
            <div className="flex flex-wrap gap-2">
              {weaknesses.map((weakness: string, idx: number) => (
                <Badge key={idx} variant="outline" className="bg-muted/50 border-muted">
                  {weakness}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
