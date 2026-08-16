'use client'

import { Sparkles, User2, Hand, Home, Heart, Sun, Coins, Star } from 'lucide-react'
import type { AnalysisHistory, AnalysisCategory } from '@/app/actions/user/history'
import { ANALYSIS_CATEGORY_LABEL, ANALYSIS_CATEGORY_ORDER } from '@/lib/domain/analysis/category-labels'

/** 아이콘만 화면 쪽에 둔다(컴포넌트라 도메인에 못 넣는다). 라벨·순서는 도메인이 정본. */
const CATEGORY_ICON: Record<AnalysisCategory, typeof Sparkles> = {
  SAJU: Sun,
  FACE: User2,
  HAND: Hand,
  FENGSHUI: Home,
  COMPATIBILITY: Heart,
  WEALTH: Coins,
  TODAY: Sun,
  NEW_YEAR: Sparkles,
  SAMHAP: Star,
  THEME: Sparkles,
}

interface CategoryTabsProps {
  records: AnalysisHistory[]
  selectedCategory: AnalysisCategory | 'ALL'
  onCategoryChange: (category: AnalysisCategory | 'ALL') => void
}

export function CategoryTabs({ records, selectedCategory, onCategoryChange }: CategoryTabsProps) {
  const getCategoryCount = (category: AnalysisCategory | 'ALL'): number => {
    if (category === 'ALL') return records.length
    return records.filter((r) => r.category === category).length
  }

  // 🔴 카테고리는 라벨 단일 출처에서 온다. 여기 손으로 적어 두면 새 카테고리가 생길 때마다
  //    탭에서만 빠진다 — 종합사주·테마가 정확히 그렇게 빠져 있었다(2026-08-16).
  const categories = [
    { value: 'ALL' as const, label: '전체', icon: Sparkles },
    ...ANALYSIS_CATEGORY_ORDER.map((value) => ({
      value,
      label: ANALYSIS_CATEGORY_LABEL[value],
      icon: CATEGORY_ICON[value],
    })),
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-ink-light/60 font-medium uppercase tracking-wide">카테고리</label>
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
