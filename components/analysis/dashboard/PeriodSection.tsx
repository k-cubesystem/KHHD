"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { analyzePeriodLuck } from "@/app/actions/analysis-engine";

export function PeriodSection() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleAnalyze = async (type: "이번 주" | "이번 달") => {
        setLoading(true);
        const res = await analyzePeriodLuck("갑자년...", type, new Date().toISOString().split('T')[0]);
        if (res.success) setResult({ ...(res as any).data, type });
        setLoading(false);
    };

    return (
        <Card className="group relative overflow-hidden card-glass-manse transition-all duration-300 h-full min-h-[160px] flex flex-col justify-between p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
                    </div>
                </div>

                <h3 className="text-lg font-serif font-bold text-ink-light mb-1">
                    길일 캘린더
                </h3>
                <p className="text-xs text-ink/50 leading-relaxed line-clamp-2">
                    주간/월간 흐름과 길흉일 미리보기
                </p>
            </div>

            <div className="relative z-10 pt-2 grid grid-cols-2 gap-2">
                <Button
                    onClick={() => handleAnalyze("이번 주")}
                    variant="outline"
                    className="h-8 border-white/10 text-ink-light hover:bg-white/5 text-[10px] px-0 bg-transparent"
                    disabled={loading}
                >
                    <Sun className="w-3 h-3 mr-1 text-emerald-400" /> 주간
                </Button>
                <Button
                    onClick={() => handleAnalyze("이번 달")}
                    variant="outline"
                    className="h-8 border-white/10 text-ink-light hover:bg-white/5 text-[10px] px-0 bg-transparent"
                    disabled={loading}
                >
                    <Moon className="w-3 h-3 mr-1 text-emerald-400" /> 월간
                </Button>
            </div>

            {result && (
                <div className="absolute inset-0 bg-[#0A0A0A]/95 backdrop-blur-sm p-4 flex flex-col items-center justify-center text-center animate-in fade-in z-20">
                    <h4 className="font-bold text-emerald-400 text-sm mb-1">{result.type} 흐름</h4>
                    <div className="text-2xl font-serif font-bold text-white mb-2">{result.score || 85}점</div>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-transparent" onClick={() => setResult(null)}>닫기</Button>
                </div>
            )}
        </Card>
    );
}
