'use client'

import { motion } from 'framer-motion'
import { Hand, Heart } from 'lucide-react'

interface InSectionProps {
  data: any
}

export function InSection({ data }: InSectionProps) {
  if (!data) return null

  const { title, content, relationship_advice, noble_person } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="max-w-2xl mx-auto px-3 py-8 pb-32"
    >
      <div className="bg-card border border-[#D4AF37]/20 rounded-lg p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
            <Hand className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-light text-[#D4AF37]">인(人)</h2>
            <p className="text-sm text-muted-foreground">{title || '관계와 연결'}</p>
          </div>
        </div>

        {/* 본문 */}
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-ink-light/80 leading-relaxed whitespace-pre-line">{content}</p>
        </div>

        {/* 관계 조언 */}
        {relationship_advice && (
          <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-pink-500">
              <Heart className="w-4 h-4" />
              관계 조언
            </div>
            <p className="text-sm text-ink-light/80">{relationship_advice}</p>
          </div>
        )}

        {/* 귀인 */}
        {noble_person && (
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg p-4 space-y-2">
            <div className="text-sm font-semibold text-[#D4AF37]">✨ 귀인의 특징</div>
            <p className="text-sm text-ink-light/80">{noble_person}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
