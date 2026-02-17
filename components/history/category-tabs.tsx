'use client'

import { motion } from 'framer-motion'
import { Sparkles, User2, Hand, Home, Heart, Sun, Coins } from 'lucide-react'
import type { AnalysisHistory, AnalysisCategory } from '@/app/actions/user/history'

interface CategoryTabsProps {
  records: AnalysisHistory[]
  selectedCategory: AnalysisCategory | 'ALL'
  onCategoryChange: (category: AnalysisCategory | 'ALL') => void
}

type TabConfig = {
  value: AnalysisCategory | 'ALL'
  label: string
  icon: React.ElementType
}

const tabs: TabConfig[] = [
  { value: 'ALL', label: '전체', icon: Sparkles },
  { value: 'SAJU', label: '사주', icon: Sun },
  { value: 'FACE', label: '관상', icon: User2 },
  { value: 'HAND', label: '손금', icon: Hand },
  { value: 'FENGSHUI', label: '풍수', icon: Home },
  { value: 'COMPATIBILITY', label: '궁합', icon: Heart },
  { value: 'WEALTH', label: '재물', icon: Coins },
  { value: 'TODAY', label: '오늘의운세', icon: Sun },
]

export function CategoryTabs({ records, selectedCategory, onCategoryChange }: CategoryTabsProps) {
  const getCategoryCount = (category: AnalysisCategory | 'ALL'): number => {
    if (category === 'ALL') return records.length
    return records.filter((r) => r.category === category).length
  }

  const categories = [
    { value: 'ALL', label: '전체', icon: Sparkles },
    { value: 'SAJU', label: '사주', icon: Sun },
    { value: 'FACE', label: '관상', icon: User2 },
    { value: 'HAND', label: '손금', icon: Hand },
    { value: 'FENGSHUI', label: '풍수', icon: Home },
    { value: 'COMPATIBILITY', label: '궁합', icon: Heart },
    { value: 'WEALTH', label: '재물운', icon: Coins },
    { value: 'TODAY', label: '오늘의운세', icon: Sun },
    { value: 'NEW_YEAR', label: '신년운세', icon: Sparkles },
  ] as const

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-ink-light/60 font-medium uppercase tracking-wide">
          카테고리
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
        {categories.map((tab) => {
          const count = getCategoryCount(tab.value as AnalysisCategory | 'ALL')
          const isActive = selectedCategory === tab.value
          const Icon = tab.icon

          if (count === 0 && tab.value !== 'ALL') return null

          return (
            <button
              key={tab.value}
              onClick={() => onCategoryChange(tab.value as AnalysisCategory | 'ALL')}
              className={`
                relative flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap transition-all duration-300 rounded-lg border
                ${
                  isActive
                    ? 'bg-primary/10 border-primary/40 text-primary font-medium shadow-[0_0_10px_rgba(236,182,19,0.1)]'
                    : 'bg-surface/30 border-white/5 text-ink-light/60 hover:text-ink-light hover:bg-surface/50 hover:border-white/10'
                }
              `}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-ink-light/40'}`} />
              <span>{tab.label}</span>
              <span
                className={`
                text-[10px] px-1.5 py-0.5 rounded-full ml-0.5 min-w-[1.2em] text-center
                ${isActive ? 'bg-primary/20 text-primary' : 'bg-black/20 text-ink-light/40'}
              `}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
