"use client";

import { useState, useEffect } from "react";
import { getTossPayments } from "@/lib/tosspayments";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Sparkles, Loader2, Zap, ShieldCheck, Crown, Gift, Calendar, MessageCircle, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getActivePlans, getCurrentUserRole, addTestCredits } from "@/app/actions/products";
import { getMembershipPlans, createBillingAuthUrl, getSubscriptionStatus } from "@/app/actions/subscription-actions";
import type { PricePlan, UserRole } from "@/types/auth";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PaymentWidgetProps {
    memberId: string;
    homeAddress?: string;
    onCancel?: () => void;
}

interface DisplayPlan {
    id?: string;
    credits: number;
    price: number;
    label: string;
    description: string;
    badge?: string;
    features: string[];
    popular?: boolean;
}

export function PaymentWidget({ memberId, homeAddress, onCancel }: PaymentWidgetProps) {
    const [activeTab, setActiveTab] = useState<string>("membership");
    const [selectedPlan, setSelectedPlan] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isTestLoading, setIsTestLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [pricePlans, setPricePlans] = useState<DisplayPlan[]>([]);
    const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<UserRole>("user");
    const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
        loadData();
    }, []);

    async function loadData() {
        try {
            const [plansData, memberPlansData, roleData, statusData] = await Promise.all([
                getActivePlans(),
                getMembershipPlans(),
                getCurrentUserRole(),
                getSubscriptionStatus()
            ]);

            const displayPlans: DisplayPlan[] = plansData.map((plan: PricePlan) => ({
                credits: plan.credits,
                price: plan.price,
                label: plan.name,
                description: plan.description || "",
                badge: plan.badge_text || undefined,
                features: plan.features || [],
                popular: plan.badge_text === "가장 인기",
            }));

            setPricePlans(displayPlans);
            setMembershipPlans(memberPlansData);
            setUserRole(roleData.role);
            setSubscriptionStatus(statusData);

            if (statusData.isSubscribed) {
                setActiveTab("talisman");
            }
        } catch (error) {
            console.error("[PaymentWidget] Error loading data:", error);
            // Fallback plans if DB fails
            setPricePlans([
                { credits: 3, price: 9900, label: "액막이 부적", description: "가장 기본적인 소원 성취 패키지", features: ["부적 3장", "정밀 분석 리포트", "영구 소장"] },
                { credits: 10, price: 29900, label: "소원 성취", description: "많은 분들이 선택하는 실속 패키지", badge: "가장 인기", features: ["부적 10장", "정밀 분석 리포트", "영구 소장", "커플/궁합 분석"] },
                { credits: 30, price: 79000, label: "만사 형통", description: "전문가 및 다인 분석 패키지", badge: "최저가", features: ["부적 30장", "VIP 우선 분석", "PDF 리포트 제공", "무제한 가족 등록"] },
            ]);
        }
    }

    const handleMembershipPayment = async (planId: string) => {
        setIsLoading(true);
        try {
            const result = await createBillingAuthUrl(planId);
            if (!result.success || !result.authUrl) {
                toast.error(result.error || "구독 준비에 실패했습니다.");
                return;
            }

            if (process.env.NODE_ENV === "development") {
                toast.info("개발 환경: 테스트 결제 페이지로 이동합니다.");
                router.push(`/protected/membership/success?customerKey=${result.customerKey}&planId=${planId}&mock=true`);
            } else {
                window.location.href = result.authUrl;
            }
        } catch (error) {
            toast.error("구독 처리 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTalismanPayment = async () => {
        setIsLoading(true);
        try {
            const tossPayments = await getTossPayments();
            if (!tossPayments) {
                toast.error("결제 모듈을 불러올 수 없습니다.");
                setIsLoading(false);
                return;
            }
            const plan = pricePlans.find(p => p.credits === selectedPlan)!;

            await tossPayments.requestPayment("카드", {
                amount: plan.price,
                orderId: `HHD_${Date.now()}_${memberId.slice(0, 4)}`,
                orderName: plan.label,
                successUrl: `${window.location.origin}/protected/analysis/success?memberId=${memberId}&homeAddress=${encodeURIComponent(homeAddress || "")}&credits=${plan.credits}`,
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

    if (!isMounted) return null;

    return (
        <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">

            {/* Hybrid Info Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-zen-border rounded-sm shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-zen-gold" />
                    <span className="text-[10px] font-bold text-zen-muted uppercase tracking-[0.2em]">Haehwadang Hybrid Payment System</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-zen-text italic">운명을 여는 <span className="text-zen-wood">길(道)</span>의 선택</h2>
                <p className="text-zen-muted text-sm max-w-xl mx-auto leading-relaxed">
                    매달 전해지는 천기를 무제한으로 누리는 멤버십과 <br />
                    필요할 때마다 정성을 담아 사용하는 부적 패키지 중 선택해 주세요.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-16 bg-zen-bg border border-zen-border p-1 rounded-sm mb-10">
                    <TabsTrigger value="membership" className="font-serif font-bold text-lg data-[state=active]:bg-white data-[state=active]:text-zen-wood data-[state=active]:shadow-sm rounded-sm">
                        해화 멤버십 (Subscription)
                    </TabsTrigger>
                    <TabsTrigger value="talisman" className="font-serif font-bold text-lg data-[state=active]:bg-white data-[state=active]:text-zen-wood data-[state=active]:shadow-sm rounded-sm">
                        부적 충전소 (Store)
                    </TabsTrigger>
                </TabsList>

                {/* Membership Content */}
                <TabsContent value="membership" className="space-y-8 animate-in fade-in duration-500">
                    {membershipPlans.map((plan) => (
                        <Card key={plan.id} className="relative overflow-hidden border-zen-gold bg-white rounded-sm shadow-2xl p-8 md:p-12 border-t-8 border-t-zen-gold">
                            <div className="flex flex-col md:flex-row gap-12 items-center">
                                <div className="flex-1 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Crown className="w-8 h-8 text-zen-gold" />
                                            <h3 className="text-3xl font-serif font-bold text-zen-text">{plan.name}</h3>
                                            <Badge className="bg-zen-gold text-white font-bold px-3 py-1 rounded-sm">PREMIUM</Badge>
                                        </div>
                                        <p className="text-zen-muted leading-relaxed font-sans text-lg italic">"{plan.description}"</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            { icon: Gift, text: `매월 부적 ${plan.talismans_per_period}장 지급` },
                                            { icon: Sparkles, text: "오늘의 운세 무제한 열람" },
                                            { icon: MessageCircle, text: "매일 아침 행운 카톡 알림" },
                                            { icon: Calendar, text: "분석 비록 PDF 평생 소장" }
                                        ].map((benefit, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-zen-bg rounded-sm border border-zen-border/50">
                                                <benefit.icon className="w-4 h-4 text-zen-wood" />
                                                <span className="text-sm font-bold text-zen-text">{benefit.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="w-full md:w-80 flex flex-col items-center justify-center space-y-6 pt-10 md:pt-0 md:border-l md:border-zen-border md:pl-12">
                                    <div className="text-center">
                                        <div className="flex items-baseline justify-center gap-1">
                                            <span className="text-6xl font-serif font-bold text-zen-text">{plan.price.toLocaleString()}</span>
                                            <span className="text-xl text-zen-muted">원</span>
                                        </div>
                                        <p className="text-sm text-zen-muted mt-2 uppercase tracking-widest font-bold">Per Month</p>
                                    </div>
                                    <Button
                                        onClick={() => handleMembershipPayment(plan.id)}
                                        disabled={isLoading}
                                        className="w-full h-16 bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold text-xl rounded-sm shadow-xl transition-all active:scale-[0.98]"
                                    >
                                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "멤버십 구독 시작하기"}
                                    </Button>
                                    <p className="text-[10px] text-zen-muted italic text-center leading-relaxed">
                                        언제든 해지 가능하며, <br /> 위약금 없이 현재 기간 동안 혜택이 유지됩니다.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </TabsContent>

                {/* Talisman Content */}
                <TabsContent value="talisman" className="space-y-10 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {pricePlans.map((plan) => (
                            <Card
                                key={plan.credits}
                                className={cn(
                                    "relative flex flex-col p-8 cursor-pointer transition-all duration-300 overflow-hidden group border rounded-sm",
                                    selectedPlan === plan.credits
                                        ? "bg-white border-zen-wood shadow-xl scale-[1.02] ring-1 ring-zen-wood"
                                        : "bg-white/50 border-zen-border hover:border-zen-gold/50 shadow-sm hover:shadow-md"
                                )}
                                onClick={() => setSelectedPlan(plan.credits)}
                            >
                                {plan.badge && (
                                    <div className="absolute top-0 right-0">
                                        <div className={cn(
                                            "text-[10px] font-bold px-4 py-1.5 rounded-bl-sm uppercase tracking-wider",
                                            plan.popular ? "bg-zen-gold text-white" : "bg-zen-wood text-white"
                                        )}>
                                            {plan.badge}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6 flex-1">
                                    <div className="space-y-2">
                                        <div className="w-10 h-10 rounded-sm bg-zen-bg border border-zen-border flex items-center justify-center text-zen-gold mb-4 group-hover:scale-110 transition-transform">
                                            <Ticket className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-serif font-bold text-2xl text-zen-text italic">{plan.label}</h4>
                                        <p className="text-xs text-zen-muted font-sans leading-relaxed">{plan.description}</p>
                                    </div>

                                    <div className="flex items-baseline gap-1 py-4 border-y border-zen-border/50">
                                        <span className="text-4xl font-serif font-bold tabular-nums text-zen-text">{plan.price.toLocaleString()}</span>
                                        <span className="text-lg font-medium text-zen-muted">원</span>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        {plan.features.map((feature, i) => (
                                            <div key={i} className="flex items-start gap-3 text-[12px] text-zen-text/70 leading-relaxed font-sans">
                                                <Check className="w-4 h-4 text-zen-gold shrink-0 mt-0.5" />
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <div className="flex justify-center pt-4">
                        <Button
                            onClick={handleTalismanPayment}
                            disabled={isLoading}
                            className="w-full max-w-md h-16 rounded-sm bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold text-xl shadow-xl active:scale-[0.98] transition-all"
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-6 h-6" />
                                    <span>부적 {selectedPlan}장 충전하기</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Tester/Admin Test Charge Button */}
            {(userRole === "admin" || userRole === "tester") && (
                <div className="border-t border-zen-border pt-10 text-center">
                    <Button
                        onClick={handleTestCharge}
                        disabled={isTestLoading}
                        variant="ghost"
                        className="text-zen-muted hover:text-zen-wood hover:bg-zen-bg font-mono text-xs gap-2"
                    >
                        {isTestLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        DEVELOPER: ADD TEST 100 TALISMANS
                    </Button>
                </div>
            )}
        </div>
    );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
            {children}
        </span>
    );
}
