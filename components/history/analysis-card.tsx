'use client'

import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Star, User2, Hand, Home, Heart, Sun, Coins, Sparkles, ChevronRight, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { deleteAnalysisHistory, type AnalysisHistory } from '@/app/actions/user/history'

interface AnalysisCardProps {
  record: AnalysisHistory
  index: number
  onClick: () => void
  onDelete?: () => void
}

const categoryConfig = {
  SAJU: { icon: Sun, label: '사주', color: 'text-primary' },
  FACE: { icon: User2, label: '관상', color: 'text-primary' },
  HAND: { icon: Hand, label: '손금', color: 'text-primary-dark' },
  FENGSHUI: { icon: Home, label: '풍수', color: 'text-primary-dim' },
  COMPATIBILITY: { icon: Heart, label: '궁합', color: 'text-primary' },
  WEALTH: { icon: Coins, label: '재물운', color: 'text-primary' },
  TODAY: { icon: Sun, label: '오늘의운세', color: 'text-primary-dark' },
  NEW_YEAR: { icon: Sparkles, label: '신년운세', color: 'text-primary-dark' },
}

export const AnalysisCard = memo(function AnalysisCard({ record, index, onClick, onDelete }: AnalysisCardProps) {
  const config = categoryConfig[record.category] || categoryConfig.TODAY
  const Icon = config.icon
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }
    setIsDeleting(true)
    try {
      const result = await deleteAnalysisHistory(record.id)
      if (result.success) {
        toast.success('분석 기록이 삭제되었습니다')
        onDelete?.()
      } else {
        toast.error(result.error || '삭제 실패')
      }
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="group relative bg-surface/30 border border-primary/20 hover:border-primary/40
        rounded-lg p-4 cursor-pointer transition-all hover:bg-surface/50"
    >
      {/* Top-right actions */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        {record.is_favorite && <Star className="w-4 h-4 text-primary fill-primary" />}
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-2 py-1 text-[10px] bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              {isDeleting ? '삭제중...' : '확인'}
            </button>
            <button
              onClick={handleCancelDelete}
              className="px-2 py-1 text-[10px] bg-surface border border-primary/20 text-ink-light/60 rounded hover:bg-surface/80 transition-colors"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded transition-all"
            title="삭제"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400/60 hover:text-red-400" />
          </button>
        )}
      </div>

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-primary uppercase tracking-wide">{config.label}</span>
                {record.target_relation && (
                  <span className="text-xs text-ink-light/60">· {record.target_relation}</span>
                )}
              </div>
              <h3 className="text-lg font-serif font-bold text-ink-light truncate">
                {record.target_name}님의 {config.label} 분석
              </h3>
            </div>
            <ChevronRight className="w-5 h-5 text-ink-light/60 group-hover:text-primary transition-colors" />
          </div>

          {/* Summary */}
          {record.summary && <p className="text-sm text-ink-light/70 line-clamp-2 leading-relaxed">{record.summary}</p>}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-ink-light/70">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {format(new Date(record.created_at), 'yyyy.MM.dd HH:mm', {
                  locale: ko,
                })}
              </span>
            </div>
            {record.score !== null && (
              <div className="flex items-center gap-1 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary">{record.score}점</span>
              </div>
            )}
          </div>

          {/* User Memo Preview */}
          {record.user_memo && (
            <div className="pt-2 border-t border-ink-light/10">
              <p className="text-xs text-ink-light/60 italic line-clamp-1">💭 {record.user_memo}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})
