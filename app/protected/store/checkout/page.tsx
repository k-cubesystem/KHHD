import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getActivePlans } from '@/app/actions/payment/products'
import { PassCheckoutClient } from './pass-checkout-client'
import { chargeRefundPolicyLine } from '@/lib/domain/payment/self-cancel'
import { passUsageFeatures } from '@/components/store/payment-guide-model'
import { PASS_VALID_DAYS, formatPassUnits } from '@/lib/domain/entitlement/pass'

export const dynamic = 'force-dynamic'

const STORE_PASS_TAB = '/protected/store?tab=pass'

/**
 * 이용권 **주문 확인** 화면 — 카드사 결제경로 심사 캡처 대상이다. 문구를 바꿀 땐 사실과 한 글자씩 대조할 것.
 *
 * ## 🔴 왜 화면이 하나 더 있나
 * 상점 카드에서 곧바로 토스 결제창이 뜨면 심사가 요구하는 ⑤「상품 구매하는 일련의 과정」이 비어 버린다
 * (토스페이먼츠 가이드 12~14p — 상품 목록 → 주문 확인 → 결제수단·동의·결제하기).
 * 대금을 받기 전에 **무엇을 얼마에 사는지 확인시키고 동의를 받는 것**은 「전자상거래법」 제8조의 판매자 의무다.
 *
 * 멤버십 결제 확인(`/protected/membership/checkout`)과 **같은 구조**로 둔다 —
 * 두 결제 경로가 다르게 생기면 심사에서도 사용자에게도 설명이 두 벌이 된다.
 */
export default async function PassCheckoutPage({ searchParams }: { searchParams: Promise<{ pack?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { pack } = await searchParams
  if (!pack) redirect(STORE_PASS_TAB)

  // 🔴 금액·상품명·장 수는 **서버가 DB 에서 다시 읽는다.** 화면이 넘겨준 값을 믿고 결제를 열면
  //    가격을 바꿔 부를 수 있다. 판매 종료된 옛 상품 id 로 들어와도 이용권 팩이 아니면 돌려보낸다.
  const plans = await getActivePlans()
  const plan = plans.find((p) => p.id === pack && p.product_kind === 'pass')
  if (!plan) redirect(STORE_PASS_TAB)

  const passes = formatPassUnits(plan.credits)
  const validDays = plan.valid_days ?? PASS_VALID_DAYS
  const orderName = plan.name === passes ? plan.name : `${plan.name} (${passes})`
  const usage = passUsageFeatures()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[480px] px-4 py-8 pb-24">
        <Link
          href={STORE_PASS_TAB}
          className="mb-8 inline-flex items-center gap-2 font-sans text-sm text-ink-light/60 transition-colors hover:text-ink-light"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1} aria-hidden />
          이용권 상품으로 돌아가기
        </Link>

        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-2">
            <Ticket className="h-4 w-4 text-gold-400" strokeWidth={1} aria-hidden />
            <span className="font-sans text-xs tracking-wide text-gold-400">주문 확인</span>
          </div>
          <h1 className="font-serif text-2xl font-light text-ink-light">{plan.name}</h1>
        </header>

        <section className="mb-6 rounded-xl border border-gold-500/20 bg-surface/30 p-6">
          <div className="mb-4 border-b border-gold-500/10 pb-4 text-center">
            <p className="font-serif text-3xl font-bold text-gold-400 tabular-nums">
              {plan.price.toLocaleString('ko-KR')}원
            </p>
            <p className="mt-1 font-sans text-xs text-ink-light/50">결제 완료 즉시 발급 · 1회 결제</p>
          </div>

          <dl className="space-y-2 font-sans text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-ink-light/50">주문 상품</dt>
              <dd className="min-w-0 truncate text-right text-ink-light/85">{plan.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-ink-light/50">구성</dt>
              <dd className="text-right tabular-nums text-ink-light/85">{passes}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-ink-light/50">유효기간</dt>
              <dd className="text-right tabular-nums text-ink-light/85">결제일로부터 {validDays}일</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-ink-light/50">사용처 — 해화당 안에서 쓰는 장 수</dt>
              <dd>
                <ul className="flex flex-wrap gap-x-2.5 gap-y-1 text-[12px] leading-snug text-ink-light/75">
                  {usage.map((f) => (
                    <li key={f.key}>
                      {f.label} <span className="tabular-nums text-gold-300">{f.cost}장</span>
                      {f.minTierLabel && <span className="text-ink-light/45"> ({f.minTierLabel} 멤버십부터)</span>}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-ink-light/50">결제 수단</dt>
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
            이용권은 결제일로부터 {validDays}일 동안 쓰실 수 있고, 다른 사람에게 양도할 수 없습니다.{' '}
            {chargeRefundPolicyLine()}
          </p>
        </section>

        <PassCheckoutClient memberId={user.id} orderName={orderName} amount={plan.price} passes={plan.credits} />
      </div>
    </div>
  )
}
