"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check, Crown, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBillingAuthUrl } from "@/app/actions/subscription-actions";

interface PricingCardProps {
    plan: {
        id: string;
        name: string;
        tier: string;
        price: number;
        description?: string | null;
        daily_talisman_limit?: number;
        relationship_limit?: number;
        storage_limit?: number;
    };
    features: string[];
    isRecommended?: boolean;
    theme: {
        badge: string;
        border: string;
        accent: string;
        button: string;
    };
}

export function PricingCard({ plan, features, isRecommended, theme }: PricingCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubscribe = async () => {
        setIsLoading(true);

        try {
            const result = await createBillingAuthUrl(plan.id);

            if (!result.success || !result.authUrl) {
                toast.error(result.error || "결제 준비에 실패했습니다.");
                return;
            }

            // Toss Payments 빌링키 발급 페이지로 이동
            if (process.env.NODE_ENV === "development") {
                // 개발 환경: Mock 처리
                toast.info("개발 환경: 테스트 결제를 진행합니다.");
                router.push(`/protected/membership/success?customerKey=${result.customerKey}&planId=${plan.id}&mock=true`);
            } else {
                // 프로덕션: Toss Payments로 이동
                window.location.href = result.authUrl;
            }

        } catch (error) {
            console.error("Subscribe error:", error);
            toast.error("오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card
            className={cn(
                "relative overflow-hidden bg-surface/30 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] border rounded-none",
                theme.border,
                isRecommended && "transform scale-105 md:scale-110 shadow-xl"
            )}
        >
            {/* Recommended Badge */}
            {isRecommended && (
                <div className="absolute top-0 right-0 bg-gradient-to-br from-primary via-primary to-primary-dark text-background px-4 py-1 text-xs font-bold flex items-center gap-1 shadow-md z-10">
                    <Star className="w-3 h-3 fill-current" />
                    추천
                </div>
            )}

            {/* Top Bar */}
            <div className={cn("h-2", isRecommended ? "bg-gradient-to-r from-primary via-primary-dark to-primary" : "bg-white/10")} />

            <div className="p-8">
                {/* Header */}
                <div className="mb-6">
                    <Badge className={cn("mb-3 rounded-none", theme.badge)}>
                        {plan.tier}
                    </Badge>
                    <h3 className="text-2xl font-serif font-bold text-ink-light mb-2">
                        {plan.name}
                    </h3>
                    <p className="text-sm text-ink/60">
                        {plan.description}
                    </p>
                </div>

                {/* Price */}
                <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-serif font-bold text-ink-light">
                            {plan.price.toLocaleString()}
                        </span>
                        <span className="text-lg text-ink/60">원</span>
                        <span className="text-ink/60 ml-1">/ 월</span>
                    </div>
                    {plan.tier === 'FAMILY' && (
                        <p className="text-xs text-primary mt-2">
                            ⭐ 가장 인기 있는 플랜
                        </p>
                    )}
                    {plan.tier === 'BUSINESS' && (
                        <p className="text-xs text-ink/40 mt-2">
                            💼 프로페셔널을 위한 선택
                        </p>
                    )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <Check className={cn("w-5 h-5 flex-shrink-0 mt-0.5", theme.accent)} />
                            <span className="text-sm text-ink-light">{feature}</span>
                        </li>
                    ))}
                </ul>

                {/* CTA Button */}
                <Button
                    onClick={handleSubscribe}
                    disabled={isLoading}
                    className={cn(
                        "w-full h-12 font-bold transition-all rounded-none",
                        theme.button,
                        isRecommended && "shadow-lg shadow-primary/30"
                    )}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            결제 준비 중...
                        </>
                    ) : (
                        <>
                            {isRecommended && <Crown className="w-4 h-4 mr-2" />}
                            {plan.tier === 'SINGLE' ? "시작하기" :
                                plan.tier === 'FAMILY' ? "가입하기" :
                                    "문의하기"}
                        </>
                    )}
                </Button>

                {/* Note */}
                <p className="text-xs text-ink/40 text-center mt-4">
                    언제든 해지 가능 · 위약금 없음
                </p>
            </div>
        </Card>
    );
}
