'use client'

import { useState } from 'react'
import { ImageDown, Loader2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Element } from '@/lib/domain/shrine/types'
import { EL_LABEL } from '@/lib/domain/shrine/energy'
import { claimShareReward } from '@/app/actions/payment/bok-points'
import { logger } from '@/lib/utils/logger'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 「선물 카드」 — 실물 선물과 함께 건네는 공유 이미지(og/gift). 링크 공유 → 없으면 복사.
 * 공유 보상은 기존 경로(claimShareReward — 자격·금액은 서버가 정한다). 실패해도 공유 UX 는 그대로.
 * URL 에는 오행과 받는 이 이름(선택)만 싣는다 — 생년월일·명식은 싣지 않는다.
 */
export function GiftCardButton({ element, recipientName }: { element: Element; recipientName: string | null }) {
  const [busy, setBusy] = useState(false)

  const cardPath = `/api/og/gift?el=${element}${recipientName ? `&to=${encodeURIComponent(recipientName)}` : ''}`

  const share = async () => {
    setBusy(true)
    const url = `${window.location.origin}${cardPath}`
    const title = recipientName ? `${recipientName}님을 위한 기운 선물` : '기운 선물 카드'
    const text = `${EL_LABEL[element]} 기운을 채우는 선물 — 청담해화당 기운 처방전`
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
        trackEvent({ action: 'gift_card_share', category: 'engagement', label: element })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('카드 링크를 복사했습니다.')
        trackEvent({ action: 'gift_card_copy', category: 'engagement', label: element })
      }
      claimShareReward().catch(() => {})
    } catch (err) {
      // 공유 창을 닫은 것도 여기로 온다 — 조용히.
      logger.log('[gift-card] share cancelled or failed:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={share}
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-500/40 bg-gold-500/[0.1] py-2 font-serif text-[12px] font-bold text-gold-200 hover:bg-gold-500/20 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />} 선물 카드 보내기
      </button>
      <a
        href={cardPath}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackEvent({ action: 'gift_card_open', category: 'engagement', label: element })}
        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-serif text-[12px] text-ink-light/65 hover:text-ink-light"
      >
        <ImageDown className="h-3.5 w-3.5" /> 카드 보기
      </a>
    </div>
  )
}
