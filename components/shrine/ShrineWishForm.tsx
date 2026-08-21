'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, Flame } from 'lucide-react'
import { addWish } from '@/app/actions/shrine/shrine-wishes'
import { devotionProgress } from '@/lib/domain/shrine/devotion'
import { SHRINE_PRAYED_EVENT } from '@/lib/config/gamefeel'
import { trackEvent } from '@/lib/analytics/ga4'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ShrineWishFormProps {
  shrineId: string
  isOwner: boolean
  /** 대상 가족(본인 신당이면 null·미전달). 소원에 대상 식별자를 새겨 로그 표기에 쓴다. */
  familyMemberId?: string | null
  /** 오늘(KST) 이미 기도(기원 적립)했는지 — 본인·가족 신당에서 '기원 +1' 뉘앙스 표시용. */
  prayedToday?: boolean
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

export function ShrineWishForm({ shrineId, isOwner, familyMemberId = null, prayedToday = false }: ShrineWishFormProps) {
  const router = useRouter()
  const [category, setCategory] = useState<string>('')
  const [wishText, setWishText] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [ripple, setRipple] = useState(0) // 소원 빌기 성공 시 물결 파문(F-5)

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
      familyMemberId,
    })
    setIsLoading(false)

    if (result.success) {
      setRipple((r) => r + 1)
      setWishText('')
      setCategory('')
      setVisitorName('')
      if (result.devotionGained) {
        // 오늘 첫 기도 → 기원 적립. 단·다음목표는 순수 모듈로 클라에서 계산.
        const p = devotionProgress(result.devotionTotalDays ?? 0)
        toast.success(
          p.nextLevel ? `기원이 쌓였습니다 · ${p.nextLevel}단까지 ${p.daysToNext}일` : '기원이 지극합니다 · 최고 경지',
          { description: `기원 ${p.level}단 · 오늘의 기도 🙏` }
        )
        trackEvent({ action: 'devotion_gain', category: 'shrine', label: `L${p.level}`, value: p.totalDays })
        // 기도 의식 연출 신호 — refresh 보다 **먼저** 보내야 현재 마운트된 룸이 받는다
        // (refresh 는 서버 렌더를 갈아끼우므로 그 뒤에 쏘면 리스너 교체 타이밍에 유실될 수 있다)
        window.dispatchEvent(new CustomEvent(SHRINE_PRAYED_EVENT))
        router.refresh() // 기원 스트립·버튼 뉘앙스 갱신 (하루 최대 1회)
      } else {
        toast.success('소원을 기원했습니다 🙏')
      }
    } else {
      toast.error('기원 실패. 다시 시도해주세요.')
    }
  }, [shrineId, wishText, category, visitorName, familyMemberId, router])

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 space-y-4 hanji-card border border-gold-500/[0.12]">
      {ripple > 0 && (
        <motion.span
          key={ripple}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-500/40"
          initial={{ scale: 0, opacity: 0.7 }}
          animate={{ scale: 5, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      )}
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
                : 'bg-white/[0.03] border-white/[0.08] text-ink-primary/[0.5]'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/shrine/wish/${cat.key}.webp`}
              alt=""
              className="w-[18px] h-[18px] object-contain"
              onError={(e) => {
                e.currentTarget.outerHTML = `<span>${cat.emoji}</span>`
              }}
              draggable={false}
            />
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
        className="w-full bg-white/[0.03] border border-gold-500/10 rounded-xl px-4 py-3 text-sm text-ink-light placeholder:text-ink-light/20 resize-none focus:outline-none focus:border-gold-500/30 font-sans leading-relaxed"
      />

      <div className="flex items-center justify-between">
        {/* 방문자 이름 (비오너만) · 오너는 오늘 첫 기도면 '기원 +1' 뉘앙스 */}
        {!isOwner ? (
          <input
            type="text"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            placeholder="이름 (선택)"
            maxLength={10}
            className="w-24 bg-white/[0.03] border border-gold-500/10 rounded-lg px-3 py-2 text-xs text-ink-light placeholder:text-ink-light/20 focus:outline-none focus:border-gold-500/30 font-sans"
          />
        ) : !prayedToday ? (
          <span className="flex items-center gap-1 font-serif text-[11px] text-gold-300/90">
            <Flame className="h-3.5 w-3.5" style={{ color: '#C9A84C' }} /> 오늘 첫 기도 · 기원 +1
          </span>
        ) : (
          <span aria-hidden />
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
