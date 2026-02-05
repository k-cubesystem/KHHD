"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { analyzeChonjiin } from "@/app/actions/analysis-engine";
import { cn } from "@/lib/utils";

export function MasterpieceSection() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleAnalyze = async () => {
        setLoading(true);
        // FIXME: Pass actual Saju info
        const res = await analyzeChonjiin("갑자년...", "관상정보...", "현재고민...");
        if (res.success) {
            setResult((res as any).data);
        }
        setLoading(false);
    };

    return (
        <Card className="relative overflow-hidden card-glass-manse min-h-[220px] flex flex-col justify-center">
            {/* Background Texture & Decor */}
            <div className="absolute inset-0 bg-[url('/texture/hanji_pattern.png')] bg-repeat opacity-[0.03] mix-blend-overlay" />
            <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-6">

                {/* Text Content */}
                <div className="space-y-3 max-w-md">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-primary/30 rounded-full w-fit bg-primary/5">
                        <Sparkles className="w-3 h-3 text-primary" strokeWidth={1.5} />
                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">The Masterpiece</span>
                    </div>

                    <div>
                        <h2 className="text-xl md:text-3xl font-serif font-bold text-ink-light leading-tight mb-1" style={{ wordBreak: "keep-all" }}>
                            <span className="text-manse-gold">천지인(天地人)</span> 통합 분석
                        </h2>
                        <p className="text-sm md:text-base text-ink/60 font-sans leading-relaxed text-balance">
                            하늘의 명, 땅의 기운, 의지의 조화를 하나의 서사로 엮어낸 시그니처 리포트
                        </p>
                    </div>
                </div>

                {/* Action / Result Area */}
                <div className="flex-shrink-0">
                    {result ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-surface/30 backdrop-blur-md rounded-lg p-4 border border-white/10 max-w-xs"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-primary font-serif font-bold text-lg">분석 완료</span>
                                <div className="h-px bg-white/20 flex-1" />
                            </div>
                            <p className="text-xs text-ink-light/80 italic mb-3 line-clamp-2">"{result.summary}"</p>
                            <Button variant="outline" size="sm" className="w-full border-white/10 hover:bg-white/5 text-ink-light h-9 text-xs">
                                상세 리포트 확인 <ArrowRight className="w-3 h-3 ml-2" />
                            </Button>
                        </motion.div>
                    ) : (
                        <Button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className={cn(
                                "w-full md:w-auto bg-primary-dark text-white hover:bg-primary-dark/90 h-12 px-6 rounded-none font-serif text-sm shadow-[0_4px_20px_rgba(236,182,19,0.2)] transition-all active:scale-[0.98]",
                                loading && "opacity-80"
                            )}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            {loading ? "운명 조율 중..." : "통합 분석 시작 (10Cr)"}
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
