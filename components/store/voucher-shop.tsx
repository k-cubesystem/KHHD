'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Ticket, Check, Clock, Crown, Loader2 } from 'lucide-react'
import { purchaseVoucher, type VoucherRow } from '@/app/actions/payment/vouchers'
import { VOUCHER_CATALOG, VOUCHER_TYPES, isVoucherActive, type VoucherType } from '@/lib/domain/payment/vouchers'
import { DAILY_FREE_QUESTIONS } from '@/lib/domain/chat/constants'
import { GA } from '@/lib/analytics/ga4'

interface VoucherShopProps {
  initialVouchers: VoucherRow[]
  isMember: boolean
}

/**
 * 이용권 상점 — voucher_type 추가만으로 상품이 늘어나도록 카탈로그를 그대로 순회한다.
 * v1: 고민상담 1일권(CHAT_DAY_PASS). 선물하기는 v2(source='gift' 확장).
 */
export function VoucherShop({ initialVouchers, isMember }: VoucherShopProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<VoucherType | null>(null)
  const now = Date.now()

  const hasActiveOf = (type: string) => initialVouchers.some((v) => v.voucher_type === type && isVoucherActive(v, now))

  const buy = async (type: VoucherType) => {
    setBusy(type)
    try {
      const res = await purchaseVoucher(type)
      if (res.success) {
        GA.voucherPurchase(type, VOUCHER_CATALOG[type].priceBokchae)
        toast.success(`${VOUCHER_CATALOG[type].label} 구매 완료 — 24시간 이용 가능`)
        router.refresh()
      } else if (res.errorType === 'INSUFFICIENT_BALANCE') {
        toast.error('복채가 부족합니다. 충전 후 다시 시도해주세요.')
        router.push('/protected/store?tab=bokchae')
      } else {
        toast.error(res.error || '구매에 실패했습니다.')
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-light/40 font-sans">필요할 때만 짧게 — 멤버십 없이도 이용권으로 즐기세요.</p>

      {isMember && (
        <div className="flex items-center gap-2 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] px-3.5 py-2.5">
          <Crown className="w-4 h-4 text-gold-400 shrink-0" strokeWidth={1.5} />
          <p className="text-xs text-ink-light/70 font-sans">
            멤버십 회원은 고민상담에 <span className="text-gold-300 font-semibold">상시 입장</span> — 이용권이 필요하지
            않습니다. 질문은 회원도 하루 {DAILY_FREE_QUESTIONS}문까지 무료입니다.
          </p>
        </div>
      )}

      {VOUCHER_TYPES.map((type) => {
        const p = VOUCHER_CATALOG[type]
        const active = hasActiveOf(type)
        return (
          <div key={type} className="rounded-2xl border border-gold-500/25 bg-surface/40 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-500/[0.12] border border-gold-500/25 shrink-0">
                <Ticket className="w-5 h-5 text-gold-400" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-serif font-bold text-ink-light">{p.label}</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] text-ink-light/45 font-sans">
                    <Clock className="w-3 h-3" />
                    {p.durationHours}시간
                  </span>
                </div>
                <p className="text-xs text-ink-light/55 font-sans font-light mt-1 leading-relaxed">{p.description}</p>
              </div>
            </div>

            {active ? (
              <div className="flex items-center justify-center gap-1.5 h-11 rounded-xl bg-gold-500/[0.08] border border-gold-500/30 text-gold-300 text-sm font-serif font-bold">
                <Check className="w-4 h-4" />
                이용 중 · 활성
              </div>
            ) : (
              <button
                onClick={() => buy(type)}
                disabled={busy === type}
                className="w-full h-11 rounded-xl bg-gold-500/15 border border-gold-500/40 text-gold-300 text-sm font-serif font-bold flex items-center justify-center gap-2 hover:bg-gold-500/25 transition-colors disabled:opacity-50"
              >
                {busy === type ? <Loader2 className="w-4 h-4 animate-spin" /> : <>구매 · 복채 {p.priceBokchae}만냥</>}
              </button>
            )}

            {p.includedInMembership && (
              <p className="text-[10px] text-ink-light/35 text-center font-sans">멤버십엔 상시 포함되는 혜택입니다</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
