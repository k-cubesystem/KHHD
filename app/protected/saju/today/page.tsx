"use client";

import { useState, useEffect } from "react";
import { Sun, Calendar, TrendingUp, Star, Heart, Briefcase, Activity, Loader2, RefreshCw, Palette, Hash, Sparkles, Crown, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTodayFortune } from "@/app/actions/ai-saju";
import { getFamilyMembers } from "@/app/actions/family-actions";
import { getSubscriptionStatus } from "@/app/actions/subscription-actions";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface FortuneData {
    overall: { score: number; message: string };
    love: { score: number; message: string };
    money: { score: number; message: string };
    career: { score: number; message: string };
    health: { score: number; message: string };
    luckyColor: string;
    luckyNumber: number;
    advice: string;
}

interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    birth_date: string;
    birth_time: string | null;
    calendar_type: string;
    gender: string;
}

export default function TodayFortunePage() {
    const [fortune, setFortune] = useState<FortuneData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [myProfile, setMyProfile] = useState<FamilyMember | null>(null);
    const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
    const [checkingSubscription, setCheckingSubscription] = useState(true);

    const today = new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long"
    });

    useEffect(() => {
        loadMyProfile();
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        try {
            const { isSubscribed: subscribed } = await getSubscriptionStatus();
            setIsSubscribed(subscribed);
        } catch (error) {
            console.error("Failed to check subscription:", error);
            setIsSubscribed(false);
        } finally {
            setCheckingSubscription(false);
        }
    };

    const loadMyProfile = async () => {
        const members = await getFamilyMembers();
        const me = members.find((m: FamilyMember) => m.relationship === "본인");
        if (me) {
            setMyProfile(me);
        }
    };

    const handleGetFortune = async () => {
        if (!myProfile) {
            setError("먼저 가족 관리에서 본인 정보를 등록해주세요.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await getTodayFortune(myProfile.birth_date);

            if (result.success && result.fortune) {
                setFortune(result.fortune);
            } else {
                setError(result.error || "운세를 불러오는데 실패했습니다.");
            }
        } catch (err) {
            setError("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "bg-zen-wood";
        if (score >= 60) return "bg-zen-gold";
        return "bg-zen-muted";
    };

    return (
        <div className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-12 px-6 pb-24 font-sans">

            {/* Header: Zen Style */}
            <div className="text-center space-y-4 animate-in fade-in duration-700">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-zen-border shadow-sm mb-2">
                    <Sun className="w-4 h-4 text-zen-gold" />
                    <span className="text-[10px] font-bold text-zen-muted uppercase tracking-[0.2em]">Daily Fortune Reading</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-tight text-zen-text italic">
                    오늘의 <span className="text-zen-wood">천기(天氣)</span>
                </h1>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-zen-muted font-serif text-lg">{today}</p>
                    {myProfile && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zen-gold" />
                            <p className="text-sm font-bold text-zen-text tracking-wide">{myProfile.name} 마스터님을 위한 기운</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Subscription Gate: 비구독자 블러 처리 */}
            {!checkingSubscription && isSubscribed === false && (
                <Card className="relative bg-white border-zen-border rounded-sm shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    {/* Blurred Preview Content */}
                    <div className="p-12 md:p-24 blur-md pointer-events-none select-none opacity-50">
                        <div className="text-center space-y-6">
                            <div className="text-8xl font-serif font-black text-zen-text">85</div>
                            <h3 className="text-2xl font-serif font-bold text-zen-text">"오늘은 새로운 시작을 위한 좋은 날입니다"</h3>
                            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                                <div className="p-4 bg-zen-bg rounded-sm">연애운 78</div>
                                <div className="p-4 bg-zen-bg rounded-sm">금전운 82</div>
                                <div className="p-4 bg-zen-bg rounded-sm">직업운 91</div>
                                <div className="p-4 bg-zen-bg rounded-sm">건강운 75</div>
                            </div>
                        </div>
                    </div>

                    {/* Lock Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                        <div className="text-center space-y-6 max-w-md px-6">
                            <div className="w-20 h-20 mx-auto bg-zen-gold/10 rounded-full flex items-center justify-center">
                                <Lock className="w-10 h-10 text-zen-gold" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-serif font-bold text-zen-text">
                                    멤버십 전용 콘텐츠
                                </h2>
                                <p className="text-zen-muted">
                                    오늘의 운세는 해화 멤버십 회원만 무제한으로 열람할 수 있습니다.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Button asChild className="w-full h-14 bg-zen-wood hover:bg-[#7A604D] text-white font-serif font-bold text-lg rounded-sm shadow-lg">
                                    <Link href="/protected/membership">
                                        <Crown className="w-5 h-5 mr-2" />
                                        멤버십 가입하고 매일 확인하기
                                    </Link>
                                </Button>
                                <p className="text-xs text-zen-muted">
                                    월 9,900원 · 매월 부적 10장 지급 · 언제든 해지 가능
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Loading Subscription Check */}
            {checkingSubscription && (
                <Card className="bg-white border-zen-border rounded-sm shadow-xl p-12 md:p-24 text-center animate-in fade-in duration-500">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-zen-gold animate-spin" />
                        <p className="text-zen-muted">로딩 중...</p>
                    </div>
                </Card>
            )}

            {/* Subscribed: Show Content */}
            {!checkingSubscription && isSubscribed && !fortune && (
                /* Initial State / Loading Card */
                <Card className="bg-white border-zen-border rounded-sm shadow-xl p-12 md:p-24 text-center relative overflow-hidden flex flex-col items-center justify-center animate-in slide-in-from-bottom-8 duration-1000">
                    <div className="absolute top-0 left-0 w-full h-1 bg-zen-gold/30" />

                    <div className="w-24 h-24 rounded-sm bg-zen-bg border border-zen-border flex items-center justify-center mb-8 relative">
                        {loading ? (
                            <Loader2 className="w-10 h-10 text-zen-gold animate-spin" />
                        ) : (
                            <Calendar className="w-10 h-10 text-zen-muted" />
                        )}
                        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-zen-gold animate-pulse" />
                    </div>

                    {error ? (
                        <div className="space-y-4">
                            <p className="text-red-500 font-bold">{error}</p>
                            {!myProfile && (
                                <Button asChild variant="outline" className="border-zen-border">
                                    <a href="/protected/family">프로필 등록하기</a>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-md space-y-8">
                            <div className="space-y-4">
                                <h2 className="text-3xl font-serif font-bold text-zen-text italic">오늘의 문을 여시겠습니까?</h2>
                                <p className="text-zen-muted leading-relaxed">
                                    해화당 AI가 오늘의 일진과 당신의 사주 명조를 결합하여 <br />
                                    가장 조화로운 처세의 방향을 제시해 드립니다.
                                </p>
                            </div>

                            <Button
                                onClick={handleGetFortune}
                                disabled={loading}
                                className="h-16 px-12 text-xl bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold rounded-sm shadow-xl transition-all active:scale-95"
                            >
                                {loading ? "천기를 읽는 중..." : "오늘의 운세 배알하기"}
                            </Button>
                        </div>
                    )}
                </Card>
            )}

            {/* Fortune Result: Zen Grid - Only for subscribed users with fortune data */}
            {!checkingSubscription && isSubscribed && fortune && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">

                    {/* Overall Score Banner */}
                    <Card className="relative overflow-hidden border-zen-border bg-white rounded-sm shadow-xl p-10 text-center">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-zen-wood via-zen-gold to-zen-wood" />
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-zen-gold uppercase tracking-[0.4em]">Integrated Energy Score</p>
                                <div className="text-9xl font-serif font-black text-zen-text tracking-tighter leading-none py-4">
                                    {fortune.overall.score}
                                </div>
                            </div>
                            <div className="max-w-2xl mx-auto space-y-4">
                                <h3 className="text-3xl font-serif font-bold text-zen-text italic">"{fortune.overall.message}"</h3>
                                <p className="text-zen-muted leading-relaxed font-sans text-lg">
                                    {fortune.advice}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Detailed Category Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { icon: Heart, label: "연애운 (Love)", col: "text-red-800", data: fortune.love },
                            { icon: TrendingUp, label: "금전운 (Wealth)", col: "text-amber-800", data: fortune.money },
                            { icon: Briefcase, label: "직업운 (Career)", col: "text-zen-wood", data: fortune.career },
                            { icon: Activity, label: "건강운 (Health)", col: "text-emerald-800", data: fortune.health },
                        ].map((item, idx) => (
                            <Card key={idx} className="bg-white border-zen-border rounded-sm shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-8 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-sm bg-zen-bg", item.col)}>
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <span className="font-serif font-bold text-xl text-zen-text">{item.label}</span>
                                        </div>
                                        <span className="text-3xl font-serif font-bold text-zen-text">{item.data.score}<span className="text-sm text-zen-muted ml-0.5">/100</span></span>
                                    </div>

                                    <div className="h-1 bg-zen-bg rounded-full overflow-hidden p-0">
                                        <div
                                            className={cn("h-full transition-all duration-[1.5s] ease-out", getScoreColor(item.data.score))}
                                            style={{ width: `${item.data.score}%` }}
                                        />
                                    </div>

                                    <p className="text-zen-muted leading-relaxed font-sans text-sm">{item.data.message}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Lucky Items & Refresh */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <Card className="lg:col-span-8 p-10 bg-white border-zen-border rounded-sm shadow-sm flex flex-col md:flex-row items-center justify-around gap-8">
                            <div className="text-center space-y-3">
                                <div className="w-12 h-12 rounded-full bg-zen-bg border border-zen-border flex items-center justify-center mx-auto">
                                    <Palette className="w-6 h-6 text-zen-gold" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-zen-muted uppercase tracking-widest mb-1">Lucky Color</p>
                                    <p className="text-2xl font-serif font-bold text-zen-text">{fortune.luckyColor}</p>
                                </div>
                            </div>
                            <div className="w-[1px] h-12 bg-zen-border hidden md:block" />
                            <div className="text-center space-y-3">
                                <div className="w-12 h-12 rounded-full bg-zen-bg border border-zen-border flex items-center justify-center mx-auto">
                                    <Hash className="w-6 h-6 text-zen-gold" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-zen-muted uppercase tracking-widest mb-1">Lucky Number</p>
                                    <p className="text-2xl font-serif font-bold text-zen-text">{fortune.luckyNumber}</p>
                                </div>
                            </div>
                        </Card>

                        <div className="lg:col-span-4 flex flex-col gap-4">
                            <Button
                                onClick={handleGetFortune}
                                disabled={loading}
                                variant="outline"
                                className="h-full border-zen-border text-zen-muted hover:text-zen-wood hover:bg-zen-bg transition-all font-serif font-bold flex flex-col gap-2 py-8 rounded-sm"
                            >
                                <RefreshCw className={cn("w-6 h-6", loading && "animate-spin")} />
                                오늘 운세 다시 받기
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
