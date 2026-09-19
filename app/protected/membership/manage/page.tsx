import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Crown, CreditCard, ArrowRight, RotateCcw, Ticket } from 'lucide-react'
import { getSubscriptionStatus } from '@/app/actions/payment/subscription'
import { getMyPassSummary } from '@/app/actions/payment/passes'
import { SubscriptionActions } from '@/components/membership/subscription-actions'
import { EMPTY_PASS_SUMMARY, passSummaryLines } from '@/lib/domain/entitlement/pass'
import { chargeRefundPolicyLine, membershipRefundPolicyLine } from '@/lib/domain/payment/self-cancel'

export const metadata: Metadata = {
  title: '결제 · 구독 관리',
  description: '멤버십 구독 상태와 결제 수단을 확인하고 관리합니다.',
}

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: '구독 중', cls: 'border-gold-500/40 bg-gold-500/[0.12] text-gold-300' },
  CANCELLED: { label: '해지 예정', cls: 'border-white/15 bg-white/[0.06] text-ink-light/60' },
  PAUSED: { label: '일시 중지', cls: 'border-white/15 bg-white/[0.06] text-ink-light/60' },
  PAYMENT_FAILED: { label: '결제 실패', cls: 'border-seal/40 bg-seal/15 text-seal' },
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * 결제 · 구독 관리.
 *
 * ## 🔴 이 화면은 «사는 곳»이 아니다
 * 예전에는 여기에 멤버십 3종과 충전 팩 4종 카탈로그가 통째로 또 있었다(`PaymentWidget`).
 * 상점(`/protected/store`)이 이미 같은 것을 팔고 있었고, 이쪽 사본은 **죽은 `zen` 팔레트**를
 * 쓰고 있었다 — `zen.text` 가 흰색인데 카드가 `bg-white` 라 **흰 바탕에 흰 글씨**였고,
 * 좁은 폭에 3열을 밀어 넣어 글자가 세로로 한 자씩 쪼개졌다. 사람이 읽을 수 없는 화면이었다.
 *
 * 그래서 역할을 갈랐다 — **사는 것은 상점, 산 것을 관리하는 것은 여기.**
 * 구독 상태·결제 수단 변경·해지·환불 신청만 남긴다(정기결제 심사가 요구하는
 * 「결제 정보 변경」 화면도 이 자리다).
 */
