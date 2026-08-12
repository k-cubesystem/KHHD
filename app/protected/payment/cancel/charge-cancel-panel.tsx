'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Headphones, Info, Loader2 } from 'lucide-react'
import { submitChargeCancel } from '@/app/actions/payment/cancel-request'
import type { ChargeCancelItem, ChargeCancelOverview, CancelReasonCode } from '@/lib/domain/payment/self-cancel'
import type { LossCapStatus } from '@/lib/domain/payment/loss-cap'
import { CancelReasonFields } from './cancel-reason-fields'

const won = (value: number) => `${value.toLocaleString('ko-KR')}원`

function paidOn(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
}

const BLOCKED_TEXT: Readonly<Record<string, string>> = {
  ALREADY_CANCELLED: '이미 취소된 결제입니다.',
  NOT_A_CHARGE: '복채 충전 결제가 아닙니다.',
  NOT_COMPLETED: '결제가 완료되지 않아 취소 대상이 아닙니다.',
  NOTHING_GRANTED: '지급된 복채가 없어 자동 취소 대상이 아닙니다.',
}

/**
 * 손실 처리 상한 안내.
 * 🔴 남은 횟수·금액은 보여주지 않는다 — 「아직 한 번 남았네」가 곧 사용 유인이 된다.
 *    막혔을 때만 이유와 다음 경로(고객센터)를 말한다.
 */
function LossCapNotice({ message }: { message: string }) {
  return (
    <div className="border border-primary/20 bg-surface/30 p-3 space-y-2">
      <p className="text-sm font-light text-ink-light/80 leading-relaxed">{message}</p>
      <Link
        href="/protected/support"
        className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
      >
        <Headphones className="w-3.5 h-3.5" strokeWidth={1.5} />
        고객센터로 문의하기
      </Link>
    </div>
  )
}

interface ChargeCancelCardProps {
  item: ChargeCancelItem
  lossCap: LossCapStatus
}

