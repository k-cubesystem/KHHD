import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMembershipPlans, getSubscriptionStatus } from "@/app/actions/subscription-actions";
import { getActivePlans, getCurrentUserRole } from "@/app/actions/products";
import { MembershipTabs } from "@/components/membership/membership-tabs";
import { TalismanPurchaseSection } from "@/components/membership/talisman-purchase-section";
import { Crown, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function MembershipPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isGuest = !user;
    let isSubscribed = false;
    let subscription = null;
    let currentPlan = null;

    // 로그인 사용자만 구독 상태 확인
    if (user) {
        const subscriptionData = await getSubscriptionStatus();
        isSubscribed = subscriptionData.isSubscribed;
        subscription = subscriptionData.subscription;
        currentPlan = subscriptionData.plan;

        // 구독 중이면 관리 페이지로 (업그레이드/다운그레이드는 관리 페이지에서)
        if (isSubscribed && subscription) {
            return redirect("/protected/membership/manage?tab=subscription");
        }
    }

    const [plans, talismanPlans, userRoleData] = await Promise.all([
        getMembershipPlans(),
        getActivePlans(),
        getCurrentUserRole()
    ]);

    const userRole = userRoleData.role;

    // 등급별로 정렬 (SINGLE -> FAMILY -> BUSINESS)
    const sortedPlans = plans.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="max-w-[480px] mx-auto">

                {/* Back Link */}
                <Link
                    href="/protected"
                    className="inline-flex items-center gap-2 text-ink/60 hover:text-ink-light transition-colors mb-6 text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    대시보드로 돌아가기
                </Link>

                {/* Header */}
                <div className="text-center mb-8 space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-none">
                        <Crown className="w-4 h-4 text-primary" />
                        <span className="text-primary font-serif font-bold text-xs">Premium Membership</span>
                    </div>

                    <h1 className="text-xl font-serif font-bold text-ink-light">
                        지금 시작하고, 혜택을 받으세요!
                    </h1>

                    <p className="text-ink/60 text-xs leading-relaxed">
                        1분이면 가입 완료됩니다.
                    </p>
                </div>

                {/* Guest Notice */}
                {isGuest && (
                    <div className="bg-primary/10 border border-primary/30 p-4 mb-6 text-center">
                        <p className="text-ink-light mb-2">
                            <span className="font-serif font-bold text-sm">무료로 시작하세요!</span>
                        </p>
                        <p className="text-xs text-ink/70 leading-relaxed">
                            회원가입 후 모든 플랜을 선택하실 수 있습니다.
                        </p>
                    </div>
                )}

                {/* Membership Tabs - 새로운 탭 UI */}
                <MembershipTabs plans={sortedPlans} isGuest={isGuest} />

                {/* Talisman Top-up Section */}
                <div className="mt-10">
                    <TalismanPurchaseSection initialPlans={talismanPlans} userRole={userRole} memberId={user?.id || ""} />
                </div>

                {/* Common Benefits */}
                <div className="bg-surface/30 backdrop-blur-sm border border-primary/20 p-5 mb-6 shadow-lg rounded-none mt-8 luxury-card-glow paper-grain">
                    <h2 className="text-base font-serif font-bold text-white text-center mb-4">
                        모든 플랜 공통 혜택
                    </h2>
                    <div className="space-y-3">
                        {[
                            { title: "언제든 해지 가능", desc: "위약금 없이 자유롭게" },
                            { title: "즉시 부적 지급", desc: "결제 완료 즉시 충전" },
                            { title: "자동 결제", desc: "매월 걱정 없이 충전" },
                            {
                                title: "부적 추가 증정",
                                desc: `${sortedPlans.length > 0 && sortedPlans[0]?.features
                                    ? (sortedPlans[0].features as any).bonus_rate || 10
                                    : 10}% 보너스`
                            }
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="w-7 h-7 bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 rounded-none">
                                    <Check className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-white text-xs mb-0.5">{item.title}</h3>
                                    <p className="text-[10px] text-white/70">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-surface/30 backdrop-blur-sm border border-primary/20 p-5 mb-24 rounded-none">
                    <h2 className="text-base font-serif font-bold text-ink-light mb-4">
                        자주 묻는 질문
                    </h2>
                    <div className="space-y-3">
                        <div>
                            <h3 className="font-bold text-ink-light mb-1 flex items-center gap-2 text-xs">
                                <span className="w-4 h-4 bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold rounded-none">Q</span>
                                플랜 변경은 어떻게 하나요?
                            </h3>
                            <p className="text-ink/60 text-[10px] pl-6 leading-relaxed">
                                멤버십 관리 페이지에서 언제든 업그레이드하거나 다운그레이드할 수 있습니다.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-ink-light mb-1 flex items-center gap-2 text-xs">
                                <span className="w-4 h-4 bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold rounded-none">Q</span>
                                일일 한도는 어떻게 계산되나요?
                            </h3>
                            <p className="text-ink/60 text-[10px] pl-6 leading-relaxed">
                                일일 부적 한도는 매일 자정(KST)에 리셋됩니다.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-ink-light mb-1 flex items-center gap-2 text-xs">
                                <span className="w-4 h-4 bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold rounded-none">Q</span>
                                해지 후 부적은 어떻게 되나요?
                            </h3>
                            <p className="text-ink/60 text-[10px] pl-6 leading-relaxed">
                                해지해도 이미 충전된 부적은 그대로 유지되며, 부적 잔액은 영구 보존됩니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
