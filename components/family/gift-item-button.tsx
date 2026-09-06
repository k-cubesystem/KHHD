'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { giftItem, type GiftError } from '@/app/actions/circle/gift'
import { GIFT_MESSAGE_MAX } from '@/lib/domain/circle/gift'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 「선물하기」 — 처방전 ④ 신당 살림 한 점을 그 사람에게. 한마디를 붙일 수 있다.
 * 차감·전달·기록은 전부 서버(giftItem)다. 여기서는 결과를 말로 옮긴다.
 */

function errorMessage(error: GiftError): string {
  switch (error) {
    case 'INSUFFICIENT_BOKCHAE':
      return '복채가 모자랍니다. 상점에서 채운 뒤 다시 보내 주세요.'
    case 'DAILY_LIMIT':
      return '오늘 보낼 수 있는 선물을 다 보냈습니다. 내일 다시 보내 주세요.'
    case 'ITEM_NOT_GIFTABLE':
      return '이 살림은 선물할 수 없는 품목입니다.'
    case 'SELF':
      return '나에게 보내는 살림은 상점에서 바로 담습니다.'
    case 'NOT_FOUND':
      return '사람이나 살림을 찾지 못했습니다. 화면을 새로 고쳐 주세요.'
    default:
      return '잠시 뒤 다시 시도해 주세요.'
  }
}

export function GiftItemButton({
  recipientMemberId,
  recipientName,
  itemId,
  itemName,
  element,
  priceBokchae,
}: {
  recipientMemberId: string
  recipientName: string
  itemId: string
  itemName: string
  element: string
  priceBokchae: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()

  const send = () => {
    startTransition(async () => {
      const result = await giftItem({ recipientMemberId, catalogItemId: itemId, message })
      if (!result.success) {
        toast.error(errorMessage(result.error))
        return
      }
      trackEvent({
        action: 'gift_send',
        category: 'conversion',
        label: `${element}:${result.delivery}`,
        value: priceBokchae,
      })
      toast.success(
        result.delivery === 'inventory_recipient'
          ? `${result.recipientName}님 보관함에 ${result.itemName}을(를) 보냈습니다.`
          : `${result.itemName}이(가) 내 보관함에 담겼습니다. 신당에서 ${result.recipientName}님 선반 칸에 놓아 주세요.`
      )
      setOpen(false)
      setMessage('')
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-gold-500/30 bg-gold-500/[0.06] py-1 font-serif text-[10.5px] text-gold-300 hover:bg-gold-500/[0.12]"
      >
        <Gift className="h-3 w-3" /> 선물 {priceBokchae > 0 ? `${priceBokchae.toLocaleString('ko-KR')}냥` : '무료'}
      </button>
    )
  }

  return (
    <div className="mt-1.5 space-y-1.5 rounded-md border border-gold-500/30 bg-black/30 p-1.5 text-left">
      <p className="text-[10px] leading-snug text-ink-light/60" style={{ wordBreak: 'keep-all' }}>
        {recipientName}님께 {itemName}을(를) 보냅니다.
      </p>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, GIFT_MESSAGE_MAX))}
        maxLength={GIFT_MESSAGE_MAX}
        placeholder="한마디 (선택)"
        className="h-7 w-full rounded border border-white/10 bg-black/30 px-2 text-[11px] text-ink-light placeholder:text-ink-light/30 focus:outline-none focus:ring-1 focus:ring-gold-500/60"
      />
      <div className="flex gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={send}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded bg-gold-500 py-1 font-serif text-[11px] font-bold text-black hover:bg-gold-500/80 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gift className="h-3 w-3" />} 보내기
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className="rounded border border-white/10 px-2 py-1 text-[11px] text-ink-light/55"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
