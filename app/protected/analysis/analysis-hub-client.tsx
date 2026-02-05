"use client";

import { AnalysisDashboard } from "@/components/analysis/AnalysisDashboard";

interface AnalysisHubClientProps {
    isGuest: boolean;
    userName?: string;
}

export function AnalysisHubClient({ isGuest, userName }: AnalysisHubClientProps) {
    return (
        <main className="min-h-screen bg-background relative overflow-hidden">
            {/* Hanji Texture Overlay */}
            <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('/texture/hanji_noise.png')] bg-repeat" />

            {/* Standard Manse Background Glow */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-[200px]" />
            </div>

            <div className="relative z-10 w-full pt-6">
                <AnalysisDashboard userName={userName} />
            </div>
        </main>
    );
}
