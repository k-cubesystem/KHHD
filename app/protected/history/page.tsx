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

export default function HistoryPage() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);

    useEffect(() => {
        const fetchRecords = async () => {
            const supabase = createClient();
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
                    <div className="relative flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-500/30 bg-ink-900/80 backdrop-blur-md">
                        <Hexagon className="w-3.5 h-3.5 text-gold-500" strokeWidth={2} />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gold-500">
                            Archive Vault
                        </span>
                    </div>
                </div>

                <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-white">
                    운명 분석 <span className="text-gold-400">비록함(秘錄函)</span>
                </h1>
                <p className="text-stone-400 text-base max-w-lg font-light">
                    당신의 운명 데이터를 영구히 보존합니다. 언제든 다시 열어 삶의 지표로 삼으십시오.
                </p>
            </section>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-start">

                {/* Left: Record List (Midnight Theme) */}
                <div className="lg:col-span-4 space-y-4">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-2xl bg-white/5" />
                        ))
                    ) : records.length === 0 ? (
                        <div className="text-center py-20 rounded-3xl border border-dashed border-stone-800 bg-ink-900/20">
                            <BookOpen className="w-10 h-10 text-stone-600 mx-auto mb-4" />
                            <p className="text-stone-500">보관된 비록이 없습니다.</p>
                        </div>
                    ) : (
                        records.map((record, idx) => (
                            <div
                                key={record.id}
                                onClick={() => setSelectedRecord(record)}
                                className={cn(
                                    "relative cursor-pointer transition-all duration-300 rounded-2xl border overflow-hidden p-5 group",
                                    selectedRecord?.id === record.id
                                        ? "bg-gold-500/10 border-gold-500/50 shadow-[0_0_15px_rgba(197,160,89,0.1)]"
                                        : "bg-ink-900/40 border-white/5 hover:bg-white/5 hover:border-gold-500/20"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                            selectedRecord?.id === record.id ? "bg-gold-500 text-ink-950" : "bg-ink-950 text-stone-500 group-hover:text-gold-500"
                                        )}>
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className={cn("font-bold text-lg font-serif", selectedRecord?.id === record.id ? "text-gold-400" : "text-stone-200")}>
                                                {record.family_members.name}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(record.created_at), "yyyy. MM. dd", { locale: ko })}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className={cn(
                                        "w-5 h-5 transition-transform",
                                        selectedRecord?.id === record.id ? "text-gold-500 translate-x-1" : "text-stone-600 group-hover:text-stone-400"
                                    )} />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right: Report Viewer (Light Theme Forced) */}
                <div className="lg:col-span-8 sticky top-24">
                    {selectedRecord ? (
                        <div className="light-theme-forced relative rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 transition-all duration-500 animate-in fade-in slide-in-from-right-4">

                            {/* Paper Texture Overlay (Subtle Clean Paper) */}
                            <div className="absolute inset-0 bg-[#FAFAFA] -z-20" />

                            <CardHeader className="p-8 sm:p-12 border-b border-stone-100 bg-white/50 backdrop-blur-sm">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gold-50 border border-gold-200 w-fit">
                                            <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                                            <span className="text-[10px] font-bold text-gold-700 uppercase tracking-wider">Premium Analysis</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-stone-500 font-serif">Success Probability</div>
                                            <div className="text-3xl font-black text-gold-600 tracking-tighter">{selectedRecord.success_probability}%</div>
                                        </div>
                                    </div>

                                    <div>
                                        <h2 className="text-4xl sm:text-5xl font-black text-ink-900 tracking-tight mb-2">
                                            {selectedRecord.family_members.name}
                                            <span className="text-2xl sm:text-3xl font-light text-stone-400 ml-2">님의 운명 분석</span>
                                        </h2>
                                        <div className="flex items-center gap-2 text-stone-500 text-sm">
                                            <Clock className="w-4 h-4" />
                                            <span>분석 일시: {format(new Date(selectedRecord.created_at), "yyyy년 MM월 dd일 a h시 mm분", { locale: ko })}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0 bg-white min-h-[600px]">
                                <ScrollArea className="h-[700px] w-full">
                                    <div className="p-8 sm:p-12 max-w-3xl mx-auto">
                                        {selectedRecord.full_report_html ? (
                                            <div
                                                className="prose prose-lg prose-stone max-w-none font-serif leading-loose text-ink-800
                                                prose-headings:font-sans prose-headings:font-black prose-headings:tracking-tight prose-headings:text-ink-950
                                                prose-p:text-stone-600 prose-strong:text-gold-700 prose-blockquote:border-l-gold-400 prose-blockquote:bg-gold-50/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:not-italic"
                                                dangerouslySetInnerHTML={{ __html: selectedRecord.full_report_html }}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-stone-300">
                                                <Quote className="w-12 h-12 mb-4 opacity-20" />
                                                <p className="font-serif italic text-xl">"운명은 해석하는 자의 것입니다."</p>
                                            </div>
                                        )}

                                        {/* Footer Signature */}
                                        <div className="mt-20 pt-10 border-t border-stone-100 flex justify-between items-end">
                                            <div className="text-left">
                                                <div className="w-16 h-16 border border-gold-200 rounded-full flex items-center justify-center mb-4 opacity-50">
                                                    <div className="font-serif font-black text-2xl text-gold-800 pt-1">海</div>
                                                </div>
                                                <p className="text-xs text-stone-400 tracking-widest uppercase mb-1">Authenticated by</p>
                                                <p className="font-serif font-bold text-ink-900">Haehwadang Master AI</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-stone-300 max-w-[200px] leading-tight">
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
                        <div className="h-[700px] flex items-center justify-center rounded-[2.5rem] border border-dashed border-stone-700 bg-ink-900/20 text-center">
                            <div className="space-y-4">
                                <div className="w-20 h-20 bg-ink-900 rounded-full flex items-center justify-center mx-auto border border-white/5">
                                    <BookOpen className="w-8 h-8 text-stone-600" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-stone-300">열람할 비록을 선택하세요</h3>
                                    <p className="text-stone-500 text-sm">좌측 리스트에서 상세 내용을 확인할 수 있습니다.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
