'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Filter, Hexagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TargetFilter } from '@/components/history/target-filter'
import { CategoryTabs } from '@/components/history/category-tabs'
import { AnalysisCard } from '@/components/history/analysis-card'
import { DetailModal } from '@/components/history/detail-modal'
import type { AnalysisHistory, AnalysisCategory } from '@/app/actions/user/history'

interface HistoryPageClientProps {
  initialRecords: AnalysisHistory[]
  isGuest: boolean
}

export function HistoryPageClient({ initialRecords, isGuest }: HistoryPageClientProps) {
  const router = useRouter()
  const [records] = useState<AnalysisHistory[]>(initialRecords)

  // Filters
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<AnalysisCategory | 'ALL'>('ALL')

  // Modal
  const [selectedRecord, setSelectedRecord] = useState<AnalysisHistory | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredRecords = useMemo(() => {
    let filtered = records

    if (selectedTargetId) {
      filtered = filtered.filter((r) => r.target_id === selectedTargetId)
    }

    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter((r) => r.category === selectedCategory)
    }

    return filtered
  }, [records, selectedTargetId, selectedCategory])

  const handleRecordClick = useCallback((record: AnalysisHistory) => {
    setSelectedRecord(record)
    setIsModalOpen(true)
  }, [])

  const handleRecordUpdate = useCallback(() => {
    // Server action revalidatePath handles cache. Trigger client refresh.
    router.refresh()
  }, [router])

  // Guest View
  if (isGuest) {
    return (
      <div className="w-full max-w-[480px] mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <BookOpen className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-2xl font-serif font-bold text-ink-light">회원 전용 기능입니다</h1>
          <p className="text-ink-light/60">가입하고 운명 분석 기록을 영구 보존하세요</p>
          <Button
            onClick={() => router.push('/auth/login')}
            className="bg-primary hover:bg-primary-dim text-background"
          >
            로그인하기
          </Button>
        </div>
      </div>
    )
  }

  // Empty State
  if (records.length === 0) {
    return (
      <div className="w-full max-w-[480px] mx-auto px-4 py-16">
        <div className="text-center space-y-6 border border-dashed border-primary/20 bg-surface/20 p-12">
          <BookOpen className="w-16 h-16 text-ink-light/40 mx-auto" />
          <h2 className="text-xl font-serif font-bold text-ink-light">분석 기록이 없습니다</h2>
          <p className="text-ink-light/60">첫 운명 분석을 시작해보세요</p>
          <Button
            onClick={() => router.push('/protected/analysis')}
            className="bg-primary hover:bg-primary-dim text-background"
          >
            분석 시작하기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[480px] mx-auto pb-24">
      {/* Header */}
      <section className="px-4 py-8 space-y-4">
        <div className="flex items-center gap-2 px-4 py-1.5 border border-primary/30 bg-surface/80 backdrop-blur-md w-fit">
          <Hexagon className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary">분석 기록</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-serif font-bold tracking-tight text-ink-light">운명 아카이브</h1>
          <div className="text-sm text-ink-light/60">
            총 <span className="text-primary font-bold">{records.length}</span>건
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 space-y-4 mb-6">
        {/* Target Filter */}
        <TargetFilter selectedTargetId={selectedTargetId} onTargetChange={setSelectedTargetId} />

        {/* Category Tabs */}
        <CategoryTabs records={records} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
      </section>

      {/* Records List */}
      <section className="px-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredRecords.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12 border border-dashed border-primary/20 bg-surface/10"
            >
              <Filter className="w-12 h-12 text-ink-light/30 mx-auto mb-4" />
              <p className="text-ink-light/60">해당 조건의 기록이 없습니다</p>
            </motion.div>
          ) : (
            filteredRecords.map((record, index) => (
              <AnalysisCard
                key={record.id}
                record={record}
                index={index}
                onClick={() => handleRecordClick(record)}
                onDelete={handleRecordUpdate}
              />
            ))
          )}
        </AnimatePresence>
      </section>

      {/* Detail Modal */}
      {selectedRecord && (
        <DetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          record={selectedRecord}
          onUpdate={handleRecordUpdate}
        />
      )}
    </div>
  )
}
