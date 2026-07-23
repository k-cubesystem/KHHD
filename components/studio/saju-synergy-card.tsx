'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link2 } from 'lucide-react'
import { trackEvent } from '@/lib/analytics/ga4'

interface SajuSynergyCardProps {
  /** buildFaceSajuSynergyText / buildPalmSajuSynergyText 결과 */
  text: string
  category: 'face' | 'palm'
}

/**
 * 사주 교차분석 카드 — "사주가 같은 말을 합니다".
 * 관상·손금 점수와 사주 일간이 일치하는 근거를 강조(골드 보더 + 글로우).
 * 표시 시 GA4 이벤트를 남겨 교차분석 노출률을 추적한다.
 */
export function SajuSynergyCard({ text, category }: SajuSynergyCardProps) {
  useEffect(() => {
    if (!text) return
    trackEvent({ action: 'saju_synergy_view', category: 'analysis', label: category })
  }, [text, category])

  if (!text) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-gold-500/50 p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(158,43,43,0.06) 100%)',
        boxShadow: '0 0 20px rgba(201,168,76,0.15)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gold-500/15 border border-gold-500/40">
          <Link2 className="w-3.5 h-3.5 text-gold-500" />
        </div>
        <div>
          <p className="text-sm font-serif font-bold text-gold-500 tracking-wide">사주가 같은 말을 합니다</p>
          <p className="text-[10px] text-gold-500/50 font-sans tracking-wider uppercase">
            {category === 'palm' ? '손금 × 사주 교차분석' : '관상 × 사주 교차분석'}
          </p>
        </div>
      </div>
      <p className="text-sm text-ink-primary/85 font-sans font-light leading-relaxed">{text}</p>
    </motion.div>
  )
}
