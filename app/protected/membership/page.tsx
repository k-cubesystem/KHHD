import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMembershipPlans, getSubscriptionStatus } from '@/app/actions/subscription-actions'
import { getActivePlans, getCurrentUserRole } from '@/app/actions/products'
import { MembershipTabs } from '@/components/membership/membership-tabs'
import { TalismanPurchaseSection } from '@/components/membership/talisman-purchase-section'
import { Crown, Check, ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { BrandQuote } from '@/components/ui/BrandQuote'
import { BRAND_QUOTES } from '@/lib/constants/brand-quotes'

export default async function MembershipPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isGuest = !user
  let isSubscribed = false
  let subscription = null
  let currentPlan = null

  // 로그인 사용자만 구독 상태 확인
  if (user) {
    const subscriptionData = await getSubscriptionStatus()
    isSubscribed = subscriptionData.isSubscribed
    subscription = subscriptionData.subscription
    currentPlan = subscriptionData.plan

    // 구독 중이면 관리 페이지로 (업그레이드/다운그레이드는 관리 페이지에서)
    if (isSubscribed && subscription) {
      return redirect('/protected/membership/manage?tab=subscription')
    }
  }

  const [plans, talismanPlans, userRoleData] = await Promise.all([
    getMembershipPlans(),
    getActivePlans(),
    getCurrentUserRole(),
  ])

  const userRole = userRoleData.role

  // 등급별로 정렬 (SINGLE -> FAMILY -> BUSINESS)
  const sortedPlans = plans.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-[480px] mx-auto px-3 py-8 pb-24">
        {/* Back Link */}
        <Link
          href="/protected"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1} />
          <span>대시보드로 돌아가기</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
            <Crown className="w-4 h-4 text-primary" strokeWidth={1} />
            <span className="text-primary font-serif font-light text-xs tracking-wide">
              Premium Membership
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-serif font-light text-white leading-tight">
            지금 시작하고,
            <br />
            혜택을 받으세요!
          </h1>

          <BrandQuote variant="hero" className="text-center">
            {BRAND_QUOTES.membership.hero}
          </BrandQuote>

          <p className="text-white/60 text-sm leading-relaxed font-light">
            1분이면 가입 완료됩니다.
          </p>
        </div>

        {/* Guest Notice */}
        {isGuest && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 mb-8 text-center">
            <p className="text-white font-serif font-light text-base mb-2">무료로 시작하세요!</p>
            <p className="text-sm text-white/70 leading-relaxed font-light">
              회원가입 후 모든 플랜을 선택하실 수 있습니다.
            </p>
          </div>
        )}

        {/* Membership Tabs */}
        <div className="mb-12">
          <MembershipTabs plans={sortedPlans} isGuest={isGuest} />
        </div>

        {/* Talisman Top-up Section */}
        <div className="mb-12">
          <TalismanPurchaseSection
            initialPlans={talismanPlans}
            userRole={userRole}
            memberId={user?.id || ''}
          />
        </div>

        {/* Common Benefits */}
        <div className="bg-surface/30 backdrop-blur-sm border border-primary/20 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" strokeWidth={1} />
            <h2 className="text-lg font-serif font-light text-white">모든 플랜 공통 혜택</h2>
          </div>
          <div className="space-y-4">
            {[
              { title: '언제든 해지 가능', desc: '위약금 없이 자유롭게' },
              { title: '즉시 부적 지급', desc: '결제 완료 즉시 충전' },
              { title: '자동 결제', desc: '매월 걱정 없이 충전' },
              {
                title: '부적 추가 증정',
                desc: `${
                  sortedPlans.length > 0 && sortedPlans[0]?.features
                    ? (sortedPlans[0].features as any).bonus_rate || 10
                    : 10
                }% 보너스`,
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 rounded-lg">
                  <Check className="w-4 h-4 text-primary" strokeWidth={1} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-light text-white text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-white/70 leading-relaxed font-light">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-surface/30 backdrop-blur-sm border border-primary/20 rounded-xl p-6">
          <h2 className="text-lg font-serif font-light text-white mb-6">자주 묻는 질문</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-light text-white mb-2 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 bg-primary/20 text-primary flex items-center justify-center text-xs font-medium rounded-lg flex-shrink-0">
                  Q
                </span>
                <span className="flex-1 min-w-0">플랜 변경은 어떻게 하나요?</span>
              </h3>
              <p className="text-white/60 text-sm pl-8 leading-relaxed font-light">
                멤버십 관리 페이지에서 언제든 업그레이드하거나 다운그레이드할 수 있습니다.
              </p>
            </div>

            <div>
              <h3 className="font-light text-white mb-2 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 bg-primary/20 text-primary flex items-center justify-center text-xs font-medium rounded-lg flex-shrink-0">
                  Q
                </span>
                <span className="flex-1 min-w-0">일일 한도는 어떻게 계산되나요?</span>
              </h3>
              <p className="text-white/60 text-sm pl-8 leading-relaxed font-light">
                일일 부적 한도는 매일 자정(KST)에 리셋됩니다.
              </p>
            </div>

            <div>
              <h3 className="font-light text-white mb-2 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 bg-primary/20 text-primary flex items-center justify-center text-xs font-medium rounded-lg flex-shrink-0">
                  Q
                </span>
                <span className="flex-1 min-w-0">해지 후 부적은 어떻게 되나요?</span>
              </h3>
              <p className="text-white/60 text-sm pl-8 leading-relaxed font-light">
                해지해도 이미 충전된 부적은 그대로 유지되며, 부적 잔액은 영구 보존됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
