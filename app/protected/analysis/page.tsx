import { getFamilyMembers } from "@/app/actions/family-actions";
import { AnalysisForm } from "@/components/analysis/analysis-form";
import { Hexagon, Zap } from "lucide-react";

export default async function AnalysisPage() {
    const members = await getFamilyMembers();

    return (
        <div className="relative flex flex-col gap-12 w-full max-w-6xl mx-auto py-16 px-6 overflow-hidden min-h-screen">

            {/* ═══════════════════════════════════════════════════════════════════
                TOP DECORATIVE BEAM
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-pulse opacity-50" />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                HEADER SECTION
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="space-y-6 text-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Holographic Badge */}
                <div className="flex justify-center">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37]/30 via-[#F4E4BA]/40 to-[#D4AF37]/30 rounded-full blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#D4AF37]/50 bg-[#0A0A0A]/90 backdrop-blur-xl overflow-hidden">
                            <div className="relative flex items-center gap-2">
                                <Hexagon className="w-4 h-4 text-[#D4AF37]" strokeWidth={1.5} />
                                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#D4AF37]">
                                    Premium Destiny Simulation
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Title */}
                <h1 className="text-5xl sm:text-6xl font-black tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    <span className="relative inline-block">
                        <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                            운명 분석실
                        </span>
                    </span>
                </h1>

                <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    천(天)·지(地)·인(人)의 정교한 결합. <br />
                    해화당 마스터의 통찰과 <span className="text-[#D4AF37] font-semibold">KAIST 알고리즘</span>이 당신의 다음 행보를 제안합니다.
                </p>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                 CLIENT FORM COMPONENT
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <AnalysisForm members={members} />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                BACKGROUND AMBIENCE
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-5%] w-[600px] h-[600px] bg-[#D4AF37]/8 rounded-full blur-[200px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
        </div>
    );
}
