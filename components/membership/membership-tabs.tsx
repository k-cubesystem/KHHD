"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Plan {
    id: string;
    name: string;
    tier: string;
    price_krw: number;
    billing_period: string;
    daily_talisman_limit: number;
    relationship_limit: number;
    storage_limit: number;
    talismans_per_period: number;
    features: Record<string, boolean | number>;
}

interface MembershipTabsProps {
    plans: Plan[];
    isGuest: boolean;
}

export function MembershipTabs({ plans, isGuest }: MembershipTabsProps) {
    const router = useRouter();

    // 플랜이 없으면 에러 방지
    if (!plans || plans.length === 0) {
        return (
            <div className="text-center p-8 text-ink/60">
                <p className="text-sm">멤버십 플랜을 불러오는 중입니다...</p>
            </div>
        );
    }

    const [selectedPlan, setSelectedPlan] = useState(plans[1]?.tier || plans[0]?.tier || "FAMILY");

    const currentPlan = plans.find(p => p.tier === selectedPlan) || plans[0];

    // currentPlan이 없으면 에러 방지
    if (!currentPlan) {
        return (
            <div className="text-center p-8 text-ink/60">
                <p className="text-sm">플랜 정보를 찾을 수 없습니다.</p>
            </div>
        );
    }

    const features = currentPlan.features as Record<string, boolean | number> || {};

    // 등급별 특징 정리
    const tierFeatures: string[] = [];
    tierFeatures.push(`일일 부적 ${currentPlan.daily_talisman_limit}개`);
    tierFeatures.push(`인연 ${currentPlan.relationship_limit}명 등록`);
    tierFeatures.push(`결과 ${currentPlan.storage_limit === 999 ? '무제한' : currentPlan.storage_limit + '개'} 저장`);
    tierFeatures.push(`매월 부적 ${currentPlan.talismans_per_period}장 지급`);

    if (features.daily_fortune) tierFeatures.push("오늘의 운세 무제한");
    if (features.ai_shaman) tierFeatures.push("AI 신당 채팅");
    if (features.kakao_daily) tierFeatures.push("카카오톡 매일 운세 알림");
    if (features.pdf_archive) tierFeatures.push("PDF 결과 영구 보관");

    // 등급별 추가 특징
    if (currentPlan.tier === 'FAMILY') {
        tierFeatures.push("가족 궁합 매트릭스");
        tierFeatures.push("인연 네트워크 시각화");
    }

    if (currentPlan.tier === 'BUSINESS') {
        tierFeatures.push("가족 궁합 매트릭스");
        tierFeatures.push("인연 네트워크 시각화");
        tierFeatures.push("API 접근 (예정)");
        tierFeatures.push("우선 지원");
        tierFeatures.push("맞춤형 리포트");
    }

    const handleSelectPlan = () => {
        if (isGuest) {
            router.push("/auth/login");
        } else {
            router.push(`/protected/membership/checkout?plan=${currentPlan.id}`);
        }
    };

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-surface/50 border border-primary/20 rounded-none">
                {plans.map((plan) => (
                    <button
                        key={plan.tier}
                        onClick={() => setSelectedPlan(plan.tier)}
                        className={`flex-1 py-2.5 px-3 text-xs font-serif font-bold transition-all rounded-none ${selectedPlan === plan.tier
                            ? 'bg-primary text-background shadow-md'
                            : 'text-ink/60 hover:text-ink-light'
                            }`}
                    >
                        {plan.name}
                    </button>
                ))}
            </div>

            {/* Selected Plan Card */}
            <div className="bg-surface/30 border-2 border-primary/30 p-6 rounded-none shadow-lg luxury-card-glow">
                {/* Price */}
                <div className="text-center mb-6 pb-6 border-b border-primary/10">
                    <div className="text-3xl font-serif font-bold text-primary mb-1">
                        월 {(currentPlan.price || 0).toLocaleString()}원{" "}
                        <span className="text-sm text-ink/50">결제</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-xs text-ink/60">
                            {currentPlan.tier === 'FAMILY' ? '가장 인기있는 플랜' : currentPlan.tier === 'BUSINESS' ? '프리미엄' : '기본 플랜'}
                        </span>
                    </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                    <div className="text-xs font-serif font-bold text-primary mb-3">
                        • 멤버십 회원만 누리는 특별 혜택!
                    </div>
                    {tierFeatures.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <div className="w-1 h-1 bg-primary/60 rounded-full mt-1.5 flex-shrink-0" />
                            <span className="text-xs text-ink-light leading-relaxed">{feature}</span>
                        </div>
                    ))}
                </div>

                {/* CTA Button */}
                <Button
                    onClick={handleSelectPlan}
                    className="w-full bg-primary hover:bg-primary/90 text-background font-serif font-bold h-12 rounded-none"
                >
                    {isGuest ? '로그인하고 시작하기' : '지금 시작하기'}
                </Button>

                {/* Additional Info */}
                {currentPlan.tier === 'FAMILY' && (
                    <div className="mt-4 text-center">
                        <p className="text-[10px] text-ink/50">
                            ⭐ 가족 구성원 관리와 궁합 분석에 최적화된 플랜
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
