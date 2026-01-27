"use client";

import { useState, useEffect } from "react";
import { Sun, Loader2 } from "lucide-react";
import { DailyFortuneView } from "@/components/analysis/daily-fortune-view";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

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
                <Loader2 className="w-10 h-10 text-zen-gold animate-spin" />
                <p className="mt-4 text-zen-muted font-serif">사용자 정보를 확인 중입니다...</p>
            </div>
        );
    }

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
                    <p className="text-zen-muted font-serif text-lg">
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
                    <div className="text-center p-12 bg-white/50 border border-zen-border rounded-xl">
                        <p className="text-zen-muted">로그인이 필요합니다.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
