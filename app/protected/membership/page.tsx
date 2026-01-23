import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMembershipPlans, getSubscriptionStatus } from "@/app/actions/subscription-actions";
import { MembershipCard } from "@/components/membership/membership-card";
import { Crown, Sparkles, Check, Gift, Calendar, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function MembershipPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    const { isSubscribed, subscription, plan: currentPlan } = await getSubscriptionStatus();
    const plans = await getMembershipPlans();

    // 이미 구독 중이면 관리 페이지로
    if (isSubscribed && subscription) {
        return redirect("/protected/membership/manage");
    }

    const defaultPlan = plans[0];

    const benefits = [
        {
            icon: Gift,
            title: "매월 부적 10장 지급",
            description: "30,000원 상당의 부적을 매월 자동 충전"
        },
        {
            icon: Sparkles,
            title: "오늘의 운세 무제한",
            description: "매일 아침 맞춤형 운세를 확인하세요"
        },
        {
            icon: MessageCircle,
            title: "카카오톡 알림",
            description: "오늘의 행운 컬러와 시간을 매일 발송"
        },
        {
            icon: Calendar,
            title: "분석 결과 영구 보관",
            description: "모든 분석 결과를 PDF로 평생 소장"
        }
    ];

    return (
        <div className="min-h-screen py-12 px-4 md:px-6 bg-zen-bg animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="text-center mb-12 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-zen-gold/10 border border-zen-gold/30 rounded-sm">
                        <Crown className="w-5 h-5 text-zen-gold" />
                        <span className="text-zen-gold font-serif font-bold">Premium Membership</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-zen-text">
                        해화 멤버십
                    </h1>
                    <p className="text-zen-muted text-lg max-w-xl mx-auto">
                        매일 아침, 당신의 운명을 확인하세요.<br />
                        멤버십 회원만을 위한 특별한 혜택을 누리세요.
                    </p>
                </div>

                {/* Main Card */}
                {defaultPlan && (
                    <div className="bg-white border border-zen-border rounded-sm shadow-lg overflow-hidden mb-12">
                        {/* Gold Bar */}
                        <div className="h-2 bg-gradient-to-r from-zen-gold/60 via-zen-gold to-zen-gold/60" />

                        <div className="p-8 md:p-12">
                            {/* Price Section */}
                            <div className="text-center mb-10 pb-10 border-b border-zen-border">
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-5xl md:text-6xl font-serif font-bold text-zen-text">
                                        {defaultPlan.price.toLocaleString()}
                                    </span>
                                    <span className="text-xl text-zen-muted">원</span>
                                    <span className="text-zen-muted ml-2">/ 월</span>
                                </div>
                                <p className="mt-3 text-zen-muted">
                                    언제든 해지 가능 · 위약금 없음
                                </p>
                            </div>

                            {/* Benefits Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                {benefits.map((benefit, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-4 p-4 bg-zen-bg/50 rounded-sm border border-zen-border/50"
                                    >
                                        <div className="flex-shrink-0 w-10 h-10 bg-zen-wood/10 rounded-sm flex items-center justify-center">
                                            <benefit.icon className="w-5 h-5 text-zen-wood" />
                                        </div>
                                        <div>
                                            <h3 className="font-serif font-bold text-zen-text mb-1">
                                                {benefit.title}
                                            </h3>
                                            <p className="text-sm text-zen-muted">
                                                {benefit.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Feature List */}
                            <div className="bg-zen-bg/30 rounded-sm p-6 mb-10">
                                <h3 className="font-serif font-bold text-zen-text mb-4">
                                    멤버십 특전
                                </h3>
                                <ul className="space-y-3">
                                    {[
                                        "매월 부적 10장 자동 충전 (정가 30,000원)",
                                        "오늘의 운세 무제한 열람 (비회원 잠금)",
                                        "매일 카카오톡 알림 (행운 컬러/시간)",
                                        "모든 분석 결과 PDF 평생 보관",
                                        "단건 구매 시 10% 추가 부적 증정"
                                    ].map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-zen-wood flex-shrink-0 mt-0.5" />
                                            <span className="text-zen-text">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* CTA Button */}
                            <MembershipCard planId={defaultPlan.id} planName={defaultPlan.name} price={defaultPlan.price} />
                        </div>
                    </div>
                )}

                {/* FAQ Section */}
                <div className="bg-white border border-zen-border rounded-sm p-8">
                    <h2 className="font-serif font-bold text-xl text-zen-text mb-6">
                        자주 묻는 질문
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-zen-text mb-2">결제는 언제 이루어지나요?</h3>
                            <p className="text-zen-muted text-sm">
                                첫 결제는 가입 즉시 이루어지며, 이후 매월 같은 날짜에 자동 결제됩니다.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-bold text-zen-text mb-2">해지는 어떻게 하나요?</h3>
                            <p className="text-zen-muted text-sm">
                                멤버십 관리 페이지에서 언제든 해지할 수 있습니다. 해지 후에도 결제 기간 종료까지 혜택을 이용할 수 있습니다.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-bold text-zen-text mb-2">부적은 언제 지급되나요?</h3>
                            <p className="text-zen-muted text-sm">
                                결제 완료 즉시 부적 10장이 지급되며, 매월 결제일에 자동으로 충전됩니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Back Link */}
                <div className="text-center mt-8">
                    <Link href="/protected" className="text-zen-muted hover:text-zen-wood transition-colors">
                        ← 대시보드로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    );
}
