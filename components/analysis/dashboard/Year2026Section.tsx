"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Loader2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { analyzeYear2026 } from "@/app/actions/analysis-engine";

export function Year2026Section() {
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 2000);
    };

    return (
        <Card className="relative overflow-hidden bg-[#1a0505] border-red-900/40 hover:border-red-600/50 transition-all duration-300 p-4 min-h-[80px] flex items-center justify-between group">
            <div className="absolute inset-0 bg-noise-pattern opacity-10 pointer-events-none" />

            {/* Left Info */}
            <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center border border-red-500/30 group-hover:bg-red-600/30 transition-colors">
                    <Flame className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-red-500 tracking-wider uppercase border border-red-900/50 px-1.5 rounded-sm bg-red-950/50">2026 Preview</span>
                    </div>
                    <h3 className="text-sm font-serif font-bold text-red-50 group-hover:text-red-200 transition-colors">
                        병오년(丙午年) 미리보는 붉은 말의 해
                    </h3>
                </div>
            </div>

            {/* Right Action */}
            <div className="relative z-10">
                <Button
                    onClick={handleAnalyze}
                    disabled={loading}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-transparent p-0"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </Button>
            </div>
        </Card>
    );
}
