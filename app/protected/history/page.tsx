"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Calendar, Clock, Sparkles, ChevronRight, Hexagon, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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
        <div className="relative flex flex-col gap-10 w-full max-w-7xl mx-auto py-16 px-6 overflow-hidden">

            {/* ═══════════════════════════════════════════════════════════════════
                TOP DECORATIVE BEAM
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-pulse opacity-50" />
                <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                    style={{ backgroundSize: '200% 100%' }}
                />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                HEADER SECTION
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Holographic Badge */}
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37]/30 via-[#F4E4BA]/40 to-[#D4AF37]/30 rounded-full blur-sm opacity-75" />
                        <div className="relative flex items-center gap-2 px-4 py-2 rounded-full border border-[#D4AF37]/50 bg-[#0A0A0A]/90 backdrop-blur-xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                            <div className="relative flex items-center gap-2">
                                <Hexagon className="w-4 h-4 text-[#D4AF37]" strokeWidth={1.5} />
                                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#D4AF37]">
                                    Archive Vault
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>

                <h1 className="text-4xl sm:text-5xl font-black tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                        운명 분석 비록함
                    </span>
                </h1>
                <p className="text-muted-foreground text-base max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    지금까지 생성된 소중한 운명 보고서들을 보관하고 있습니다.
                </p>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
                MAIN CONTENT
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

                {/* List of Records */}
                <div className="lg:col-span-4 space-y-4">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-2xl bg-white/5" />
                        ))
                    ) : records.length === 0 ? (
                        <div className="text-center py-20 glass rounded-3xl border-dashed border-2 border-[#D4AF37]/20 animate-in fade-in duration-700 delay-300">
                            <div className="space-y-4">
                                <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto">
                                    <BookOpen className="w-8 h-8 text-[#D4AF37]/40" />
                                </div>
                                <p className="text-muted-foreground">아직 생성된 비록이 없습니다.</p>
                            </div>
                        </div>
                    ) : (
                        records.map((record, idx) => (
                            <div
                                key={record.id}
                                onClick={() => setSelectedRecord(record)}
                                className="relative group cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-500"
                                style={{ animationDelay: `${300 + idx * 100}ms` }}
                            >
                                {/* Hover glow */}
                                <div className={`absolute -inset-0.5 rounded-2xl blur-lg transition-all duration-500 ${selectedRecord?.id === record.id ? 'bg-[#D4AF37]/20 opacity-100' : 'bg-[#D4AF37]/0 opacity-0 group-hover:bg-[#D4AF37]/15 group-hover:opacity-100'}`} />

                                <Card className={`relative border-none rounded-2xl overflow-hidden transition-all duration-300 ${selectedRecord?.id === record.id ? 'glass ring-2 ring-[#D4AF37]/50 bg-[#D4AF37]/5' : 'bg-white/5 hover:bg-white/10'}`}>
                                    <CardContent className="p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${selectedRecord?.id === record.id ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/30' : 'bg-white/5 group-hover:bg-[#D4AF37]/10'}`}>
                                                <FileText className={`w-6 h-6 transition-colors ${selectedRecord?.id === record.id ? 'text-[#D4AF37]' : 'text-white/40 group-hover:text-[#D4AF37]/60'}`} />
                                            </div>
                                            <div>
                                                <h4 className={`font-bold text-lg transition-colors ${selectedRecord?.id === record.id ? 'text-[#D4AF37]' : 'group-hover:text-[#D4AF37]'}`}>
                                                    {record.family_members.name}
                                                </h4>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(record.created_at), "yyyy. MM. dd", { locale: ko })}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-5 h-5 transition-all duration-300 ${selectedRecord?.id === record.id ? 'translate-x-1 text-[#D4AF37]' : 'text-muted-foreground group-hover:translate-x-1 group-hover:text-[#D4AF37]/60'}`} />
                                    </CardContent>
                                </Card>
                            </div>
                        ))
                    )}
                </div>

                {/* Report Viewer */}
                <div className="lg:col-span-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
                    {selectedRecord ? (
                        <div className="relative group">
                            {/* Card glow */}
                            <div className="absolute -inset-1 bg-gradient-to-b from-[#D4AF37]/10 to-transparent rounded-[2.5rem] blur-xl opacity-50" />

                            <Card className="relative glass border-[#D4AF37]/10 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[700px] group-hover:border-[#D4AF37]/20 transition-all duration-500">
                                <CardHeader className="bg-[#D4AF37]/5 p-8 sm:p-10 border-b border-white/5">
                                    <div className="space-y-4">
                                        {/* Badge */}
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 w-fit">
                                            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                                            <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">Comprehensive Report</span>
                                        </div>

                                        {/* Title */}
                                        <CardTitle className="text-3xl sm:text-4xl font-black">
                                            <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
                                                {selectedRecord.family_members.name}님의 운명 비록
                                            </span>
                                        </CardTitle>

                                        {/* Meta */}
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full">
                                                <Clock className="w-4 h-4" />
                                                {format(new Date(selectedRecord.created_at), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                                            </span>
                                            <span className="flex items-center gap-2 bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1.5 rounded-full border border-[#D4AF37]/20">
                                                <Sparkles className="w-4 h-4" />
                                                성공확률 {selectedRecord.success_probability}%
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[550px] p-8 sm:p-10">
                                        <div
                                            className="prose prose-invert prose-gold max-w-none leading-relaxed text-base sm:text-lg whitespace-pre-wrap font-serif"
                                            dangerouslySetInnerHTML={{ __html: selectedRecord.full_report_html }}
                                        />
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="h-full min-h-[700px] flex items-center justify-center glass rounded-[2.5rem] border-dashed border-2 border-[#D4AF37]/20 p-20 text-center">
                            <div className="space-y-6">
                                <div className="relative w-24 h-24 mx-auto">
                                    <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-full blur-xl animate-pulse" />
                                    <div className="relative w-full h-full bg-[#D4AF37]/5 rounded-full flex items-center justify-center border border-[#D4AF37]/20">
                                        <FileText className="w-10 h-10 text-[#D4AF37]/40" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold">열람할 보고서를 선택해 주세요.</h3>
                                    <p className="text-muted-foreground text-sm">좌측 리스트에서 보고서를 클릭하면 상세 내용을 비춰드립니다.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                BACKGROUND AMBIENCE
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[15%] left-[5%] w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-5%] w-[600px] h-[600px] bg-[#D4AF37]/8 rounded-full blur-[200px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
        </div>
    );
}
