'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Star,
  Trash2,
  Share2,
  Edit3,
  Save,
  Clock,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import {
  type AnalysisHistory,
  toggleFavorite,
  updateAnalysisMemo,
  deleteAnalysisHistory,
  createShareLink,
} from '@/app/actions/user/history'
import { AnalysisResultView } from './analysis-result-view'

interface DetailModalProps {
  isOpen: boolean
  onClose: () => void
  record: AnalysisHistory
  onUpdate: () => void
}

export function DetailModal({ isOpen, onClose, record, onUpdate }: DetailModalProps) {
  const router = useRouter()
  const [isFavorite, setIsFavorite] = useState(record.is_favorite)
  const [memo, setMemo] = useState(record.user_memo || '')
  const [isEditingMemo, setIsEditingMemo] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Toggle Favorite
  const handleToggleFavorite = async () => {
    try {
      const newFavoriteState = !isFavorite
      const result = await toggleFavorite(record.id, newFavoriteState)
      if (result.success) {
        setIsFavorite(newFavoriteState)
        toast.success(newFavoriteState ? '즐겨찾기 추가' : '즐겨찾기 해제')
        onUpdate()
      } else {
        toast.error(result.error || '즐겨찾기 변경 실패')
      }
    } catch {
      toast.error('즐겨찾기 변경 중 오류가 발생했습니다.')
    }
  }

  // Save Memo
  const handleSaveMemo = async () => {
    try {
      const result = await updateAnalysisMemo(record.id, memo)
      if (result.success) {
        toast.success('메모가 저장되었습니다')
        setIsEditingMemo(false)
        onUpdate()
      } else {
        toast.error(result.error || '메모 저장 실패')
      }
    } catch {
      toast.error('메모 저장 중 오류가 발생했습니다.')
    }
  }

  // Delete Record
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteAnalysisHistory(record.id)
      if (result.success) {
        toast.success('분석 기록이 삭제되었습니다')
        onClose()
        onUpdate()
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

  // Share
  const handleShare = async () => {
    try {
      // 1. Get Share Token/URL
      const result = await createShareLink(record.id)

      if (!result.success || !result.url) {
        toast.error(result.error || '공유 링크 생성 실패')
        return
      }

      // 2. Client-side URL construction (Safe & Correct Domain)
      const shareUrl = `${window.location.origin}/share/${result.token}`
      const shareText = `${record.target_name}님의 ${record.category} 분석 결과 | 청담 해화당\n${shareUrl}`

      // 2. Web Share API
      if (navigator.share) {
        try {
          await navigator.share({
            title: `해화당 운명 분석`,
            text: `${record.target_name}님의 ${record.category} 분석 결과를 확인해보세요.`,
            url: shareUrl,
          })
          toast.success('공유되었습니다!')
        } catch (err) {
          // Dismissal allowed
        }
      } else {
        // 3. Fallback: Copy to Clipboard
        await navigator.clipboard.writeText(shareText)
        toast.success('공유 링크가 복사되었습니다!')
      }
    } catch (err) {
      console.error('Share failed:', err)
      toast.error('공유 중 오류가 발생했습니다.')
    }
  }

  // Re-analyze: 재분석 기능
  const handleReAnalyze = () => {
    const categoryRoutes: Record<string, string> = {
      SAJU: `/protected/analysis/cheonjiin?targetId=${record.target_id}`,
      FACE: '/protected/saju/face',
      HAND: '/protected/saju/hand',
      FENGSHUI: '/protected/saju/fengshui',
      COMPATIBILITY: '/protected/compatibility',
      TODAY: '/protected/saju/today',
      WEALTH: '/protected/analysis/wealth',
      NEW_YEAR: '/protected/analysis/new-year',
    }

    const route = categoryRoutes[record.category]
    if (route) {
      toast.info('분석 페이지로 이동합니다...')
      router.push(route)
    } else {
      toast.error('해당 분석 페이지를 찾을 수 없습니다.')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-20 bottom-20 z-50 mx-auto max-w-[480px]
              bg-surface border border-primary/20 rounded-lg shadow-2xl
              flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-primary/20 bg-surface/80">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-serif font-bold text-ink-light">분석 상세</h2>
                <button
                  onClick={handleToggleFavorite}
                  className="p-1 hover:bg-primary/10 rounded transition-colors"
                >
                  <Star
                    className={`w-5 h-5 ${
                      isFavorite ? 'text-amber-400 fill-amber-400' : 'text-ink-light/40'
                    }`}
                  />
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-primary/10 rounded transition-colors"
              >
                <X className="w-5 h-5 text-ink-light/60" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Meta Info */}
              <div className="space-y-3 pb-4 border-b border-primary/10">
                <h3 className="text-2xl font-serif font-bold text-ink-light">
                  {record.target_name}님의 {record.category} 분석
                </h3>
                <div className="flex items-center gap-4 text-sm text-ink-light/60">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(record.created_at), 'yyyy.MM.dd HH:mm', {
                        locale: ko,
                      })}
                    </span>
                  </div>
                  {record.score !== null && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-primary font-bold">{record.score}점</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Result Content */}
              <AnalysisResultView record={record} />

              {/* User Memo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-primary uppercase tracking-wide">
                    내 메모
                  </h4>
                  {!isEditingMemo && (
                    <button
                      onClick={() => setIsEditingMemo(true)}
                      className="text-xs text-ink-light/60 hover:text-primary flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      편집
                    </button>
                  )}
                </div>
                {isEditingMemo ? (
                  <div className="space-y-2">
                    <Textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="이 분석에 대한 메모를 작성하세요..."
                      className="min-h-[100px] bg-background/50 border-primary/20 text-ink-light"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveMemo}
                        size="sm"
                        className="bg-primary hover:bg-primary-dim text-background"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        저장
                      </Button>
                      <Button
                        onClick={() => {
                          setMemo(record.user_memo || '')
                          setIsEditingMemo(false)
                        }}
                        size="sm"
                        variant="outline"
                        className="border-primary/20"
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-ink-light/70 italic p-3 bg-background/30 rounded border border-primary/10">
                    {memo || '메모가 없습니다. 편집 버튼을 눌러 작성하세요.'}
                  </p>
                )}
              </div>
            </div>

            {/* Footer - Actions */}
            <div className="p-4 border-t border-primary/20 bg-surface/80 flex flex-col gap-2">
              {/* Top Row: Re-analyze & Share */}
              <div className="flex gap-2">
                <Button
                  onClick={handleReAnalyze}
                  className="flex-1 bg-primary hover:bg-primary-dim text-background"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  재분석하기
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="flex-1 border-primary/20 hover:border-primary/40"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  공유하기
                </Button>
              </div>

              {/* Bottom Row: Delete */}
              {!showDeleteConfirm ? (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {isDeleting ? '삭제 중...' : '확인'}
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="outline"
                    className="flex-1 border-primary/20"
                  >
                    취소
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
