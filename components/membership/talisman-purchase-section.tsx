"use client";

import { useState } from "react";
import { getTossPayments } from "@/lib/services/tosspayments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Loader2, Ticket, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { addTestCredits } from "@/app/actions/products";
import type { PricePlan, UserRole } from "@/types/auth";

interface TalismanPurchaseSectionProps {
    initialPlans: PricePlan[];
    userRole: UserRole | string;
    memberId: string;
}

export function TalismanPurchaseSection({ initialPlans, userRole, memberId }: TalismanPurchaseSectionProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isTestLoading, setIsTestLoading] = useState(false);

    // Fallback plans if initial is empty
    const displayPlans = initialPlans.length > 0 ? initialPlans : [
        { credits: 3, price: 9900, name: "액막이 부적", description: "가장 기본적인 소원 성취 패키지", features: ["부적 3장", "정밀 분석 리포트", "영구 소장"], badge_text: null },
        { credits: 10, price: 29900, name: "소원 성취", description: "많은 분들이 선택하는 실속 패키지", badge_text: "가장 인기", features: ["부적 10장", "정밀 분석 리포트", "영구 소장", "커플/궁합 분석"] },
        { credits: 30, price: 79000, name: "만사 형통", description: "전문가 및 다인 분석 패키지", badge_text: "최저가", features: ["부적 30장", "VIP 우선 분석", "PDF 리포트 제공", "무제한 가족 등록"] },
    ];

    const sortedPlans = [...displayPlans].sort((a, b) => a.price - b.price);

    const handleTalismanPayment = async (plan: any) => {
        setIsLoading(true);
        try {
            const tossPayments = await getTossPayments();
            if (!tossPayments) {
                toast.error("결제 모듈을 불러올 수 없습니다.");
                setIsLoading(false);
                return;
            }

            await tossPayments.requestPayment("카드", {
                amount: plan.price,
                orderId: `HHD_${Date.now()}_${memberId.slice(0, 4)}`,
                orderName: plan.name || plan.label,
                successUrl: `${window.location.origin}/protected/analysis/success?memberId=${memberId}&credits=${plan.credits}`,
                failUrl: `${window.location.origin}/protected/analysis/fail`,
            });
        } catch (error: any) {
            toast.error(error.message || "결제 준비 중 오류가 발생했습니다.");
            setIsLoading(false);
        }
    };

    const handleTestCharge = async () => {
        setIsTestLoading(true);
        try {
            const result = await addTestCredits(100);
            if (result.success) {
                toast.success(`테스트 부적 100장 충전 완료!`);
                window.location.reload();
            } else {
                toast.error(result.error || "충전 실패");
            }
        } catch (error) {
            toast.error("시스템 오류");
        } finally {
            setIsTestLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-serif font-bold text-primary tracking-wide">부적 개별 충전</span>
                </div>
                <p className="text-sm text-white/60">
                    필요한 만큼만 충전하고 사용하세요
                </p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 gap-4">
                {sortedPlans.map((plan: any, index: number) => (
                    <Card
                        key={plan.credits}
                        className={cn(
                            "relative overflow-hidden border-2 transition-all duration-300",
                            plan.badge_text === "가장 인기"
                                ? "border-primary/50 bg-primary/5"
                                : "border-white/10 bg-surface/30",
                            "hover:border-primary/60 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                        )}
                    >
                        {/* Badge */}
                        {plan.badge_text && (
                            <div className="absolute top-4 right-4 z-10">
                                <div className="flex items-center gap-1 px-3 py-1 bg-primary text-background rounded-full text-xs font-bold">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span>{plan.badge_text}</span>
                                </div>
                            </div>
                        )}

                        <div className="p-6 space-y-6">
                            {/* Header */}
                            <div className="space-y-2">
                                <h3 className="text-2xl font-serif font-bold text-white">
                                    {plan.name || plan.label}
                                </h3>
                                <p className="text-sm text-white/70 leading-relaxed">
                                    {plan.description}
                                </p>
                            </div>

                            {/* Credits & Price */}
                            <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                                        <Ticket className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-white/50 mb-1">부적</div>
                                        <div className="text-xl font-bold text-white">{plan.credits}장</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-white/50 mb-1">결제 금액</div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-serif font-bold text-primary">
                                            {plan.price.toLocaleString()}
                                        </span>
                                        <span className="text-sm text-white/50">원</span>
                                    </div>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="space-y-3">
                                {(plan.features || []).map((feature: string, i: number) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-primary" />
                                        </div>
                                        <span className="text-sm text-white/90">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Button */}
                            <Button
                                onClick={() => handleTalismanPayment(plan)}
                                disabled={isLoading}
                                className={cn(
                                    "w-full h-14 text-base font-serif font-bold rounded-lg transition-all",
                                    plan.badge_text === "가장 인기"
                                        ? "bg-primary text-background hover:bg-primary/90 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]"
                                        : "bg-white/10 text-white border-2 border-white/20 hover:bg-white/20 hover:border-primary/50"
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-2" />
                                        지금 충전하기
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Tester/Admin Test Charge Button */}
            {(userRole === "admin" || userRole === "tester") && (
                <div className="border-2 border-dashed border-seal/30 bg-seal/5 rounded-xl p-6 text-center">
                    <p className="text-xs text-seal/70 mb-4 uppercase tracking-widest font-bold">Admin Zone</p>
                    <Button
                        onClick={handleTestCharge}
                        disabled={isTestLoading}
                        variant="ghost"
                        className="text-seal hover:text-seal-light hover:bg-seal/10 font-mono text-xs gap-2 border border-seal/30"
                    >
                        {isTestLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        DEVELOPER: ADD TEST 100 TALISMANS (NO CHARGE)
                    </Button>
                </div>
            )}
        </div>
    );
}
