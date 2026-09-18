'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check, Loader2, Sparkles, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { GA } from '@/lib/analytics/ga4'
import type { PricePlan } from '@/types/auth'
import { chargeRefundPolicyLine } from '@/lib/domain/payment/self-cancel'
import { formatFeatureCost, type FeatureCostKey } from '@/lib/domain/payment/feature-costs'
import { PASS_VALID_DAYS, formatPassUnits } from '@/lib/domain/entitlement/pass'

/** 풀이별 장 수 안내 — 이름만 여기서 정하고 장 수는 FEATURE_COST 가 정한다. */
const USAGE_GUIDE: ReadonlyArray<{ label: string; key: FeatureCostKey }> = [
  { label: '사주·궁합', key: 'saju' },
  { label: '관상·손금·풍수', key: 'face' },
  { label: '종합사주풀이', key: 'samhap' },
]

function validDaysOf(plan: PricePlan): number {
  return plan.valid_days ?? PASS_VALID_DAYS
}

/**
 * 이용권 구매 — 상점 «이용권» 탭.
 *
 * 🔴 화면 문구의 정본은 `price_plans.features`(DB)다. 코드에 상품 카드 문구·가격을 손으로 두지 않는다 —
 *    예전엔 조회 실패용 폴백 상수가 있었고, 코드만 고치고 배포했다가 라이브 카드에 옛 문구가 남은 적이 있다.
 *    상품을 못 읽으면 카드를 그리지 않는다(없는 가격을 보여주는 것보다 낫다).
 * 🔴 «장당 N원» 같은 단가 배지를 만들지 않는다 — 이용권을 잔액·단위 통화처럼 읽히게 한다.
 */
export function PassPurchaseSection({ plans }: { plans: PricePlan[] }) {
  const router = useRouter()
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)

  const sortedPlans = [...plans].sort((a, b) => (a.sort_order ?? a.price) - (b.sort_order ?? b.price))

  /**
   * 🔴 결제창을 여기서 열지 않는다. 예외 없다.
   *
   * 카드사 결제경로 심사가 요구하는 ⑤「구매하는 일련의 과정」 — 상품 카드에서 곧바로 토스 창이 뜨면
   * 그 과정이 통째로 빈다. 대금을 받기 전에 무엇을 얼마에 사는지 확인시키고 동의를 받는 것은
   * 「전자상거래법」 제8조의 판매자 의무이기도 하다. 주문 확인 화면으로 넘긴다.
   */
  const handleSelect = (plan: PricePlan) => {
    if (!plan.id) {
      GA.checkoutFail(plan.name, 'plans_unavailable')
      toast.error('상품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    // 퍼널 6단계(결제 시작)는 «상품 카드 누름»에 둔다. 확인 화면 통과율은 그 화면의 checkoutPayClick 으로 본다.
    GA.checkoutStart(plan.name, plan.price)
    setLoadingPlanId(plan.id)
    router.push(`/protected/store/checkout?pack=${plan.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500/10 to-gold-300/10 border border-gold-500/30 rounded-full">
          <Ticket className="w-4 h-4 text-gold-400" />
          <span className="text-sm font-serif font-bold text-gold-400 tracking-wide">이용권</span>
        </div>
        <p className="text-xs text-white/60">필요할 때 사서 풀이에 쓰는 이용권 · 결제가 끝나면 바로 드려요</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {USAGE_GUIDE.map((item) => (
          <div key={item.label} className="bg-white/[0.03] border border-white/[0.08] rounded-lg py-2 px-1">
            <Sparkles className="w-4 h-4 mx-auto mb-0.5 text-gold-400/60" />
            <p className="text-[9px] text-white/50 mb-0.5">{item.label}</p>
            <p className="text-[10px] font-bold text-gold-400">{formatFeatureCost(item.key)}</p>
          </div>
        ))}
      </div>

      {sortedPlans.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
          상품 정보를 불러오지 못했습니다. 잠시 후 다시 들어와 주세요.
        </p>
      ) : (
        <div className="space-y-3">
          {sortedPlans.map((plan) => {
            const isLoading = loadingPlanId === plan.id

            return (
              <div
                key={plan.id}
                className="relative rounded-xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all duration-200 overflow-hidden"
              >
                {plan.badge_text && (
                  <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold rounded-bl-xl bg-gold-500 text-background">
                    {plan.badge_text}
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-serif font-bold text-white">{plan.name}</h3>
                      {plan.description && <p className="text-[11px] text-white/60 mt-0.5">{plan.description}</p>}
                    </div>
                    <div className="flex items-baseline gap-1 flex-shrink-0 ml-3">
                      <span className="text-xl font-serif font-bold text-gold-400 tabular-nums">
                        {plan.price.toLocaleString('ko-KR')}
                      </span>
                      <span className="text-xs text-white/60">원</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-3 bg-gold-500/10 border border-gold-500/20">
                    <span className="flex items-center gap-2 text-sm font-bold text-gold-300">
                      <Ticket className="w-4 h-4 shrink-0 text-gold-400" />
                      {formatPassUnits(plan.credits)}
                    </span>
                    <span className="text-[11px] text-white/60">유효기간 결제일로부터 {validDaysOf(plan)}일</span>
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-primary/70 flex-shrink-0" />
                          <span className="text-[11px] text-white/60">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    onClick={() => handleSelect(plan)}
                    disabled={loadingPlanId !== null}
                    className="w-full h-11 font-bold text-sm bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 text-background shadow-md hover:shadow-gold-500/30 transition-all"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">
                        <Ticket className="w-4 h-4" />
                        {formatPassUnits(plan.credits)} 구매하기
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 space-y-1.5">
        <p className="text-[10px] font-bold text-white/60 mb-2">이용권 안내</p>
        {[
          '제공 시점 — 결제가 끝나면 바로 발급돼요',
          `유효기간 — 결제일로부터 ${PASS_VALID_DAYS}일 (기간이 지나면 쓸 수 없어요)`,
          chargeRefundPolicyLine(),
          '양도 — 구매한 이용권은 다른 사람에게 넘길 수 없습니다',
          '멤버십 이번 달 몫과는 따로 보관되며, 둘 다 있으면 기한이 먼저 끝나는 쪽부터 씁니다',
        ].map((text) => (
          <p key={text} className="text-[9px] text-white/40 flex items-start gap-1.5">
            <span className="text-primary/40 mt-0.5">·</span>
            {text}
          </p>
        ))}
        <Link href="/pass-policy" className="inline-block pt-1 text-[9px] text-primary/70 underline underline-offset-2">
          이용권 안내·환불 정책 자세히 보기
        </Link>
      </div>
    </div>
  )
}
