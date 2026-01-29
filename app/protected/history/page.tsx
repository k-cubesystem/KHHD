"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Calendar, Clock, Sparkles, ChevronRight, Hexagon, BookOpen, Quote } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { GuestCTACard } from "@/components/guest-cta-card";

export default function HistoryPage() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [isGuest, setIsGuest] = useState(false);

    useEffect(() => {
        const fetchRecords = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setIsGuest(true);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("saju_records")
                .select(`
                    *,
                    family_members (
                        name,
                        relationship
                    )
                `)
                .order("created_at", { ascending: false });

            if (!error) setRecords(data || []);
            setLoading(false);
            if (data && data.length > 0) setSelectedRecord(data[0]);
        };
        fetchRecords();
    }, []);

    return (
        <div className="relative flex flex-col gap-10 w-full max-w-7xl mx-auto py-16 px-6 overflow-hidden min-h-screen">

            {/* Header Section */}
            <section className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4">
                    <div className="relative flex items-center gap-2 px-4 py-1.5 border border-primary/30 bg-surface/80 backdrop-blur-md rounded-none">
                        <Hexagon className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary">
                            Archive Vault
                        </span>
                    </div>
                </div>

                <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-ink-light">
                    운명 분석 <span className="text-primary-dim">비록함(秘錄函)</span>
                </h1>
                <p className="text-ink/60 text-base max-w-lg font-light">
                    당신의 운명 데이터를 영구히 보존합니다. 언제든 다시 열어 삶의 지표로 삼으십시오.
                </p>
            </section>

            {/* Guest View */}
            {isGuest ? (
                <GuestCTACard
                    title="가입하고 운명 분석 기록을 영구 보존하세요"
                    description="해화당에 가입하여 당신의 모든 운명 분석 결과를 안전하게 보관하고, 언제든 다시 확인할 수 있습니다. 시간이 지날수록 쌓이는 데이터가 당신의 운명 여정을 명확히 보여줄 것입니다."
                    icon={<BookOpen className="w-8 h-8 text-primary" strokeWidth={1} />}
                    preview={
                        <div className="space-y-3">
                            <div className="bg-surface/20 border border-primary/20 p-5 cursor-pointer hover:border-primary/40 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-primary border border-primary/30 px-2 py-0.5 uppercase">관상 분석</span>
                                    <span className="text-xs text-ink-light/40">2024.01.15</span>
                                </div>
                                <h3 className="text-base font-serif text-ink-light mb-2">홍길동님의 운명 개운 리포트</h3>
                                <p className="text-xs text-ink-light/60">운명 점수: 85/100</p>
                            </div>
                            <div className="bg-surface/20 border border-primary/20 p-5 cursor-pointer hover:border-primary/40 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-primary border border-primary/30 px-2 py-0.5 uppercase">사주 분석</span>
                                    <span className="text-xs text-ink-light/40">2024.01.10</span>
                                </div>
                                <h3 className="text-base font-serif text-ink-light mb-2">천지인 통합 분석</h3>
                                <p className="text-xs text-ink-light/60">총 운세: ★★★★☆</p>
                            </div>
                        </div>
                    }
                />
            ) : (
                <>
                    {/* Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-start">

                        {/* Left: Record List (Midnight Theme) */}
                        <div className="lg:col-span-4 space-y-4">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <Skeleton key={i} className="h-24 w-full bg-surface/5 rounded-none" />
                                ))
                            ) : records.length === 0 ? (
                                <div className="text-center py-20 border border-dashed border-primary/20 bg-surface/20 rounded-none">
                                    <BookOpen className="w-10 h-10 text-ink-light/40 mx-auto mb-4" />
                                    <p className="text-ink-light/60">보관된 비록이 없습니다.</p>
                                </div>
                            ) : (
                        records.map((record, idx) => (
                            <div
                                key={record.id}
                                onClick={() => setSelectedRecord(record)}
                                className={cn(
                                    "relative cursor-pointer transition-all duration-300 border overflow-hidden p-5 group rounded-none",
                                    selectedRecord?.id === record.id
                                        ? "bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(226,213,181,0.1)]"
                                        : "bg-surface/40 border-primary/5 hover:bg-surface/60 hover:border-primary/20"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 flex items-center justify-center transition-colors rounded-none",
                                            selectedRecord?.id === record.id ? "bg-primary text-background" : "bg-surface text-ink-light/40 group-hover:text-primary"
                                        )}>
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className={cn("font-bold text-lg font-serif", selectedRecord?.id === record.id ? "text-primary" : "text-ink-light")}>
                                                {record.family_members.name}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-ink-light/60 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(record.created_at), "yyyy. MM. dd", { locale: ko })}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className={cn(
                                        "w-5 h-5 transition-transform",
                                        selectedRecord?.id === record.id ? "text-primary translate-x-1" : "text-ink-light/40 group-hover:text-ink-light/60"
                                    )} />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right: Report Viewer (Light Theme Forced) */}
                <div className="lg:col-span-8 sticky top-24">
                    {selectedRecord ? (
                        <div className="relative shadow-2xl overflow-hidden border border-primary/20 transition-all duration-500 animate-in fade-in slide-in-from-right-4 bg-[#1a1a1a] rounded-none">

                            {/* Paper Texture Overlay (Dark) */}
                            <div className="absolute inset-0 bg-surface/50 -z-20 mix-blend-overlay" />

                            <CardHeader className="p-8 sm:p-12 border-b border-white/5 bg-surface/30 backdrop-blur-sm">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 w-fit rounded-none">
                                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Premium Analysis</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-ink-light/60 font-serif">Success Probability</div>
                                            <div className="text-3xl font-black text-primary tracking-tighter">{selectedRecord.success_probability}%</div>
                                        </div>
                                    </div>

                                    <div>
                                        <h2 className="text-4xl sm:text-5xl font-black text-ink-light tracking-tight mb-2">
                                            {selectedRecord.family_members.name}
                                            <span className="text-2xl sm:text-3xl font-light text-ink-light/40 ml-2">님의 운명 분석</span>
                                        </h2>
                                        <div className="flex items-center gap-2 text-ink-light/60 text-sm">
                                            <Clock className="w-4 h-4" />
                                            <span>분석 일시: {format(new Date(selectedRecord.created_at), "yyyy년 MM월 dd일 a h시 mm분", { locale: ko })}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0 bg-transparent min-h-[600px]">
                                <ScrollArea className="h-[700px] w-full">
                                    <div className="p-8 sm:p-12 max-w-3xl mx-auto">
                                        {selectedRecord.full_report_html ? (
                                            <div
                                                className="prose prose-lg prose-invert max-w-none font-serif leading-loose text-ink-light/90
                                                prose-headings:font-sans prose-headings:font-black prose-headings:tracking-tight prose-headings:text-ink-light
                                                prose-p:text-ink-light/80 prose-strong:text-primary prose-blockquote:border-l-primary prose-blockquote:bg-surface/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:not-italic"
                                                dangerouslySetInnerHTML={{ __html: selectedRecord.full_report_html }}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-ink-light/30">
                                                <Quote className="w-12 h-12 mb-4 opacity-20" />
                                                <p className="font-serif italic text-xl">"운명은 해석하는 자의 것입니다."</p>
                                            </div>
                                        )}

                                        {/* Footer Signature */}
                                        <div className="mt-20 pt-10 border-t border-white/10 flex justify-between items-end">
                                            <div className="text-left">
                                                <div className="w-16 h-16 border border-primary/20 flex items-center justify-center mb-4 opacity-50 rounded-none">
                                                    <div className="font-serif font-black text-2xl text-primary pt-1">海</div>
                                                </div>
                                                <p className="text-xs text-ink-light/40 tracking-widest uppercase mb-1">Authenticated by</p>
                                                <p className="font-serif font-bold text-ink-light">Haehwadang Master AI</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-ink-light/30 max-w-[200px] leading-tight">
                                                    본 리포트는 해화당 AI 알고리즘에 의해 생성되었으며,
                                                    운명학적 조언을 목적으로 합니다.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </div>
                    ) : (
                        <div className="h-[700px] flex items-center justify-center border border-dashed border-primary/20 bg-surface/20 text-center rounded-none">
                            <div className="space-y-4">
                                <div className="w-20 h-20 bg-surface flex items-center justify-center mx-auto border border-white/5 rounded-none">
                                    <BookOpen className="w-8 h-8 text-ink-light/40" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-ink-light">열람할 비록을 선택하세요</h3>
                                    <p className="text-ink-light/60 text-sm">좌측 리스트에서 상세 내용을 확인할 수 있습니다.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
                </>
            )}
        </div>
    );
}