export default async function MembershipManagePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/auth/login')
  }

  const [{ isSubscribed, subscription, plan }, passSummary] = await Promise.all([
    getSubscriptionStatus(),
    getMyPassSummary(),
  ])
  // 🔴 주머니별로 한 줄씩 — 멤버십 이번 달 몫과 보유 이용권을 한 숫자로 더하지 않는다.
  const passLines = passSummaryLines(passSummary ?? EMPTY_PASS_SUMMARY)

  const status = subscription?.status ?? null
  const statusMeta = status ? (STATUS_LABEL[status] ?? STATUS_LABEL.PAUSED) : null

  return (
    <div className="mx-auto w-full max-w-[480px] px-3 py-6 pb-24">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/protected/profile"
          className="inline-flex shrink-0 items-center gap-1 font-serif text-[12px] text-ink-light/50 transition-colors hover:text-gold-300"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />내 서재
        </Link>
        <Link
          href="/protected/store"
          className="inline-flex items-center gap-1 font-serif text-[12px] text-gold-300/80 transition-colors hover:text-gold-300"
        >
          상점 <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <header className="mb-5 space-y-1.5 text-center">
        <p className="font-serif text-[10px] tracking-[0.5em] text-gold-500/50">HAEHWADANG</p>
        <h1 className="font-serif text-2xl font-bold text-ink-light">결제 · 구독 관리</h1>
        <p className="font-sans text-sm text-ink-light/50">지금 무엇을 쓰고 계신지, 그리고 그만두는 방법.</p>
      </header>

      {/* 이용권 */}
      <section className="mb-3 rounded-2xl border border-white/[0.08] bg-surface/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/[0.08]">
              <Ticket className="h-4 w-4 text-gold-400" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-sans text-[11px] leading-none text-ink-light/45">이용권</p>
              {passLines.length > 0 ? (
                <ul className="mt-1.5 space-y-1">
                  {passLines.map((line) => (
                    <li key={line} className="break-keep font-serif text-[13px] font-bold leading-snug text-gold-300">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 font-serif text-[13px] font-bold leading-snug text-ink-light/70">
                  지금 쓸 수 있는 이용권이 없어요
                </p>
              )}
            </div>
          </div>
          <Link
            href="/protected/store?tab=pass"
            className="inline-flex min-h-[40px] shrink-0 items-center rounded-full border border-gold-500/40 bg-gold-500/[0.12] px-4 font-serif text-[13px] text-gold-300 transition-colors hover:bg-gold-500/20"
          >
            구매하기
          </Link>
        </div>
      </section>

      {/* 멤버십 상태 */}
      <section className="mb-3 rounded-2xl border border-white/[0.08] bg-surface/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/[0.08]">
              <Crown className="h-4 w-4 text-gold-400" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-sans text-[11px] leading-none text-ink-light/45">멤버십</p>
              <p className="mt-1.5 truncate font-serif text-[15px] font-bold leading-none text-ink-light">
                {plan?.name ?? '가입하지 않으셨습니다'}
              </p>
            </div>
          </div>
          {statusMeta && (
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 font-sans text-[10px] font-bold ${statusMeta.cls}`}
            >
              {statusMeta.label}
            </span>
          )}
        </div>

        {subscription ? (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.06]">
              <div className="bg-surface/70 px-3.5 py-3">
                <dt className="font-sans text-[11px] leading-none text-ink-light/45">
                  {status === 'CANCELLED' ? '이용 종료일' : '다음 결제일'}
                </dt>
                <dd className="mt-1.5 font-serif text-[13px] font-bold leading-none text-ink-light tabular-nums">
                  {formatDate(
                    status === 'CANCELLED' ? subscription.current_period_end : subscription.next_billing_date
                  )}
                </dd>
              </div>
              <div className="bg-surface/70 px-3.5 py-3">
                <dt className="font-sans text-[11px] leading-none text-ink-light/45">월 결제 금액</dt>
                <dd className="mt-1.5 font-serif text-[13px] font-bold leading-none text-ink-light tabular-nums">
                  {plan ? `${plan.price.toLocaleString('ko-KR')}원` : '-'}
                </dd>
              </div>
            </dl>

            {status === 'CANCELLED' && (
              <p className="mt-3 flex items-start gap-1.5 font-sans text-[11.5px] leading-relaxed text-ink-light/45">
                <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500/70" aria-hidden />
                해지를 예약하셨습니다. 종료일까지는 그대로 이용하실 수 있고, 그전에 되돌리실 수도 있습니다.
              </p>
            )}

            <SubscriptionActions
              subscriptionId={subscription.id}
              status={subscription.status}
              periodEnd={subscription.current_period_end}
            />
          </>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="break-keep font-sans text-[12.5px] leading-relaxed text-ink-light/50">
              멤버십은 신당 · 가족관리 · 속풀이의 문을 열고, 한 달마다 등급별 장 수만큼 이용권을 쓰실 수 있게
              합니다(이월 없음). 사주 · 궁합 · 관상 · 손금 · 풍수는 멤버십이 없어도 이용권으로 보실 수 있습니다.
            </p>
            <Link
              href="/protected/store?tab=membership"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-gold-500 px-5 font-serif text-sm font-bold text-ink-950 transition-colors hover:bg-gold-400"
            >
              멤버십 보러 가기
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}
      </section>

      {/* 취소·해지 셀프서비스 — 1:1 문의 없이 스스로 처리할 수 있게 노출한다 */}
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Link
          href="/protected/payment/cancel"
          className="rounded-2xl border border-white/[0.08] bg-surface/40 p-4 transition-colors hover:border-gold-500/30"
        >
          <p className="mb-1 flex items-center gap-1.5 font-serif text-[13.5px] font-bold text-ink-light">
            <CreditCard className="h-3.5 w-3.5 text-gold-500/70" aria-hidden />
            이용권 구매 취소
          </p>
          <p className="font-sans text-[11.5px] leading-relaxed text-ink-light/45">{chargeRefundPolicyLine()}</p>
        </Link>
        <Link
          href="/protected/membership/cancel"
          className="rounded-2xl border border-white/[0.08] bg-surface/40 p-4 transition-colors hover:border-gold-500/30"
        >
          <p className="mb-1 flex items-center gap-1.5 font-serif text-[13.5px] font-bold text-ink-light">
            <Crown className="h-3.5 w-3.5 text-gold-500/70" aria-hidden />
            멤버십 해지
          </p>
          <p className="font-sans text-[11.5px] leading-relaxed text-ink-light/45">{membershipRefundPolicyLine()}</p>
        </Link>
      </section>

      {!isSubscribed && subscription && (
        <p className="mt-4 text-center font-sans text-[11px] text-ink-light/35">
          현재 멤버십 혜택은 적용되지 않는 상태입니다.
        </p>
      )}
    </div>
  )
}
