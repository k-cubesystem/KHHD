'use client'

import type { FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { MISSION_CATEGORIES } from '@/lib/constants'
import { motion } from 'framer-motion'

interface StudioAnalysisLayoutProps {
  category: 'FACE' | 'HAND' | 'FENGSHUI' | 'SAJU'
  targetMember?: FamilyMemberWithMissions | null
  children: React.ReactNode
}

/** 카테고리별 낙관(도장) 한 글자 — samhap 「합」과 같은 문법. */
const SEAL_CHAR: Record<StudioAnalysisLayoutProps['category'], string> = {
  FACE: '상',
  HAND: '손',
  FENGSHUI: '터',
  SAJU: '명',
}

export function StudioAnalysisLayout({ category, targetMember, children }: StudioAnalysisLayoutProps) {
  const categoryInfo = MISSION_CATEGORIES.find((c) => c.value === category)

  return (
    <div className="min-h-screen bg-background text-ink-light relative overflow-hidden">
      {/* Manse Global Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 
            w-[600px] h-[400px] 
            bg-primary/5 rounded-full blur-[150px]"
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 py-8 relative z-10"
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="w-11 h-11 rounded-md flex items-center justify-center font-serif font-bold text-[22px] text-[#F4E4BA] -rotate-6 shrink-0"
              style={{
                background: '#9E2B2B',
                boxShadow: '0 0 14px rgba(158,43,43,0.35), inset 0 0 0 2px rgba(244,228,186,0.25)',
              }}
            >
              {SEAL_CHAR[category]}
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-ink-light tracking-wide">
                {categoryInfo?.label}
              </h1>
              {targetMember && (
                <p className="text-sm text-ink-light/60 mt-1 font-sans font-light">{targetMember.name}님의 분석</p>
              )}
            </div>
          </div>

          {categoryInfo && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-ink-light/40 font-light uppercase tracking-wider">이용권</p>
              <p className="text-lg font-serif font-light text-primary">
                {categoryInfo.cost > 0 ? `${categoryInfo.cost}만냥` : '무료'}
              </p>
            </div>
          )}
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="px-3 py-8 max-w-4xl mx-auto pb-24">{children}</div>
    </div>
  )
}
