'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Crown, Check, ArrowRight, Ticket, Loader2 } from 'lucide-react'
import { GA } from '@/lib/analytics/ga4'
import { purchaseVoucher } from '@/app/actions/payment/vouchers'
import { VOUCHER_CATALOG, type VoucherType } from '@/lib/domain/payment/vouchers'

interface MembershipGateProps {
  /** GA 라벨용 대상 식별자(counsel/shrine/family). */
  feature: string
  title: string
  description: string
  /** 혜택 리스트(玄·골드 업셀). */
  benefits: string[]
  /** 지정 시 즉석 구매 가능한 1일 이용권(속풀이 전용). */
  dayPassType?: VoucherType
  /** 기능별 추가 입장로(예: 속풀이 광고 리워드 CTA) — 게이트는 내용을 모른 채 자리만 내준다. */
  footerSlot?: React.ReactNode
}

/**
 * 멤버십 게이트(업셀 화면) — 玄·골드, 혜택 리스트, 상점 멤버십 탭 CTA(DESIGN.md 준수).
 * 리다이렉트 없이 in-place 로 렌더 → 데이터는 보존, 가입/이용권 구매 즉시 router.refresh 로 통과.
 * 마스터(admin)·멤버는 서버에서 이 컴포넌트를 렌더하지 않는다(privileges + subscription 경유).
 */
export function MembershipGate({
  feature,
  title,
  description,
  benefits,
  dayPassType,
  footerSlot,
}: MembershipGateProps) {
  const router = useRouter()
  const [buying, setBuying] = useState(false)
  const dayPass = dayPassType ? VOUCHER_CATALOG[dayPassType] : null

  useEffect(() => {
    GA.paywallView()
  }, [])

  const goMembership = () => {
    GA.paywallClick(`gate_${feature}`)
    router.push('/protected/store?tab=membership')
  }

  const buyDayPass = async () => {
    if (!dayPassType) return
    setBuying(true)
    try {
      const res = await purchaseVoucher(dayPassType)
      if (res.success) {
        GA.voucherPurchase(dayPassType, VOUCHER_CATALOG[dayPassType].priceBokchae)
        toast.success('이용권 구매 완료 — 바로 입장합니다')
        router.refresh() // 서버 게이트 재평가 → 통과 시 콘텐츠 렌더
      } else if (res.errorType === 'INSUFFICIENT_BALANCE') {
        toast.error('복채가 부족합니다. 충전 후 다시 시도해주세요.')
        router.push('/protected/store?tab=bokchae')
      } else {
        toast.error(res.error || '구매에 실패했습니다.')
      }
    } finally {
      setBuying(false)
    }
  }

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-12">
      <div
        className="relative overflow-hidden rounded-2xl border border-gold-500/30 p-7 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(158,43,43,0.05) 100%)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

        <div className="relative flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gold-500/[0.12] border border-gold-500/30 flex items-center justify-center">
            <Crown className="w-8 h-8 text-gold-400" strokeWidth={1.2} />
          </div>
        </div>

        <p className="relative text-[10px] tracking-[0.3em] text-gold-500/50 uppercase font-sans mb-2">멤버십 전용</p>
        <h2 className="relative text-xl font-serif font-bold text-ink-light mb-2">{title}</h2>
        <p className="relative text-sm text-ink-light/60 font-sans font-light leading-relaxed mb-5">{description}</p>

        <ul className="relative text-left space-y-2 mb-6 max-w-[320px] mx-auto">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink-light/75 font-sans font-light">
              <Check className="w-4 h-4 text-gold-400 mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={goMembership}
          className="relative w-full h-12 rounded-xl bg-gold-500/15 border border-gold-500/45 text-gold-300 font-serif font-bold text-sm flex items-center justify-center gap-2 hover:bg-gold-500/25 transition-colors"
        >
          멤버십 시작하기
          <ArrowRight className="w-4 h-4" />
        </button>

        {dayPass && (
          <>
            <div className="relative my-3 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-ink-light/35 font-sans">또는</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <button
              onClick={buyDayPass}
              disabled={buying}
              className="relative w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.12] text-ink-light/80 font-sans text-sm flex items-center justify-center gap-2 hover:border-gold-500/40 transition-colors disabled:opacity-50"
            >
              {buying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Ticket className="w-4 h-4 text-gold-400" />
                  {dayPass.label} · 복채 {dayPass.priceBokchae}만냥
                </>
              )}
            </button>
            <p className="relative text-[10px] text-ink-light/35 mt-2 font-sans">
              구매 즉시 {dayPass.durationHours}시간 입장 · 멤버십엔 상시 포함
            </p>
          </>
        )}

        {footerSlot && <div className="relative">{footerSlot}</div>}
      </div>
    </div>
  )
}
