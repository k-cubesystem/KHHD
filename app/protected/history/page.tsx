"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Calendar, Clock, Sparkles, Hexagon, BookOpen, Quote, Download, Share2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";

export default function HistoryPage() {
    const [record, setRecord] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchLatestRecord = async () => {
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
                        relationship,
                        birth_date,
                        birth_time,
                        calendar_type,
                        gender
                    )
                `)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (!error && data) setRecord(data);
            setLoading(false);
        };
        fetchLatestRecord();
    }, []);

    const handleSave = async () => {
        const element = reportRef.current;
        if (!element || !record) return;

        try {
            toast.loading("이미지 생성 중...");
            const canvas = await html2canvas(element, {
                backgroundColor: '#0A0A0A',
                scale: 2,
            });

            const link = document.createElement('a');
            link.download = `해화당_${record.family_members?.name || '분석결과'}_${format(new Date(), 'yyyyMMdd')}.png`;
            link.href = canvas.toDataURL();
            link.click();
            toast.dismiss();
            toast.success("이미지가 저장되었습니다!");
        } catch (err) {
            toast.dismiss();
            toast.error("이미지 저장에 실패했습니다.");
            console.error(err);
        }
    };

    const handleShare = async () => {
        if (!record) return;

        const shareData = {
            title: `${record.family_members?.name}님의 해화당 운명 분석`,
            text: `성공 확률: ${record.success_probability}%\n행복 지수: ${record.happiness_index}%`,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                toast.success("공유되었습니다!");
            } catch (err) {
                // User cancelled share
                if ((err as Error).name !== 'AbortError') {
                    console.error('Share failed:', err);
                }
            }
        } else {
            // Fallback: Copy URL to clipboard
            try {
                await navigator.clipboard.writeText(window.location.href);
                toast.success("링크가 복사되었습니다!");
            } catch (err) {
                toast.error("공유에 실패했습니다.");
            }
        }
    };

    if (isGuest) {
        return (
            <div className="w-full max-w-[480px] mx-auto px-4 py-16">
                <div className="text-center space-y-6">
                    <BookOpen className="w-16 h-16 text-primary mx-auto" />
                    <h1 className="text-2xl font-serif font-bold text-ink-light">
                        회원 전용 기능입니다
                    </h1>
                    <p className="text-ink-light/60">
                        가입하고 운명 분석 기록을 영구 보존하세요
                    </p>
                    <Button onClick={() => window.location.href = '/auth/login'} className="bg-primary">
                        로그인하기
                    </Button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="w-full max-w-[480px] mx-auto px-4 py-16 space-y-6">
                <Skeleton className="h-24 w-full bg-surface/5" />
                <Skeleton className="h-64 w-full bg-surface/5" />
                <Skeleton className="h-96 w-full bg-surface/5" />
            </div>
        );
    }

    if (!record) {
        return (
            <div className="w-full max-w-[480px] mx-auto px-4 py-16">
                <div className="text-center space-y-6 border border-dashed border-primary/20 bg-surface/20 p-12">
                    <BookOpen className="w-16 h-16 text-ink-light/40 mx-auto" />
                    <h2 className="text-xl font-serif font-bold text-ink-light">
                        분석 기록이 없습니다
                    </h2>
                    <p className="text-ink-light/60">
                        첫 운명 분석을 시작해보세요
                    </p>
                    <Button onClick={() => window.location.href = '/protected/analysis'} className="bg-primary">
                        분석 시작하기
                    </Button>
                </div>
            </div>
        );
    }

    const calendarTypeText = record.family_members?.calendar_type === 'solar' ? '양력' : '음력';

    return (
        <div className="w-full max-w-[480px] mx-auto pb-24">
            {/* Header */}
            <section className="px-4 py-8 space-y-4">
                <div className="flex items-center gap-2 px-4 py-1.5 border border-primary/30 bg-surface/80 backdrop-blur-md w-fit">
                    <Hexagon className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary">
                        운명 분석 비록
                    </span>
                </div>

                <h1 className="text-3xl font-serif font-bold tracking-tight text-ink-light">
                    천지인 분석 결과
                </h1>
            </section>

            {/* Report Content */}
            <div ref={reportRef} className="bg-background">
                {/* 사주명식 Section */}
                {record.family_members && (
                    <div className="mx-4 mb-6 bg-surface/30 border border-primary/20 p-6">
                        <h3 className="text-sm text-primary mb-4 flex items-center gap-2 font-bold tracking-wider">
                            <Hexagon className="w-4 h-4" />
                            사주명식 (四柱命式)
                        </h3>
                        <div className="space-y-3 text-ink-light/90">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-ink-light/60">이름</span>
                                <span className="font-serif font-bold text-base">{record.family_members.name}</span>
                            </div>
                            {record.family_members.birth_date && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-ink-light/60">생년월일</span>
                                    <span className="font-serif">{format(new Date(record.family_members.birth_date), "yyyy년 MM월 dd일", { locale: ko })}</span>
                                </div>
                            )}
                            {record.family_members.birth_time && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-ink-light/60">생시</span>
                                    <span className="font-serif">{record.family_members.birth_time.substring(0, 5)}</span>
                                </div>
                            )}
                            {record.family_members.calendar_type && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-ink-light/60">양력/음력</span>
                                    <span className="font-serif">{calendarTypeText}</span>
                                </div>
                            )}
                            {record.family_members.gender && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-ink-light/60">성별</span>
                                    <span className="font-serif">{record.family_members.gender === 'male' ? '남성' : '여성'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Main Report Card */}
                <div className="mx-4 border border-primary/20 bg-[#1a1a1a]">
                    <CardHeader className="p-6 border-b border-white/5 bg-surface/30">
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 w-fit">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Premium Analysis</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-ink-light/60 font-serif">Success</div>
                                    <div className="text-3xl font-black text-primary tracking-tighter">{record.success_probability}%</div>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-3xl font-black text-ink-light tracking-tight mb-2">
                                    {record.family_members?.name}
                                    <span className="text-xl font-light text-ink-light/40 ml-2">님의 운명</span>
                                </h2>
                                <div className="flex items-center gap-2 text-ink-light/60 text-xs">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>분석 일시: {format(new Date(record.created_at), "yyyy년 MM월 dd일 a h시 mm분", { locale: ko })}</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        {record.full_report_html ? (
                            <div
                                className="prose prose-invert max-w-none font-serif leading-relaxed text-ink-light/90
                                prose-headings:font-sans prose-headings:font-black prose-headings:tracking-tight prose-headings:text-ink-light
                                prose-p:text-ink-light/80 prose-strong:text-primary prose-blockquote:border-l-primary 
                                prose-blockquote:bg-surface/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic"
                                dangerouslySetInnerHTML={{ __html: record.full_report_html }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-ink-light/30">
                                <Quote className="w-12 h-12 mb-4 opacity-20" />
                                <p className="font-serif italic text-lg">"운명은 해석하는 자의 것입니다."</p>
                            </div>
                        )}

                        {/* Footer Signature */}
                        <div className="mt-12 pt-8 border-t border-white/10">
                            <div className="flex justify-between items-end">
                                <div className="text-left">
                                    <div className="w-12 h-12 border border-primary/20 flex items-center justify-center mb-3 opacity-50">
                                        <div className="font-serif font-black text-xl text-primary">海</div>
                                    </div>
                                    <p className="text-[10px] text-ink-light/40 tracking-widest uppercase mb-1">Authenticated by</p>
                                    <p className="font-serif font-bold text-ink-light text-sm">Haehwadang Master AI</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-ink-light/30 max-w-[180px] leading-tight">
                                        본 리포트는 해화당 AI 알고리즘에 의해 생성되었으며,
                                        운명학적 조언을 목적으로 합니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mx-4 mt-6 mb-6">
                <div className="flex gap-3">
                    <Button
                        onClick={handleSave}
                        variant="outline"
                        className="flex-1 flex items-center border-primary/30 hover:border-primary/50 hover:bg-primary/10"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        이미지 저장
                    </Button>
                    <Button
                        onClick={handleShare}
                        className="flex-1 flex items-center bg-primary hover:bg-primary-dim text-background"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        공유하기
                    </Button>
                </div>
            </div>
        </div>
    );
}
