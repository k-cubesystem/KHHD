'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'
import { addWish } from '@/app/actions/shrine/shrine-wishes'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ShrineWishFormProps {
  shrineId: string
  isOwner: boolean
}

const CATEGORIES = [
  { key: 'health', emoji: '💪', label: '건강' },
  { key: 'exam', emoji: '📚', label: '합격' },
  { key: 'love', emoji: '💕', label: '인연' },
  { key: 'wealth', emoji: '💰', label: '재물' },
  { key: 'family', emoji: '👨‍👩‍👧', label: '가족' },
  { key: 'business', emoji: '🏢', label: '사업' },
]

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'shrine_visitor_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export function ShrineWishForm({ shrineId, isOwner }: ShrineWishFormProps) {
  const [category, setCategory] = useState<string>('')
  const [wishText, setWishText] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (wishText.trim().length < 5) {
      toast.error('소원은 5글자 이상 입력해주세요')
      return
    }

    setIsLoading(true)
    const result = await addWish({
      shrineId,
      wishText: wishText.trim(),
      category: category || undefined,
      visitorName: visitorName.trim() || undefined,
      visitorSessionId: getOrCreateSessionId(),
    })
    setIsLoading(false)

    if (result.success) {
      toast.success('소원을 기원했습니다 🙏')
      setWishText('')
      setCategory('')
      setVisitorName('')
    } else {
      toast.error('기원 실패. 다시 시도해주세요.')
    }
  }, [shrineId, wishText, category, visitorName])

  return (
    <div className="rounded-2xl p-5 space-y-4 hanji-card border border-gold-500/[0.12]">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold-500/60" />
        <h3 className="text-ink-light font-serif text-sm font-bold">
          {isOwner ? '나의 소원 기원' : '이 신당에 소원 기원하기'}
        </h3>
      </div>

      {/* 카테고리 선택 */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(category === cat.key ? '' : cat.key)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-sans transition-all border',
              category === cat.key
                ? 'bg-gold-500/[0.2] border-gold-500/[0.5] text-gold-500'
                : 'bg-white/[0.03] border-white/[0.08]'
            )}
            style={category === cat.key ? undefined : { color: 'rgba(232,228,220,0.5)' }}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 소원 텍스트 */}
      <textarea
        value={wishText}
        onChange={(e) => setWishText(e.target.value)}
        placeholder="소원을 적어주세요 (5~100자)"
        maxLength={100}
        rows={3}
        className="w-full bg-white/3 border border-gold-500/10 rounded-xl px-4 py-3 text-sm text-ink-light placeholder:text-ink-light/20 resize-none focus:outline-none focus:border-gold-500/30 font-sans leading-relaxed"
      />

      <div className="flex items-center justify-between">
        {/* 방문자 이름 (비오너만) */}
        {!isOwner && (
          <input
            type="text"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            placeholder="이름 (선택)"
            maxLength={10}
            className="w-24 bg-white/3 border border-gold-500/10 rounded-lg px-3 py-2 text-xs text-ink-light placeholder:text-ink-light/20 focus:outline-none focus:border-gold-500/30 font-sans"
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading || wishText.trim().length < 5}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-serif font-bold transition-all disabled:opacity-40 border bg-gold-500/[0.15] border-gold-500/[0.3] text-gold-500"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              🙏
            </motion.span>
          )}
          기원하기
        </button>
      </div>

      <p className="text-[10px] text-ink-light/20 font-sans text-center">
        소원 기원 시 복 포인트 {isOwner ? '+10' : '+5'}이 적립됩니다
      </p>
    </div>
  )
}
