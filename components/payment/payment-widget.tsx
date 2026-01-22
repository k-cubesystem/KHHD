"use client";

import { useState, useEffect } from "react";
import { getTossPayments } from "@/lib/tosspayments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getActivePlans, getCurrentUserRole, addTestCredits } from "@/app/actions/products";
import type { PricePlan, UserRole } from "@/types/auth";

interface PaymentWidgetProps {
    memberId: string;
    homeAddress?: string;
    onCancel?: () => void;
}

interface DisplayPlan {
    credits: number;
    price: number;
    label: string;
    description: string;
    badge?: string;
    features: string[];
    popular?: boolean;
}

export function PaymentWidget({ memberId, homeAddress, onCancel }: PaymentWidgetProps) {
    const [selectedPlan, setSelectedPlan] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isTestLoading, setIsTestLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [plans, setPlans] = useState<DisplayPlan[]>([]);
    const [userRole, setUserRole] = useState<UserRole>("user");

    useEffect(() => {
        setIsMounted(true);
        loadData();
    }, []);

    async function loadData() {
        try {
            // Load plans and user role in parallel
            const [plansData, roleData] = await Promise.all([
                getActivePlans(),
                getCurrentUserRole(),
            ]);

            // Transform DB plans to display format
            const displayPlans: DisplayPlan[] = plansData.map((plan: PricePlan) => ({
                credits: plan.credits,
                price: plan.price,
                label: plan.name,
                description: plan.description || "",
                badge: plan.badge_text || undefined,
                features: plan.features || [],
                popular: plan.badge_text === "가장 인기",
            }));

            setPlans(displayPlans);
            setUserRole(roleData.role);
        } catch (error) {
            console.error("[PaymentWidget] Error loading data:", error);
            // Fallback to hardcoded plans
            setPlans([
                {
                    credits: 1,
                    price: 9900,
                    label: "운명 분석 1회",
                    description: "가장 기본적인 분석 패키지",
                    features: ["프리미엄 AI 리포트", "천지인 통합 분석", "영구 소장 가능"]
                },
                {
                    credits: 3,
                    price: 24900,
                    label: "운명 분석 3회",
                    description: "인연들과 함께 나누는 실속형",
                    badge: "가장 인기",
                    features: ["1회당 8,300원 (16% 할인)", "프리미엄 AI 리포트", "가족/친구 분석 최적화", "영구 소장 가능"],
                    popular: true
                },
                {
                    credits: 5,
                    price: 39900,
                    label: "운명 분석 5회",
                    description: "가장 합리적인 대용량 패키지",
                    badge: "최저가",
                    features: ["1회당 7,980원 (20% 할인)", "프리미엄 AI 리포트", "무제한 인연 분석", "영구 소장 가능", "분석 비록 우선 생성"]
                },
            ]);
        }
    }

    const isPrivileged = userRole === "admin" || userRole === "tester";

    const handleTestCharge = async () => {
        setIsTestLoading(true);
        try {
            const result = await addTestCredits(100);
            if (result.success) {
                toast.success(`테스트 크레딧 100 충전 완료! (잔액: ${result.newBalance})`);
            } else {
                toast.error(result.error || "충전 실패");
            }
        } catch (error) {
            toast.error("테스트 충전 중 오류가 발생했습니다.");
        } finally {
            setIsTestLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!isMounted) return;

        setIsLoading(true);
        try {
            const tossPayments = await getTossPayments();
            if (!tossPayments) {
                toast.error("결제 모듈을 불러올 수 없습니다.");
                setIsLoading(false);
                return;
            }
            const plan = plans.find(p => p.credits === selectedPlan)!;

            // 결제 요청 (금액은 서버에서 검증됨)
            await tossPayments.requestPayment("카드", {
                amount: plan.price,
                orderId: `HHD_${Date.now()}_${memberId.slice(0, 4)}`,
                orderName: plan.label,
                successUrl: `${window.location.origin}/protected/analysis/success?memberId=${memberId}&homeAddress=${encodeURIComponent(homeAddress || "")}&credits=${plan.credits}`,
                failUrl: `${window.location.origin}/protected/analysis/fail`,
            });
        } catch (error: any) {
            console.error("[Payment] Widget Error:", error);
            toast.error(error.message || "결제 준비 중 오류가 발생했습니다.");
            setIsLoading(false);
        }
    };

    if (!isMounted) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-black bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">분석 크레딧 충전</h3>
                <p className="text-sm text-muted-foreground">해화당 AI의 깊은 통찰을 경험하기 위한 크레딧을 선택해 주세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <Card
                        key={plan.credits}
                        className={cn(
                            "relative flex flex-col p-6 cursor-pointer transition-all duration-500 overflow-hidden group border-white/5",
                            selectedPlan === plan.credits
                                ? "bg-primary/10 border-primary/40 shadow-[0_0_30px_rgba(var(--primary),0.15)] ring-1 ring-primary/50"
                                : "bg-white/5 hover:bg-white/10 hover:border-white/20"
                        )}
                        onClick={() => setSelectedPlan(plan.credits)}
                    >
                        {plan.badge && (
                            <div className="absolute top-0 right-0">
                                <div className="bg-primary text-primary-foreground text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                                    {plan.badge}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 flex-1">
                            <div className="space-y-1">
                                <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{plan.label}</h4>
                                <p className="text-xs text-muted-foreground">{plan.description}</p>
                            </div>

                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black tabular-nums">{plan.price.toLocaleString()}</span>
                                <span className="text-sm font-medium text-muted-foreground">원</span>
                            </div>

                            <div className="space-y-2">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground/80">
                                        <Check className="w-3 h-3 text-primary shrink-0" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedPlan === plan.credits && (
                            <div className="absolute inset-0 border-2 border-primary/50 rounded-xl pointer-events-none" />
                        )}

                        {/* Shimmer effect for selected */}
                        {selectedPlan === plan.credits && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
                        )}
                    </Card>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                {onCancel && (
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 h-14 rounded-2xl hover:bg-white/5 text-muted-foreground"
                    >
                        돌아가기
                    </Button>
                )}
                <Button
                    onClick={handlePayment}
                    disabled={isLoading}
                    className="flex-[2] h-14 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all group active:scale-95"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            <span>연결 중...</span>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                            <span>천기 누설 시작하기</span>
                        </div>
                    )}
                </Button>
            </div>

            {/* Tester/Admin Test Charge Button */}
            {isPrivileged && (
                <div className="border-t border-white/10 pt-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-yellow-400 font-medium">
                            {userRole === "admin" ? "관리자" : "테스터"} 전용
                        </span>
                    </div>
                    <Button
                        onClick={handleTestCharge}
                        disabled={isTestLoading}
                        variant="outline"
                        className="w-full h-12 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                    >
                        {isTestLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                충전 중...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4 mr-2" />
                                무료 테스트 크레딧 +100 충전
                            </>
                        )}
                    </Button>
                </div>
            )}

            <div className="text-center">
                <p className="text-[10px] text-muted-foreground/40 leading-loose">
                    결제 전 이용약관 및 개인정보 처리방침을 확인해 주세요.<br />
                    디지털 콘텐츠 특성상 분석 시작 후에는 환불이 불가능합니다.
                </p>
            </div>
        </div>
    );
}
