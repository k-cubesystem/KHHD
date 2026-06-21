'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, ChevronDown } from 'lucide-react'
import type { ShrineWish } from '@/app/actions/shrine/shrine-wishes'
import { getWishes } from '@/app/actions/shrine/shrine-wishes'

const CATEGORY_EMOJI: Record<string, string> = {
  health: '💪',
  exam: '📚',
  love: '💕',
  wealth: '💰',
  family: '👨‍👩‍👧',
  business: '🏢',
  other: '🙏',
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

interface ShrineWishLogProps {
  wishes: ShrineWish[]
  shrineId: string
}

export function ShrineWishLog({ wishes: initialWishes, shrineId }: ShrineWishLogProps) {
  const [wishes, setWishes] = useState(initialWishes)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(initialWishes.length >= 10)
  const [isLoading, setIsLoading] = useState(false)

  const loadMore = async () => {
    setIsLoading(true)
    const next = page + 1
    const { wishes: more, hasMore: more2 } = await getWishes(shrineId, next, 10)
    setWishes((prev) => [...prev, ...more])
    setPage(next)
    setHasMore(more2)
    setIsLoading(false)
  }

  if (wishes.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <MessageSquare className="w-8 h-8 text-gold-500/20 mx-auto" />
        <p className="text-ink-light/30 text-sm font-sans">아직 기원이 없습니다</p>
        <p className="text-ink-light/20 text-xs font-sans">첫 번째로 소원을 기원해보세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gold-500/50" />
        <h3 className="text-ink-light/70 font-serif text-sm font-bold">소원 기원 {wishes.length}건</h3>
      </div>

      <AnimatePresence>
        {wishes.map((wish, i) => (
          <motion.div
            key={wish.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-xl p-4 space-y-2"
            style={{
              background: wish.is_owner_wish ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${wish.is_owner_wish ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {wish.category && <span className="text-base">{CATEGORY_EMOJI[wish.category] ?? '🙏'}</span>}
                <span className="text-xs font-sans text-ink-light/50">
                  {wish.visitor_name ?? (wish.is_owner_wish ? '신당 주인' : '익명')}
                </span>
                {wish.is_owner_wish && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold-500/10 text-gold-500/60 font-sans border border-gold-500/15">
                    주인
                  </span>
                )}
              </div>
              <span className="text-[10px] text-ink-light/25 font-sans">{timeAgo(wish.created_at)}</span>
            </div>
            <p className="text-sm text-ink-light/80 font-sans leading-relaxed">{wish.wish_text}</p>
          </motion.div>
        ))}
      </AnimatePresence>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm text-ink-light/40 font-sans border border-white/5 hover:border-gold-500/20 transition-colors"
        >
          {isLoading ? (
            '로딩 중...'
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />더 보기
            </>
          )}
        </button>
      )}
    </div>
  )
}
