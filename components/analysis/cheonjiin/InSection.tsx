'use client'

import { motion } from 'framer-motion'
import { Heart, UserPlus, Fingerprint } from 'lucide-react'

interface InSectionProps {
  data: {
    title?: string
    content?: string
    relationship_advice?: string
    noble_person?: string
  } | null
}

export function InSection({ data }: InSectionProps) {
  if (!data) return null

  const { title, content, relationship_advice, noble_person } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="w-full px-0 py-2 mb-8"
    >
      <div className="relative overflow-hidden bg-surface/20 backdrop-blur-sm border-t border-b border-white/5 py-8 md:py-10">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

        <div className="px-5 md:px-8 relative z-10">
          {/* Header */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <span className="font-serif text-lg text-rose-300">人</span>
              </div>
              <h2 className="text-xl font-bold text-ink-light tracking-tight">
                인연과 내면의 조화{' '}
                <span className="text-rose-300/60 text-sm font-normal ml-1">Inner Soul</span>
              </h2>
            </div>
            <p className="text-sm text-ink-light/50 font-light pl-13">
              스스로 빚어낸 삶의 궤적과 귀한 인연의 연결고리입니다.
            </p>
          </div>

          {/* Core Content */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-serif text-rose-100 mb-3 leading-snug">
                {title || '내면의 의지와 관계'}
              </h3>
              <p className="text-sm md:text-base text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">
                {content}
              </p>
            </div>

            {/* Advice Grid */}
            <div className="grid grid-cols-1 gap-4 pt-2">
              {relationship_advice && (
                <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                    <Heart className="w-24 h-24 text-rose-500" />
                  </div>

                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2 text-rose-300">
                      <Fingerprint className="w-4 h-4" />
                      <span className="text-sm font-bold tracking-wide uppercase">
                        Relationship
                      </span>
                    </div>
                    <p className="text-sm text-ink-light/90 font-light leading-relaxed break-keep">
                      {relationship_advice}
                    </p>
                  </div>
                </div>
              )}

              {noble_person && (
                <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                    <UserPlus className="w-24 h-24 text-purple-500" />
                  </div>

                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2 text-purple-300">
                      <UserPlus className="w-4 h-4" />
                      <span className="text-sm font-bold tracking-wide uppercase">
                        Noble Person
                      </span>
                    </div>
                    <p className="text-sm text-ink-light/90 font-light leading-relaxed break-keep">
                      {noble_person}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
