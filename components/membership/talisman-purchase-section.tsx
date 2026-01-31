"use client";

import { useState } from "react";
import { getTossPayments } from "@/lib/tosspayments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Loader2, Crown, Ticket, Zap } from "lucide-react";
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
        <div className="space-y-6 mb-24 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            {/* Divider Title */}
            <div className="flex items-center gap-4 mb-8">
                <div className="h-px bg-primary/20 flex-1" />
                <div className="flex items-center gap-2 text-primary/80">
                    <Sparkles className="w-5 h-5" strokeWidth={1} />
                    <span className="text-lg font-serif font-bold tracking-widest">부적 개별 충전</span>
                    <Sparkles className="w-5 h-5" strokeWidth={1} />
                </div>
                <div className="h-px bg-primary/20 flex-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sortedPlans.map((plan: any) => (
                    <Card
                        key={plan.credits}
                        className={cn(
                            "relative flex flex-col transition-all duration-300 overflow-hidden group border rounded-none bg-surface/10 hover:shadow-2xl hover:border-primary/50 border-primary/20 backdrop-blur-sm"
                        )}
                    >
                        {plan.badge_text && (
                            <div className="absolute top-0 right-0 z-10">
                                <div className={cn(
                                    "text-[10px] font-bold px-3 py-1 uppercase tracking-wider",
                                    plan.badge_text === "가장 인기" ? "bg-primary text-background" : "bg-seal text-white"
                                )}>
                                    {plan.badge_text}
                                </div>
                            </div>
                        )}

                        <div className="p-6 flex-1 space-y-4">
                            <div className="space-y-1">
                                <h4 className="font-serif font-bold text-xl text-ink-light group-hover:text-primary transition-colors">{plan.name || plan.label}</h4>
                                <p className="text-xs text-ink/60 font-sans line-clamp-2 min-h-[2.5em]">{plan.description}</p>
                            </div>

                            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                        <Ticket className="w-4 h-4" strokeWidth={1.5} />
                                    </div>
                                    <span className="font-bold text-ink-light">{plan.credits}장</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-serif font-bold text-ink-light">{plan.price.toLocaleString()}</span>
                                    <span className="text-xs text-ink/50">원</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {(plan.features || []).slice(0, 3).map((feature: string, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px] text-ink/70">
                                        <Check className="w-3 h-3 text-primary shrink-0" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-white/5">
                            <Button
                                onClick={() => handleTalismanPayment(plan)}
                                disabled={isLoading}
                                className="w-full bg-surface border border-primary/30 text-ink-light hover:bg-primary hover:text-background hover:border-primary font-serif font-bold h-10 transition-all rounded-sm"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "충전하기"}
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Tester/Admin Test Charge Button */}
            {(userRole === "admin" || userRole === "tester") && (
                <div className="border-t border-dashed border-primary/20 pt-8 text-center bg-seal/5 p-4 rounded-sm border-seal/20">
                    <p className="text-[10px] text-seal/70 mb-2 uppercase tracking-widest font-bold">Admin Zone</p>
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
