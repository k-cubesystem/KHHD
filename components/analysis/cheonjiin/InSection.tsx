'use client'

import { motion } from 'framer-motion'
import { Heart, UserPlus, Fingerprint, ScanFace, Hand, Activity } from 'lucide-react'
import { FaceReadingData, PalmReadingData } from '@/types/cheonjiin'

interface InSectionProps {
  data: {
    title?: string
    content?: string
    relationship_advice?: string
    noble_person?: string
    face_reading?: FaceReadingData | null
    palm_reading?: PalmReadingData | null
  } | null
}

function MiniScoreRing({ value, color }: { value: number; color: string }) {
  const r = 14
  const circ = 2 * Math.PI * r
  return (
    <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
        <motion.circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (circ * value) / 100 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <motion.span
        className="text-[9px] font-bold"
        style={{ color }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {value}
      </motion.span>
    </div>
  )
}

export function InSection({ data }: InSectionProps) {
  if (!data) return null

  const { title, content, relationship_advice, noble_person, face_reading, palm_reading } = data

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
                인연과 내면의 조화 <span className="text-rose-300/60 text-sm font-normal ml-1">사람의 기운</span>
              </h2>
            </div>
            <p className="text-sm text-ink-light/50 font-light pl-13">
              스스로 빚어낸 삶의 궤적과 귀한 인연의 연결고리입니다.
            </p>
          </div>

          {/* Core Content */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-serif text-rose-100 mb-3 leading-snug">{title || '내면의 의지와 관계'}</h3>
              <p className="text-sm md:text-base text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">
                {content}
              </p>
            </div>

            {/* Advice Grid */}
            <div className="grid grid-cols-1 gap-4 pt-2">
              {relationship_advice && (
                <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-5 relative overflow-hidden group">
                  <div
                    className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12"
                    aria-hidden="true"
                  >
                    <Heart className="w-24 h-24 text-rose-500" />
                  </div>

                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2 text-rose-300">
                      <Fingerprint className="w-4 h-4" aria-hidden="true" />
                      <span className="text-sm font-bold tracking-wide">인연과 관계</span>
                    </div>
                    <p className="text-sm text-ink-light/90 font-light leading-relaxed break-keep">
                      {relationship_advice}
                    </p>
                  </div>
                </div>
              )}

              {noble_person && (
                <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-5 relative overflow-hidden group">
                  <div
                    className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12"
                    aria-hidden="true"
                  >
                    <UserPlus className="w-24 h-24 text-purple-500" />
                  </div>

                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2 text-purple-300">
                      <UserPlus className="w-4 h-4" aria-hidden="true" />
                      <span className="text-sm font-bold tracking-wide">귀인(貴人)</span>
                    </div>
                    <p className="text-sm text-ink-light/90 font-light leading-relaxed break-keep">{noble_person}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 관상(觀相) 분석 */}
            {face_reading && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-rose-500/10" />
                  <span className="text-[11px] text-rose-400/60 font-bold tracking-widest px-2">觀相 관상 분석</span>
                  <div className="h-px flex-1 bg-rose-500/10" />
                </div>

                {/* 관상 전체 + 점수 */}
                {face_reading.overall && (
                  <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ScanFace className="w-4 h-4 text-rose-400" aria-hidden="true" />
                        <span className="text-[11px] text-rose-400/70 font-bold tracking-wide">전체 인상</span>
                      </div>
                      {face_reading.face_score !== null && face_reading.face_score !== undefined && (
                        <MiniScoreRing value={face_reading.face_score} color="#fca5a5" />
                      )}
                    </div>
                    <p className="text-sm text-ink-light/80 font-light leading-relaxed break-keep">
                      {face_reading.overall}
                    </p>
                  </div>
                )}

                {/* 오관 2x2 그리드 */}
                {(face_reading.forehead || face_reading.eyes || face_reading.nose || face_reading.mouth) && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '이마 · 관록궁', value: face_reading.forehead, sublabel: '직업운' },
                      { label: '눈 · 부처궁', value: face_reading.eyes, sublabel: '재물운' },
                      { label: '코 · 재백궁', value: face_reading.nose, sublabel: '현금운' },
                      { label: '입 · 처첩궁', value: face_reading.mouth, sublabel: '인연운' },
                    ]
                      .filter((item) => item.value)
                      .map((item) => (
                        <div
                          key={item.label}
                          className="bg-surface/30 border border-rose-500/10 rounded-xl p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-rose-300/70 font-bold">{item.label}</span>
                            <span className="text-[9px] text-rose-300/40">{item.sublabel}</span>
                          </div>
                          <p className="text-xs text-ink-light/70 font-light leading-relaxed break-keep">
                            {item.value}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* 손금(手金) 분석 */}
            {palm_reading && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-purple-500/10" />
                  <span className="text-[11px] text-purple-400/60 font-bold tracking-widest px-2">手相 손금 분석</span>
                  <div className="h-px flex-1 bg-purple-500/10" />
                </div>

                {/* 손금 전체 + 점수 */}
                {palm_reading.overall && (
                  <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hand className="w-4 h-4 text-purple-400" aria-hidden="true" />
                        <span className="text-[11px] text-purple-400/70 font-bold tracking-wide">전체 인상</span>
                      </div>
                      {palm_reading.palm_score !== null && palm_reading.palm_score !== undefined && (
                        <MiniScoreRing value={palm_reading.palm_score} color="#c4b5fd" />
                      )}
                    </div>
                    <p className="text-sm text-ink-light/80 font-light leading-relaxed break-keep">
                      {palm_reading.overall}
                    </p>
                  </div>
                )}

                {/* 4대선 리스트 */}
                {(palm_reading.life_line ||
                  palm_reading.head_line ||
                  palm_reading.heart_line ||
                  palm_reading.fate_line) && (
                  <div className="space-y-2">
                    {[
                      { label: '생명선', value: palm_reading.life_line, desc: '체력·건강' },
                      { label: '두뇌선', value: palm_reading.head_line, desc: '사고방식' },
                      { label: '감정선', value: palm_reading.heart_line, desc: '연애패턴' },
                      { label: '운명선', value: palm_reading.fate_line, desc: '커리어' },
                    ]
                      .filter((item) => item.value)
                      .map((item) => (
                        <div
                          key={item.label}
                          className="bg-surface/20 border border-purple-500/10 rounded-xl p-3 flex items-start gap-3"
                        >
                          <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
                            <Activity className="w-3.5 h-3.5 text-purple-400/60" aria-hidden="true" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] text-purple-300/80 font-bold">{item.label}</span>
                              <span className="text-[9px] text-purple-300/40">{item.desc}</span>
                            </div>
                            <p className="text-xs text-ink-light/70 font-light leading-relaxed break-keep">
                              {item.value}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
