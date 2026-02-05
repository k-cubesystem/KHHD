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

            {/* Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px] pointer-events-none" />

            <div className="relative z-10 w-full pt-6">
                <AnalysisDashboard userName={userName} />
            </div>
        </main>
    );
}
