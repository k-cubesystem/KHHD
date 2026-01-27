"use client";

import { useState, useEffect } from "react";
import { AnalysisForm } from "@/components/analysis/analysis-form";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { Card } from "@/components/ui/card";
import { BookOpen, Sparkles, Calendar, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";
import { DailyFortuneView } from "@/components/analysis/daily-fortune-view";
import { createClient } from "@/lib/supabase/client";

interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    birth_date: string;
}

interface AnalysisClientPageProps {
    members: FamilyMember[];
}

export function AnalysisClientPage({ members }: AnalysisClientPageProps) {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') === 'daily' ? 'daily' : 'analysis';
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("");

    useEffect(() => {
        // Fetch current user for Daily Fortune
        const supabase = createClient();
        supabase.auth.getUser().then(async ({ data }) => {
            if (data.user) {
                setUserId(data.user.id);
                // Get name from profile or metadata
                const { data: profile } = await supabase.from('profiles').select('name').eq('id', data.user.id).single();
                setUserName(profile?.name || "회원");
            }
        });
    }, []);

    return (
        <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-8 w-full max-w-5xl mx-auto py-12 px-6 pb-32 font-sans"
        >
            {/* Header */}
            <motion.section variants={fadeInUp} className="space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-zen-border shadow-sm mb-2">
                        <BookOpen className="w-4 h-4 text-zen-gold" />
                        <span className="text-[10px] font-bold text-zen-muted uppercase tracking-[0.2em] font-sans">Heaven Earth Man Analysis</span>
                    </div>
                </div>
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-zen-text italic leading-tight">
                        천지인(天地人) <br />
                        <span className="text-zen-wood">심층 분석실</span>
                    </h1>
                </div>
            </motion.section>

            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mx-auto mb-8 bg-black/5">
                    <TabsTrigger value="analysis" className="data-[state=active]:bg-zen-gold data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                        <Sparkles className="w-4 h-4 mr-2" />
                        운명 분석
                    </TabsTrigger>
                    <TabsTrigger value="daily" className="data-[state=active]:bg-zen-gold data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                        <Calendar className="w-4 h-4 mr-2" />
                        오늘의 운세
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="analysis">
                    <motion.div variants={fadeInUp}>
                        <Card depth="medium" className="relative bg-white p-1 shadow-2xl shadow-zen-wood/10">
                            <div className="absolute inset-0 bg-zen-wood/5 rounded-sm -m-1 pointer-events-none border border-zen-border shadow-inner" />
                            <AnalysisForm members={members} />
                        </Card>
                    </motion.div>
                </TabsContent>

                <TabsContent value="daily">
                    <motion.div variants={fadeInUp}>
                        {userId ? (
                            <DailyFortuneView userId={userId} userName={userName} />
                        ) : (
                            <div className="text-center p-12 bg-white/5 rounded-xl border border-white/10">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-zen-gold" />
                                <p className="mt-4 text-zen-muted">사용자 정보를 불러오고 있습니다...</p>
                            </div>
                        )}
                    </motion.div>
                </TabsContent>
            </Tabs>

            {/* Footer */}
            <motion.section variants={fadeInUp} className="text-center space-y-4 opacity-50 font-serif italic text-sm text-zen-muted mt-8">
                <p>※ 모든 분석은 명리학적 전통 가이드라인과 최신 데이터 알고리즘을 준수합니다.</p>
                <div className="flex items-center justify-center gap-4 uppercase tracking-[0.2em] font-sans font-bold text-[10px] not-italic">
                    <span>Authentic</span>
                    <span className="w-1 h-1 rounded-full bg-zen-gold" />
                    <span>Precise</span>
                    <span className="w-1 h-1 rounded-full bg-zen-gold" />
                    <span>Haehwadang Master Identity</span>
                </div>
            </motion.section>
        </motion.div>
    );
}
