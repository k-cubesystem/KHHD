'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Filter, Clock, User, Sparkles, Heart, Hexagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { TargetFilter } from '@/components/history/target-filter'
import { CategoryTabs } from '@/components/history/category-tabs'
import { AnalysisCard } from '@/components/history/analysis-card'
import { DetailModal } from '@/components/history/detail-modal'
import type { AnalysisHistory, AnalysisCategory } from '@/app/actions/user/history'

export default function HistoryPage() {
  const [records, setRecords] = useState<AnalysisHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  // Filters
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<AnalysisCategory | 'ALL'>('ALL')

  // Modal
  const [selectedRecord, setSelectedRecord] = useState<AnalysisHistory | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchRecords()
  }, [])

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

  const fetchRecords = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsGuest(true)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('analysis_history')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setRecords(data as AnalysisHistory[])
    }

    setLoading(false)
  }

  const handleRecordClick = (record: AnalysisHistory) => {
    setSelectedRecord(record)
    setIsModalOpen(true)
  }

  const handleRecordUpdate = () => {
    // 기록이 업데이트되면 다시 fetch
    fetchRecords()
  }

  // Guest View
  if (isGuest) {
    return (
      <div className="w-full max-w-[480px] mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <BookOpen className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-2xl font-serif font-bold text-ink-light">회원 전용 기능입니다</h1>
          <p className="text-ink-light/60">가입하고 운명 분석 기록을 영구 보존하세요</p>
          <Button
            onClick={() => (window.location.href = '/auth/login')}
            className="bg-primary hover:bg-primary-dim text-background"
          >
            로그인하기
          </Button>
        </div>
      </div>
    )
  }

  // Loading View
  if (loading) {
    return (
      <div className="w-full max-w-[480px] mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-12 w-full bg-surface/20" />
        <Skeleton className="h-16 w-full bg-surface/20" />
        <Skeleton className="h-32 w-full bg-surface/20" />
        <Skeleton className="h-32 w-full bg-surface/20" />
        <Skeleton className="h-32 w-full bg-surface/20" />
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
            onClick={() => (window.location.href = '/protected/analysis')}
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
              <AnalysisCard key={record.id} record={record} index={index} onClick={() => handleRecordClick(record)} />
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
