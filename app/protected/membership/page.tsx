import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMembershipPlans, getSubscriptionStatus } from "@/app/actions/subscription-actions";
import { getActivePlans, getCurrentUserRole } from "@/app/actions/products";
import { PricingCard } from "@/components/membership/pricing-card";
import { TalismanPurchaseSection } from "@/components/membership/talisman-purchase-section";
import { Crown, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
                <div className="text-center mb-10 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-none">
                        <Crown className="w-4 h-4 text-primary" />
                        <span className="text-primary font-serif font-bold text-xs">Premium Membership</span>
                    </div>

                    <h1 className="text-2xl font-serif font-bold text-ink-light">
                        당신에게 맞는 플랜을 선택하세요
                    </h1>

                    <p className="text-ink/60 text-sm leading-relaxed">
                        싱글부터 비즈니스까지, 모든 이에게 맞는 멤버십을 준비했습니다.
                        언제든 업그레이드하거나 해지할 수 있습니다.
                    </p>
                </div>

                {/* Guest Notice */}
                {isGuest && (
                    <div className="bg-primary/10 border border-primary/30 p-4 mb-8 text-center">
                        <p className="text-ink-light mb-2">
                            <span className="font-serif font-bold text-base">무료로 시작하세요!</span>
                        </p>
                        <p className="text-xs text-ink/70 leading-relaxed">
                            회원가입 후 모든 플랜을 선택하실 수 있습니다. 가입은 무료이며, 원하는 플랜을 선택하여 업그레이드할 수 있습니다.
                        </p>
                    </div>
                )}

                {/* Pricing Cards - 수직 스택 */}
                <div className="space-y-4 mb-10">
                    {sortedPlans.map((plan, index) => {
                        const isRecommended = plan.tier === 'FAMILY';
                        const features = plan.features as Record<string, boolean | number> || {};

                        // 등급별 특징 정리
                        const tierFeatures: string[] = [];

                        // 공통 특징
                        tierFeatures.push(`일일 부적 ${plan.daily_talisman_limit}개`);
                        tierFeatures.push(`인연 ${plan.relationship_limit}명 등록`);
                        tierFeatures.push(`결과 ${plan.storage_limit === 999 ? '무제한' : plan.storage_limit + '개'} 저장`);
                        tierFeatures.push(`매월 부적 ${plan.talismans_per_period}장 지급`);

                        if (features.daily_fortune) tierFeatures.push("오늘의 운세 무제한");
                        if (features.ai_shaman) tierFeatures.push("AI 신당 채팅");
                        if (features.kakao_daily) tierFeatures.push("카카오톡 매일 운세 알림");
                        if (features.pdf_archive) tierFeatures.push("PDF 결과 영구 보관");

                        // 등급별 추가 특징
                        if (plan.tier === 'FAMILY') {
                            tierFeatures.push("가족 궁합 매트릭스");
                            tierFeatures.push("인연 네트워크 시각화");
                        }

                        if (plan.tier === 'BUSINESS') {
                            tierFeatures.push("가족 궁합 매트릭스");
                            tierFeatures.push("인연 네트워크 시각화");
                            tierFeatures.push("API 접근 (예정)");
                            tierFeatures.push("우선 지원");
                            tierFeatures.push("맞춤형 리포트");
                        }

                        // 등급별 색상 테마 (V2 Design System)
                        const tierTheme = {
                            SINGLE: {
                                badge: "bg-surface text-ink/60 border-white/10",
                                border: "border-white/10 hover:border-white/30",
                                accent: "text-ink/40",
                                button: "bg-surface border border-white/10 hover:bg-white/5 text-ink-light"
                            },
                            FAMILY: {
                                badge: "bg-primary/20 text-primary border-primary/50",
                                border: "border-primary/50 shadow-xl shadow-primary/10",
                                accent: "text-primary",
                                button: "bg-primary hover:bg-primary/90 text-background font-bold"
                            },
                            BUSINESS: {
                                badge: "bg-ink-950 text-primary-dim border-primary/30",
                                border: "border-primary/20 hover:border-primary/50",
                                accent: "text-primary-dim",
                                button: "bg-primary-dark hover:bg-primary-dark/90 text-white"
                            }
                        }[plan.tier as 'SINGLE' | 'FAMILY' | 'BUSINESS'];

                        return (
                            <PricingCard
                                key={plan.id}
                                plan={plan}
                                features={tierFeatures}
                                isRecommended={isRecommended}
                                theme={tierTheme}
                                isGuest={isGuest}
                            />
                        );
                    })}
                </div>

                {/* Talisman Top-up Section */}
                <TalismanPurchaseSection initialPlans={talismanPlans} userRole={userRole} memberId={user?.id || ""} />

                {/* Common Benefits */}
                <div className="bg-surface/30 backdrop-blur-sm border border-primary/20 p-6 mb-8 shadow-lg rounded-none">
                    <h2 className="text-lg font-serif font-bold text-ink-light text-center mb-6">
                        모든 플랜 공통 혜택
                    </h2>
                    <div className="space-y-4">
                        {[
                            { title: "언제든 해지 가능", desc: "위약금 없이 자유롭게" },
                            { title: "즉시 부적 지급", desc: "결제 완료 즉시 충전" },
                            { title: "자동 결제", desc: "매월 걱정 없이 충전" },
                            { title: "부적 추가 증정", desc: `${sortedPlans[0]?.features?.bonus_rate || 10}% 보너스` }
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 rounded-none">
                                    <Check className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-ink-light text-sm mb-0.5">{item.title}</h3>
                                    <p className="text-xs text-ink/60">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-surface/30 backdrop-blur-sm border border-primary/20 p-6 mb-24 rounded-none">
                    <h2 className="text-lg font-serif font-bold text-ink-light mb-6">
                        자주 묻는 질문
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-ink-light mb-1.5 flex items-center gap-2 text-sm">
                                <span className="w-5 h-5 bg-primary/20 text-primary flex items-center justify-center text-xs font-bold rounded-none">Q</span>
                                플랜 변경은 어떻게 하나요?
                            </h3>
                            <p className="text-ink/60 text-xs pl-7 leading-relaxed">
                                멤버십 관리 페이지에서 언제든 업그레이드하거나 다운그레이드할 수 있습니다. 업그레이드 시 차액만 결제되며, 다운그레이드는 다음 결제일부터 적용됩니다.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-ink-light mb-1.5 flex items-center gap-2 text-sm">
                                <span className="w-5 h-5 bg-primary/20 text-primary flex items-center justify-center text-xs font-bold rounded-none">Q</span>
                                일일 한도는 어떻게 계산되나요?
                            </h3>
                            <p className="text-ink/60 text-xs pl-7 leading-relaxed">
                                일일 부적 한도는 매일 자정(KST)에 리셋됩니다. 사용하지 않은 한도는 이월되지 않으며, 매월 지급되는 부적은 별도로 적립됩니다.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-ink-light mb-1.5 flex items-center gap-2 text-sm">
                                <span className="w-5 h-5 bg-primary/20 text-primary flex items-center justify-center text-xs font-bold rounded-none">Q</span>
                                해지 후 부적은 어떻게 되나요?
                            </h3>
                            <p className="text-ink/60 text-xs pl-7 leading-relaxed">
                                해지해도 이미 충전된 부적은 그대로 유지되며, 결제 기간이 끝날 때까지 멤버십 혜택을 이용할 수 있습니다. 부적 잔액은 영구 보존됩니다.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-ink-light mb-1.5 flex items-center gap-2 text-sm">
                                <span className="w-5 h-5 bg-primary/20 text-primary flex items-center justify-center text-xs font-bold rounded-none">Q</span>
                                Business 플랜의 API는 언제 제공되나요?
                            </h3>
                            <p className="text-ink/60 text-xs pl-7 leading-relaxed">
                                API 접근 기능은 곧 출시 예정입니다. Business 플랜 구독자께는 베타 테스트 참여 기회가 우선 제공됩니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