function ChargeCancelCard({ item, lossCap }: ChargeCancelCardProps) {
  const { plan } = item
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [showLossPath, setShowLossPath] = useState(false)
  const [lossAcknowledged, setLossAcknowledged] = useState(false)
  const [reasonCode, setReasonCode] = useState<CancelReasonCode | ''>('')
  const [memo, setMemo] = useState('')
  // 서버가 판정한 상한 차단 문구. 접수 도중 막힌 경우(따닥·창 만료)에 채워진다.
  const [capMessage, setCapMessage] = useState<string | null>(null)

  const blocked = plan.verdict === 'NOT_CANCELLABLE'
  const spent = plan.verdict === 'PARTIALLY_SPENT'
  // 손실이 나는 취소만 상한 대상이다. 복채를 안 쓴 정상 취소는 이 값과 무관하다.
  const lossCapMessage = capMessage ?? (spent && !lossCap.available ? (lossCap.message ?? null) : null)
  const lossPathOpen = spent && !lossCapMessage
  // (b) 갈래는 손실 처리 동의 없이는 버튼이 열리지 않는다.
  const canSubmit = !!reasonCode && !pending && (!spent || lossAcknowledged)

  const handleSubmit = () => {
    if (!reasonCode) {
      toast.error('취소 사유를 선택해주세요.')
      return
    }
    startTransition(async () => {
      const result = await submitChargeCancel({
        paymentId: item.paymentId,
        reasonCode,
        memo,
        acceptLoss: spent ? lossAcknowledged : undefined,
      })

      if (result.success) {
        const lossNote = result.lossCredits ? ` 사용하신 ${result.lossCredits}만냥은 청구하지 않습니다.` : ''
        toast.success(`취소 접수되었습니다. ${won(result.refundAmount ?? 0)}이 환불됩니다.${lossNote}`)
        setOpen(false)
        router.refresh()
        return
      }

      if (result.lossCapBlocked) {
        // 화면이 열어준 경로였더라도 서버 판정이 최종이다 — 문구를 그대로 자리에 붙인다.
        setCapMessage(result.error ?? null)
        setOpen(false)
        setShowLossPath(false)
        setLossAcknowledged(false)
        toast.error('지금은 이 방식으로 취소를 도와드리기 어렵습니다.')
        return
      }

      if (result.requiresLossAcknowledgement) {
        setShowLossPath(true)
        toast.error(result.error ?? '이미 사용하신 복채가 있어 자동 취소가 어렵습니다.')
        return
      }
      toast.error(result.error ?? '취소에 실패했습니다.')
    })
  }

  return (
    <article className="bg-surface/40 border border-primary/20">
      <header className="flex items-start justify-between gap-3 p-4 border-b border-primary/10">
        <div>
          <p className="text-[11px] text-ink-light/40 tracking-widest uppercase font-bold mb-1">
            {paidOn(item.paidAt)}
          </p>
          <p className="text-lg font-serif text-ink-light">{won(item.paidAmount)}</p>
          <p className="text-xs text-ink-light/50 font-light mt-0.5">{item.packLabel} 지급</p>
        </div>
        <span
          className={`shrink-0 text-[11px] px-2 py-1 border font-medium ${
            blocked
              ? 'border-ink-light/20 text-ink-light/40'
              : spent
                ? 'border-red-light/40 text-red-light'
                : 'border-primary/40 text-primary'
          }`}
        >
          {blocked ? '취소 불가' : spent ? '자동 취소 불가' : '취소 가능'}
        </span>
      </header>

      <div className="p-4 space-y-3">
        {blocked && (
          <p className="flex items-start gap-2 text-sm font-light text-ink-light/50">
            <Info className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.5} />
            {BLOCKED_TEXT[plan.blockedReason ?? ''] ?? '취소할 수 없는 결제입니다.'}
          </p>
        )}

        {plan.verdict === 'FULL_REFUNDABLE' && (
          <div className="space-y-2">
            <p className="flex items-start gap-2 text-sm font-light text-ink-light/85">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-primary" strokeWidth={1.5} />
              충전하신 복채 {plan.grantedCredits}만냥이 모두 남아 있어 지금 바로 취소하실 수 있습니다.
            </p>
            <RefundBreakdown
              gross={plan.grossAmount}
              fee={plan.feeAmount}
              refund={plan.refundAmount}
              within={plan.withinWithdrawalPeriod}
              elapsedDays={plan.elapsedDays}
            />
          </div>
        )}

        {spent && (
          <div className="space-y-3">
            <div className="border border-red-light/30 bg-red-light/5 p-3 space-y-1.5">
              <p className="flex items-start gap-2 text-sm font-medium text-red-light">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.5} />
                자동 취소가 어렵습니다
              </p>
              <p className="text-sm font-light text-ink-light/80 leading-relaxed">
                충전하신 복채 중 <strong className="text-ink-light">{plan.spentCredits}만냥</strong>을 이미 사용하셔서
                결제 전체를 되돌릴 수 없습니다. 지금 남아 있는 복채는 {plan.recoverableCredits}만냥입니다.
              </p>
              <p className="text-[11px] text-ink-light/50 font-light leading-relaxed">
                이미 분석 결과를 받아보신 부분은 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항에 따라
                청약철회가 제한됩니다.
              </p>
            </div>

            {lossCapMessage ? (
              <LossCapNotice message={lossCapMessage} />
            ) : !showLossPath ? (
              <button
                type="button"
                onClick={() => setShowLossPath(true)}
                className="text-xs text-ink-light/60 underline underline-offset-4 hover:text-ink-light transition-colors"
              >
                그래도 취소를 요청하고 싶어요
              </button>
            ) : (
              <div className="border border-primary/20 bg-surface/30 p-3 space-y-2">
                <p className="text-sm font-light text-ink-light/85 leading-relaxed">
                  이미 사용하신 <strong className="text-ink-light">{plan.spentCredits}만냥</strong>은 회사가 손실로
                  처리하며, 회원님께 따로 청구하지 않습니다. 대신 남아 있는 복채 {plan.recoverableCredits}만냥은 모두
                  회수되고 이 충전은 취소됩니다.
                </p>
                <RefundBreakdown
                  gross={plan.grossAmount}
                  fee={plan.feeAmount}
                  refund={plan.refundAmount}
                  within={plan.withinWithdrawalPeriod}
                  elapsedDays={plan.elapsedDays}
                />
                <label className="flex items-start gap-2 text-xs font-light text-ink-light/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lossAcknowledged}
                    onChange={(event) => setLossAcknowledged(event.target.checked)}
                    className="accent-primary w-4 h-4 mt-0.5"
                  />
                  위 내용을 확인했으며, 남은 복채가 회수되는 것에 동의합니다.
                </label>
              </div>
            )}
          </div>
        )}

        {!blocked && (plan.verdict === 'FULL_REFUNDABLE' || (showLossPath && lossPathOpen)) && (
          <div className="pt-1">
            {!open ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full py-2.5 border border-primary/40 text-sm text-primary hover:bg-primary/10 transition-colors"
              >
                취소 요청하기
              </button>
            ) : (
              <div className="space-y-4 pt-2">
                <CancelReasonFields
                  idPrefix={`charge-${item.paymentId}`}
                  reasonCode={reasonCode}
                  memo={memo}
                  disabled={pending}
                  onReasonChange={setReasonCode}
                  onMemoChange={setMemo}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className="flex-1 py-2.5 border border-primary/15 text-sm text-ink-light/60 hover:text-ink-light transition-colors disabled:opacity-50"
                  >
                    돌아가기
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex-1 py-2.5 bg-primary/90 text-[#16140F] text-sm font-medium hover:bg-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {won(plan.refundAmount)} 환불 요청
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

interface RefundBreakdownProps {
  gross: number
  fee: number
  refund: number
  within: boolean
  elapsedDays: number
}

function RefundBreakdown({ gross, fee, refund, within, elapsedDays }: RefundBreakdownProps) {
  return (
    <div className="border border-primary/15 bg-surface/20 p-3 space-y-1 text-sm font-light">
      <div className="flex justify-between text-ink-light/60">
        <span>결제 금액</span>
        <span className="tabular-nums">{won(gross)}</span>
      </div>
      {fee > 0 && (
        <div className="flex justify-between text-ink-light/60">
          <span>환불 수수료 10%</span>
          <span className="tabular-nums">− {won(fee)}</span>
        </div>
      )}
      <div className="flex justify-between text-ink-light font-medium pt-1 border-t border-primary/10">
        <span>환불 예정 금액</span>
        <span className="tabular-nums">{won(refund)}</span>
      </div>
      <p className="text-[11px] text-ink-light/45 leading-relaxed pt-1">
        {within
          ? `결제일로부터 ${elapsedDays}일 지났습니다. 7일 이내라 수수료 없이 전액 환불됩니다.`
          : `결제일로부터 ${elapsedDays}일 지나 이용약관 제7조 제2항에 따라 환불 수수료 10%가 차감됩니다.`}
      </p>
    </div>
  )
}

export function ChargeCancelPanel({ overview }: { overview: ChargeCancelOverview }) {
  if (overview.items.length === 0) {
    return <p className="text-sm text-ink-light/50 font-light text-center py-12">최근 복채 충전 내역이 없습니다.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-ink-light/40 font-light px-1">
        현재 지갑 잔액 {overview.walletBalance.toLocaleString('ko-KR')}만냥 · 최근 20건까지 보여드립니다.
      </p>
      {overview.items.map((item) => (
        <ChargeCancelCard key={item.paymentId} item={item} lossCap={overview.lossCap} />
      ))}
    </div>
  )
}
