'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarClock, Loader2, Sparkles } from 'lucide-react'
import { submitMembershipCancel } from '@/app/actions/payment/cancel-request'
import type { CancelReasonCode, MembershipCancelOverview } from '@/lib/domain/payment/self-cancel'
import { CancelReasonFields } from '@/app/protected/payment/cancel/cancel-reason-fields'
import { SUPPORT_ASK } from '@/lib/domain/support/contact'

const won = (value: number) => `${value.toLocaleString('ko-KR')}원`

function day(iso: string | null): string {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
}

type Mode = 'PERIOD_END' | 'IMMEDIATE_REFUND'

export function MembershipCancelForm({ overview }: { overview: MembershipCancelOverview }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<Mode>('PERIOD_END')
  const [reasonCode, setReasonCode] = useState<CancelReasonCode | ''>('')
  const [memo, setMemo] = useState('')

  const { refund } = overview
  const immediate = mode === 'IMMEDIATE_REFUND'
  const refundBlocked = immediate && refund.refundAmount > 0 && !overview.refundable

  const handleSubmit = () => {
    if (!reasonCode) {
      toast.error('해지 사유를 선택해주세요.')
      return
    }
    startTransition(async () => {
      const result = await submitMembershipCancel({ mode, reasonCode, memo })
      if (!result.success) {
        toast.error(result.error ?? '해지에 실패했습니다.')
        return
      }
      toast.success(
        immediate
          ? `멤버십이 해지되었습니다. ${won(result.refundAmount ?? 0)}이 환불됩니다.`
          : '멤버십 해지가 예약되었습니다. 남은 기간까지 그대로 이용하실 수 있습니다.'
      )
      router.push('/protected/store?tab=membership')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-surface/40 border border-primary/20 p-4 space-y-2">
        <p className="text-[11px] text-ink-light/40 tracking-widest uppercase font-bold">이용 중인 멤버십</p>
        <p className="text-lg font-serif text-ink-light">{overview.planName}</p>
        <div className="text-sm font-light text-ink-light/70 space-y-1 pt-1">
          <p>
            이번 이용 기간 {day(overview.periodStart)} ~ {day(overview.periodEnd)}
          </p>
          <p>
            {refund.totalDays}일 중 {refund.usedDays}일 이용 · 남은 기간 {refund.remainingDays}일
          </p>
          {overview.nextBillingDate && <p>다음 결제 예정일 {day(overview.nextBillingDate)}</p>}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[11px] tracking-[0.08em] uppercase font-semibold text-ink-light/50 px-1">해지 방식</p>

        <label
          htmlFor="mode-period-end"
          className={`block p-4 border cursor-pointer transition-colors ${
            mode === 'PERIOD_END' ? 'border-primary/50 bg-surface/50' : 'border-primary/15 bg-surface/25'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              id="mode-period-end"
              type="radio"
              name="cancel-mode"
              checked={mode === 'PERIOD_END'}
              onChange={() => setMode('PERIOD_END')}
              className="accent-primary w-4 h-4 mt-1"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-ink-light flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary/70" strokeWidth={1.5} />
                남은 기간까지 이용하고 해지 (권장)
              </p>
              <p className="text-xs font-light text-ink-light/60 leading-relaxed">
                {day(overview.periodEnd)}까지 멤버십 혜택을 그대로 누리시고, 다음 결제부터 청구되지 않습니다. 환불은
                없습니다.
              </p>
            </div>
          </div>
        </label>

        <label
          htmlFor="mode-immediate"
          className={`block p-4 border cursor-pointer transition-colors ${
            mode === 'IMMEDIATE_REFUND' ? 'border-primary/50 bg-surface/50' : 'border-primary/15 bg-surface/25'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              id="mode-immediate"
              type="radio"
              name="cancel-mode"
              checked={mode === 'IMMEDIATE_REFUND'}
              onChange={() => setMode('IMMEDIATE_REFUND')}
              className="accent-primary w-4 h-4 mt-1"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-ink-light flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary/70" strokeWidth={1.5} />
                지금 해지하고 남은 기간만큼 환불받기
              </p>
              <p className="text-xs font-light text-ink-light/60 leading-relaxed">
                이용약관 제7조 제3항에 따라 이용하신 일수를 뺀 잔여 금액을 일할 계산해 환불합니다. 위약금은 받지
                않습니다.
              </p>
            </div>
          </div>
        </label>
      </section>

      {immediate && (
        <section className="border border-primary/15 bg-surface/20 p-3 space-y-1 text-sm font-light">
          <div className="flex justify-between text-ink-light/60">
            <span>이번 주기 결제 금액</span>
            <span className="tabular-nums">{won(overview.price)}</span>
          </div>
          <div className="flex justify-between text-ink-light/60">
            <span>
              이용분 공제 ({Math.round(refund.usageRatio * 100)}%)
              {refund.creditUsageRatio > refund.dayUsageRatio ? ' · 복채 사용분 기준' : ' · 이용 일수 기준'}
            </span>
            <span className="tabular-nums">− {won(overview.price - refund.refundAmount)}</span>
          </div>
          <div className="flex justify-between text-ink-light font-medium pt-1 border-t border-primary/10">
            <span>환불 예정 금액</span>
            <span className="tabular-nums">{won(refund.refundAmount)}</span>
          </div>
          <p className="text-[11px] text-ink-light/45 leading-relaxed pt-1">
            이미 받으신 복채 {overview.grantedCredits}만냥은 회수하지 않습니다. 다만 이번 주기에 복채를 많이 쓰셨다면
            그만큼 이용하신 것으로 보아 환불액에서 반영됩니다.
          </p>
          {refundBlocked && (
            <p className="text-[11px] text-red-light leading-relaxed pt-1">
              환불 대상 결제 정보를 찾을 수 없습니다. {SUPPORT_ASK}
            </p>
          )}
        </section>
      )}

      <CancelReasonFields
        idPrefix="membership"
        reasonCode={reasonCode}
        memo={memo}
        disabled={pending}
        onReasonChange={setReasonCode}
        onMemoChange={setMemo}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || !reasonCode || refundBlocked}
        className="w-full py-3 bg-primary/90 text-[#16140F] text-sm font-medium hover:bg-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        {immediate ? `지금 해지하고 ${won(refund.refundAmount)} 환불받기` : '남은 기간까지 이용하고 해지하기'}
      </button>
    </div>
  )
}
