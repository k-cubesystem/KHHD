import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Coins } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getActivePlans } from '@/app/actions/payment/products'
import { BokchaeCheckoutClient } from './bokchae-checkout-client'
import { chargeRefundPolicyLine } from '@/lib/domain/payment/self-cancel'

export const dynamic = 'force-dynamic'

/**
 * 복채 충전 **주문 확인** 화면.
 *
 * ## 🔴 왜 화면이 하나 늘었나
 * 예전에는 상점의 「복채 N만냥 충전하기」를 누르면 **곧바로 토스 결제창**이 떴다.
 * 그래서 카드사 결제경로 심사가 요구하는 ⑤「상품 구매하는 일련의 과정」이 통째로 비어 있었다
 * (토스페이먼츠 가이드 12~14p — 상품 목록 → 주문 확인 → 결제수단·동의·결제하기).
 *
 * 대금을 받기 전에 **무엇을 얼마에 사는지 확인시키고 동의를 받는 것**은 「전자상거래 등에서의
 * 소비자보호에 관한 법률」 제8조가 판매자에게 지운 의무이기도 하다.
 *
 * 멤버십 결제 확인(`/protected/membership/checkout`)과 **같은 구조**로 둔다 —
 * 두 결제 경로가 다르게 생기면 심사에서도 사용자에게도 설명이 두 벌이 된다.
 */
export default async function BokchaeCheckoutPage({ searchParams }: { searchParams: Promise<{ pack?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { pack } = await searchParams
  if (!pack) redirect('/protected/store?tab=bokchae')

  // 🔴 금액·상품명은 **서버가 DB 에서 다시 읽는다.** 화면이 넘겨준 값을 믿고 결제를 열면
  //    가격을 바꿔 부를 수 있다(복채 증액 서버액션 공개노출 사고와 같은 결).
  const plans = await getActivePlans()
  const plan = plans.find((p) => p.id === pack)
  if (!plan) redirect('/protected/store?tab=bokchae')

  const bonus = plan.bonus_credits ?? 0

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[480px] px-4 py-8 pb-24">
        <Link
          href="/protected/store?tab=bokchae"
          className="mb-8 inline-flex items-center gap-2 font-sans text-sm text-ink-light/60 transition-colors hover:text-ink-light"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1} aria-hidden />
          복채 충전으로 돌아가기
        </Link>

        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-2">
            <Coins className="h-4 w-4 text-gold-400" strokeWidth={1} aria-hidden />
            <span className="font-sans text-xs tracking-wide text-gold-400">주문 확인</span>
          </div>
          <h1 className="font-serif text-2xl font-light text-ink-light">{plan.name}</h1>
        </header>

        {/* 주문 상품 정보 */}
        <section className="mb-6 rounded-xl border border-gold-500/20 bg-surface/30 p-6">
          <div className="mb-4 border-b border-gold-500/10 pb-4 text-center">
            <p className="font-serif text-3xl font-bold text-gold-400 tabular-nums">
              {plan.price.toLocaleString('ko-KR')}원
            </p>
            <p className="mt-1 font-sans text-xs text-ink-light/50">결제 완료 즉시 전량 지급 · 1회 결제</p>
          </div>

          <dl className="space-y-2 font-sans text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-light/50">주문 상품</dt>
              <dd className="min-w-0 truncate text-right text-ink-light/85">{plan.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-light/50">지급 복채</dt>
              <dd className="text-right tabular-nums text-ink-light/85">
                {plan.credits.toLocaleString('ko-KR')}만냥
                {bonus > 0 && <span className="ml-1 text-gold-400">+ 보너스 {bonus.toLocaleString('ko-KR')}만냥</span>}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-light/50">결제 수단</dt>
              <dd className="text-right text-ink-light/85">신용·체크카드</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-2">
              <dt className="font-bold text-ink-light/70">총 결제 금액</dt>
              <dd className="text-right font-serif text-lg font-bold tabular-nums text-gold-400">
                {plan.price.toLocaleString('ko-KR')}원
              </dd>
            </div>
          </dl>

          <p className="mt-3 font-sans text-[11px] leading-relaxed text-ink-light/40">
            지급된 복채는 만료 없이 사용하실 수 있습니다. {chargeRefundPolicyLine()}
          </p>
        </section>

        <BokchaeCheckoutClient
          memberId={user.id}
          packId={plan.id}
          orderName={`${plan.name} (복채 ${plan.credits}만냥)`}
          amount={plan.price}
          credits={plan.credits}
        />
      </div>
    </div>
  )
}
