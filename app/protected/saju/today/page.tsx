"use client";

import { useState, useEffect } from "react";
import { Sun, Loader2, Sparkles } from "lucide-react";
import { DailyFortuneView } from "@/components/analysis/daily-fortune-view";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { GuestCTACard } from "@/components/guest-cta-card";

export default function TodayFortunePage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data } = await supabase.auth.getUser();
            if (data.user) {
                setUserId(data.user.id);
                const { data: profile } = await supabase.from('profiles').select('name').eq('id', data.user.id).single();
                setUserName(profile?.name || "회원");
            }
            setLoading(false);
        };
        fetchUser();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 h-full min-h-[50vh]">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="mt-4 text-ink/60 font-serif">사용자 정보를 확인 중입니다...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-12 px-6 pb-24 font-sans relative z-10">
            {/* Header: Dark Luxury Style */}
            <div className="text-center space-y-4 animate-in fade-in duration-700">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/30 border border-primary/20 shadow-sm mb-2 backdrop-blur-sm">
                    <Sun className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary-dim uppercase tracking-[0.2em]">Daily Fortune Reading</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-tight text-ink-light italic">
                    오늘의 <span className="text-primary-dim">천기(天氣)</span>
                </h1>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-ink/60 font-serif text-lg">
                        {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
                    </p>
                </div>
            </div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="max-w-3xl mx-auto w-full"
            >
                {userId ? (
                    <DailyFortuneView userId={userId} userName={userName} />
                ) : (
                    <GuestCTACard
                        title="가입하고 내 운세 보기"
                        description="매일 아침 당신만을 위한 맞춤 운세를 확인하세요. 사주 기반의 정확한 일일 운세 분석과 조언을 받아보실 수 있습니다."
                        icon={<Sun className="w-8 h-8 text-primary" strokeWidth={1} />}
                        preview={
                            <div className="bg-surface/20 border border-primary/20 p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-ink-light/70">오늘의 총운</span>
                                    <span className="text-xl font-serif text-primary">★★★★☆</span>
                                </div>
                                <p className="text-sm text-ink-light/60 leading-relaxed">
                                    오늘은 새로운 시작을 알리는 길한 날입니다. 평소 미뤄왔던 일을 시작하기에 좋은 시기...
                                </p>
                                <div className="h-px bg-primary/10" />
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <p className="text-xs text-ink-light/50">재물운</p>
                                        <p className="text-lg font-serif text-amber-400">★★★</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-ink-light/50">애정운</p>
                                        <p className="text-lg font-serif text-rose-400">★★★★</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-ink-light/50">건강운</p>
                                        <p className="text-lg font-serif text-emerald-400">★★★</p>
                                    </div>
                                </div>
                            </div>
                        }
                    />
                )}
            </motion.div>
        </div>
    );
}
