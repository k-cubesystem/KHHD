'use client'

import type { FamilyMemberWithMissions } from '@/app/actions/family-missions'
import { MISSION_CATEGORIES } from '@/lib/constants'
import { motion } from 'framer-motion'

interface StudioAnalysisLayoutProps {
  category: 'FACE' | 'HAND' | 'FENGSHUI' | 'SAJU'
  targetMember?: FamilyMemberWithMissions | null
  children: React.ReactNode
}

export function StudioAnalysisLayout({
  category,
  targetMember,
  children,
}: StudioAnalysisLayoutProps) {
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
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-light text-primary tracking-wide">
              {categoryInfo?.label}
            </h1>
            {targetMember && (
              <p className="text-sm text-ink-light/60 mt-1 font-sans font-light">
                {targetMember.name}님의 분석
              </p>
            )}
          </div>

          {categoryInfo && (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <categoryInfo.icon className="w-6 h-6 text-primary" strokeWidth={1} />
              </div>
              {categoryInfo.cost > 0 && (
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-ink-light/40 font-light uppercase tracking-wider">
                    Credits
                  </p>
                  <p className="text-lg font-serif font-light text-primary">{categoryInfo.cost}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="px-3 py-8 max-w-4xl mx-auto pb-24">{children}</main>
    </div>
  )
}
