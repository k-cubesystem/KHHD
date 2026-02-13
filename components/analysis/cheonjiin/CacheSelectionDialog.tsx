'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Clock, Sparkles } from 'lucide-react'

interface CacheSelectionDialogProps {
  targetName: string
  cacheDate: string
  onViewCache: () => void
  onNewAnalysis: () => void
}

export function CacheSelectionDialog({
  targetName,
  cacheDate,
  onViewCache,
  onNewAnalysis,
}: CacheSelectionDialogProps) {
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '오늘'
    if (diffDays === 1) return '어제'
    if (diffDays < 7) return `${diffDays}일 전`

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full"
      >
        {/* 아이콘 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#F4E5C3]/20 mx-auto mb-4 flex items-center justify-center text-4xl">
            🔮
          </div>
          <h2 className="text-2xl font-bold mb-2">{targetName}님의 천지인 분석</h2>
          <p className="text-muted-foreground text-sm">이전에 분석한 결과가 있습니다</p>
        </motion.div>

        {/* 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border rounded-lg p-6 mb-6 space-y-4"
        >
          {/* 캐시 정보 */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {formatDate(cacheDate)} 분석 결과
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                최근 7일 이내 분석은 다시 볼 수 있습니다
              </div>
            </div>
          </div>

          {/* 안내 */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              • <strong>기존 결과 보기</strong>: 이전 분석을 그대로 확인합니다
            </p>
            <p>
              • <strong>새로 분석하기</strong>: 최신 데이터로 다시 분석합니다
            </p>
          </div>

          {/* 새 분석 권장 조건 */}
          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
            <div className="text-xs text-amber-900 dark:text-amber-100">
              <strong>💡 새 분석을 권장하는 경우:</strong>
              <ul className="mt-2 space-y-1 ml-4">
                <li>• 이사를 했거나 주소가 바뀐 경우</li>
                <li>• 새로운 사진으로 분석하고 싶은 경우</li>
                <li>• 현재 상황이 많이 달라진 경우</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <Button onClick={onViewCache} variant="outline" size="lg" className="w-full text-base">
            <Clock className="w-5 h-5 mr-2" />
            기존 결과 보기
          </Button>

          <Button
            onClick={onNewAnalysis}
            size="lg"
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#F4E5C3] hover:from-[#C5A028] hover:to-[#E5D6B4] text-black font-semibold text-base"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            새로 분석하기
          </Button>
        </motion.div>

        {/* 하단 안내 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-center text-muted-foreground mt-6"
        >
          새로 분석 시 부적 3개가 차감됩니다
        </motion.p>
      </motion.div>
    </div>
  )
}
