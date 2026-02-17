'use client'

import { motion } from 'framer-motion'
import { Hand, Heart, UserPlus, Fingerprint } from 'lucide-react'
import { Card } from '@/components/ui/card'

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
      className="max-w-4xl mx-auto mb-4 px-4 pb-20"
    >
      <Card className="relative overflow-hidden card-glass-manse p-6 md:p-8 border-rose-900/40 bg-[#0A0A0A]">
        {/* Background Decor - Human/Soul Theme */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-900/10 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-900/10 rounded-full blur-[60px] pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 space-y-6">
          {/* Section Header */}
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a0c10] to-[#0A0A0A] border border-rose-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.1)]">
              <span className="text-2xl font-serif text-rose-300">人</span>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-serif font-medium text-ink-light flex items-center gap-2">
                인(人){' '}
                <span className="text-sm font-sans text-ink-light/40 font-light">• 관상/손금</span>
              </h2>
              <p className="text-xs text-rose-300/60 font-light tracking-wide">
                스스로 빚어낸 삶의 궤적과 인연의 고리
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif text-ink-light">{title || '내면의 의지와 관계'}</h3>
            <p className="text-sm md:text-base text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">
              {content}
            </p>
          </div>

          {/* Advice & Noble Person Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Relationship Advice */}
            {relationship_advice && (
              <div className="bg-rose-950/10 rounded-xl p-5 border border-rose-500/20 space-y-3 relative overflow-hidden group">
                <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Heart className="w-12 h-12 text-rose-500" />
                </div>

                <div className="flex items-center gap-2 text-rose-300">
                  <Fingerprint className="w-4 h-4" />
                  <span className="text-sm font-serif font-medium">인연과 처세</span>
                </div>
                <p className="text-sm text-ink-light/80 font-light leading-relaxed break-keep relative z-10">
                  {relationship_advice}
                </p>
              </div>
            )}

            {/* Noble Person */}
            {noble_person && (
              <div className="bg-purple-950/10 rounded-xl p-5 border border-purple-500/20 space-y-3 relative overflow-hidden group">
                <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <UserPlus className="w-12 h-12 text-purple-500" />
                </div>

                <div className="flex items-center gap-2 text-purple-300">
                  <UserPlus className="w-4 h-4" />
                  <span className="text-sm font-serif font-medium">귀인의 징조</span>
                </div>
                <p className="text-sm text-ink-light/80 font-light leading-relaxed break-keep relative z-10">
                  {noble_person}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
