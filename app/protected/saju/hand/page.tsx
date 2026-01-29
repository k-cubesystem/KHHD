"use client";

import { useState, useRef, useEffect } from "react";
import { Hand, Upload, Sparkles, Loader2, Camera, X, CheckCircle, Brain, Heart, Activity, User, ArrowRight, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { analyzePalm } from "@/app/actions/ai-saju";
import { TALISMAN_COSTS_DISPLAY } from "@/lib/constants";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PalmReadingPage() {
    const router = useRouter();
    const [isGuest, setIsGuest] = useState(true);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setIsGuest(!user);
        };
        checkAuth();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("이미지 파일만 업로드 가능합니다.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            setImagePreview(result);
            const base64 = result.split(",")[1];
            setImageBase64(base64);
            setError(null);
            setAnalysis(null);
        };
        reader.readAsDataURL(file);
    };

    const handleClearImage = () => {
        setImagePreview(null);
        setImageBase64(null);
        setAnalysis(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleAnalyze = async () => {
        if (isGuest) {
            toast.error("로그인이 필요한 기능입니다.");
            router.push("/auth/sign-up");
            return;
        }

        if (!imageBase64) {
            toast.error("먼저 손바닥 사진을 업로드해주세요.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await analyzePalm(imageBase64);

            if (result.success) {
                setAnalysis(result);
                toast.success("손금 분석이 완료되었습니다!");
            } else {
                setError(result.error || "분석 실패");
                toast.error(result.error || "분석 실패");
            }
        } catch (err) {
            setError("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-12 px-6 pb-24 font-sans">

            {/* Header: Dark Luxury Style */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-primary/20 backdrop-blur-sm">
                    <Hand className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Palmistry Intelligence</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-ink-light italic">
                    운명의 지도, <span className="text-primary-dim">손금과 지압</span>
                </h1>
                <p className="text-ink-light/60 max-w-2xl mx-auto leading-relaxed">
                    손바닥의 선들은 당신의 육체적 에너지와 운명적 흐름을 담고 있습니다.<br />
                    AI 분석을 통해 현재 당신에게 필요한 개운 지압법을 제안해 드립니다.
                </p>
            </div>

            {/* Upload Area: Dark Frame */}
            <Card className={cn(
                "p-2 bg-surface/30 backdrop-blur-md border outline outline-1 outline-primary/20 shadow-xl transition-all h-full min-h-[400px] flex flex-col items-center justify-center overflow-hidden",
                !imagePreview && "border-dashed border-primary/30"
            )}>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {!imagePreview ? (
                    <div
                        className="w-full flex flex-col items-center justify-center p-12 text-center space-y-8 cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-24 h-24 mx-auto bg-surface border border-primary/20 flex items-center justify-center group-hover:border-primary group-hover:bg-surface/50 transition-all transform group-hover:-translate-y-1">
                            <Upload className="w-10 h-10 text-primary/50 group-hover:text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-serif font-bold text-ink-light">손바닥 사진을 모셔오세요</h2>
                            <p className="text-ink-light/60 text-sm max-w-sm mx-auto leading-relaxed">
                                사진 한 구석이라도 잘리지 않도록 밝은 곳에서 촬영해 주세요.<br />
                                정교한 분석을 위해 고화질 사진을 권장합니다.
                            </p>
                        </div>
                        <Button className="bg-primary-dim text-background hover:bg-primary font-serif font-bold px-10 h-14 shadow-md transition-colors">
                            <Camera className="w-5 h-5 mr-3" />
                            사진 선택하기
                        </Button>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center p-8 space-y-8">
                        <div className="relative w-full max-w-sm aspect-[3/4] overflow-hidden shadow-2xl border border-primary/30 bg-surface">
                            <img
                                src={imagePreview}
                                alt="Uploaded palm"
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={handleClearImage}
                                className="absolute top-4 right-4 p-2 bg-black/60 text-white hover:bg-black transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            {analysis && (
                                <div className="absolute bottom-4 right-4 p-2 bg-primary text-background shadow-lg animate-in zoom-in">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-950/20 px-4 py-2 border border-red-900/50 text-sm">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}

                        <div className="flex gap-4 w-full justify-center pb-4">
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="border-primary/20 hover:bg-surface text-ink-light font-serif h-14 text-lg px-8"
                            >
                                다른 사진으로 교체
                            </Button>
                            <Button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="bg-primary-dim text-background hover:bg-primary font-serif font-bold px-12 h-14 text-lg shadow-xl active:scale-[0.98] transition-all"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                        기운 분석 중...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-3" />
                                        {isGuest ? "로그인하고 분석하기" : `운명 분석하기 (${TALISMAN_COSTS_DISPLAY.palmAnalysis} 부적)`}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {analysis && (
                <div className="space-y-12 animate-in slide-in-from-bottom-8 fade-in duration-1000">

                    {/* Result Header */}
                    <Card className="p-8 bg-surface/30 backdrop-blur-md border border-primary/20 shadow-lg text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                        <div className="space-y-3">
                            <h3 className="text-xl font-serif font-bold text-ink-light/70 italic tracking-wider">나의 손금 기운 점수 (Synergy Score)</h3>
                            <div className="text-8xl font-serif font-black text-ink-light tracking-tighter">
                                {analysis.currentScore}
                            </div>
                            <p className="text-sm font-bold text-primary uppercase tracking-[0.3em]">Fortune & Health Evaluation</p>
                        </div>
                    </Card>

                    {/* Analysis Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: "생명선 (Health)", val: analysis.majorLines?.life, icon: Activity, col: "text-green-500" },
                            { title: "두뇌선 (Wisdom)", val: analysis.majorLines?.head, icon: Brain, col: "text-blue-500" },
                            { title: "감정선 (Emotion)", val: analysis.majorLines?.heart, icon: Heart, col: "text-pink-500" },
                            { title: "운명선 (Fate)", val: analysis.majorLines?.fate, icon: User, col: "text-purple-500" }
                        ].map((line, idx) => (
                            <Card key={idx} className="bg-surface/20 border border-primary/20 hover:border-primary/50 transition-colors shadow-sm h-full group">
                                <CardHeader className="p-5 pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 bg-surface/50 transition-colors group-hover:bg-surface", line.col)}>
                                            <line.icon className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-base font-serif font-bold text-ink-light">{line.title}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 pt-2">
                                    <p className="text-sm text-ink-light/60 leading-relaxed font-sans">{line.val || "기운을 확인할 수 없습니다."}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Acupressure Guide */}
                    {analysis.acupressure && analysis.acupressure.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 underline decoration-primary decoration-4 underline-offset-8">
                                <Sparkles className="w-6 h-6 text-primary" />
                                <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink-light italic">오늘의 기운을 밝히는 지압법</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                {analysis.acupressure.map((point: any, i: number) => (
                                    <Card key={i} className="bg-surface/20 border border-primary/20 overflow-hidden group hover:border-primary transition-all shadow-md">
                                        <div className="h-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                                        <div className="p-6 space-y-5">
                                            <div className="flex items-center justify-between">
                                                <Badge className="bg-surface text-primary border border-primary/30 font-bold text-sm px-3 py-1 shadow-none">
                                                    {point.name}
                                                </Badge>
                                                <span className="text-[10px] font-mono font-bold text-ink-light/40 italic">POINT {i + 1}</span>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[10px] text-primary mb-1 font-bold uppercase tracking-widest">효능</p>
                                                    <p className="text-sm text-ink-light font-bold font-serif leading-relaxed">{point.effect}</p>
                                                </div>
                                                <div className="h-[1px] bg-primary/10 w-full" />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-ink-light/40 mb-1 font-bold uppercase">위치</p>
                                                        <p className="text-xs text-ink-light/60 leading-relaxed font-sans">{point.location}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-ink-light/40 mb-1 font-bold uppercase">방법</p>
                                                        <p className="text-xs text-ink-light/60 leading-relaxed font-sans">{point.method}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detailed Analysis Content */}
                    <Card className="p-10 bg-surface/30 backdrop-blur-md border border-primary/20 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Hand className="w-48 h-48 text-primary" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-ink-light mb-8 border-b border-primary/20 pb-4 italic">심층 손금 감명 리포트</h2>
                        <div className="prose prose-invert max-w-none text-ink-light/80 leading-[1.8] font-sans prose-headings:font-serif prose-headings:text-ink-light">
                            <ReactMarkdown>{analysis.currentAnalysis}</ReactMarkdown>
                        </div>
                        <div className="mt-12 flex justify-center">
                            <Button variant="outline" className="h-14 px-10 border-primary/20 text-ink-light hover:bg-surface font-serif text-lg gap-3">
                                <ArrowRight className="w-5 h-5" /> 리포트 저장 및 비록함 이동
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
