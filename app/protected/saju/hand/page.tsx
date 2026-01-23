"use client";

import { useState, useRef } from "react";
import { Hand, Upload, Sparkles, Loader2, Camera, X, CheckCircle, Brain, Heart, Activity, User, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { analyzePalm } from "@/app/actions/ai-saju";
import { TALISMAN_COSTS_DISPLAY } from "@/lib/constants";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function PalmReadingPage() {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

            {/* Header: Zen Style */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-zen-border shadow-sm">
                    <Hand className="w-4 h-4 text-zen-gold" />
                    <span className="text-[10px] font-bold text-zen-muted uppercase tracking-[0.2em]">Palmistry Intelligence</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-zen-text italic">
                    운명의 지도, <span className="text-zen-wood">손금과 지압</span>
                </h1>
                <p className="text-zen-muted max-w-2xl mx-auto leading-relaxed">
                    손바닥의 선들은 당신의 육체적 에너지와 운명적 흐름을 담고 있습니다.<br />
                    AI 분석을 통해 현재 당신에게 필요한 개운 지압법을 제안해 드립니다.
                </p>
            </div>

            {/* Upload Area: Zen Styled Card */}
            <Card className={cn(
                "p-2 bg-white border outline outline-1 outline-zen-border/50 rounded-sm shadow-xl transition-all h-full min-h-[400px] flex flex-col items-center justify-center overflow-hidden",
                !imagePreview && "border-dashed border-zen-border"
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
                        <div className="w-24 h-24 mx-auto rounded-sm bg-zen-bg border border-zen-border flex items-center justify-center group-hover:bg-zen-wood group-hover:text-white transition-all transform group-hover:-translate-y-1">
                            <Upload className="w-10 h-10 text-zen-muted group-hover:text-white" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-serif font-bold text-zen-text">손바닥 사진을 모셔오세요</h2>
                            <p className="text-zen-muted text-sm max-w-sm mx-auto leading-relaxed">
                                사진 한 구석이라도 잘리지 않도록 밝은 곳에서 촬영해 주세요.<br />
                                정교한 분석을 위해 고화질 사진을 권장합니다.
                            </p>
                        </div>
                        <Button className="bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold px-10 h-14 rounded-sm shadow-md">
                            <Camera className="w-5 h-5 mr-3" />
                            사진 선택하기
                        </Button>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center p-8 space-y-8">
                        <div className="relative w-full max-w-sm aspect-[3/4] rounded-sm overflow-hidden shadow-2xl border-4 border-white ring-1 ring-zen-border">
                            <img
                                src={imagePreview}
                                alt="Uploaded palm"
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={handleClearImage}
                                className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-sm hover:bg-black transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            {analysis && (
                                <div className="absolute bottom-4 right-4 p-2 bg-zen-gold text-white rounded-sm shadow-lg animate-in zoom-in">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 bg-red-50 px-4 py-2 rounded-sm border border-red-100 text-sm">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}

                        <div className="flex gap-4 w-full justify-center pb-4">
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="border-zen-border hover:bg-zen-bg font-serif h-14 text-lg rounded-sm px-8"
                            >
                                다른 사진으로 교체
                            </Button>
                            <Button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold px-12 h-14 text-lg rounded-sm shadow-xl active:scale-[0.98] transition-all"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                        기운 분석 중...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-3" />
                                        운명 분석하기 ({TALISMAN_COSTS_DISPLAY.palmAnalysis} 부적)
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
                    <Card className="p-8 bg-white border-zen-border rounded-sm shadow-lg text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-zen-gold" />
                        <div className="space-y-3">
                            <h3 className="text-xl font-serif font-bold text-zen-text opacity-70 italic tracking-wider">나의 손금 기운 점수 (Synergy Score)</h3>
                            <div className="text-8xl font-serif font-black text-zen-text tracking-tighter">
                                {analysis.currentScore}
                            </div>
                            <p className="text-sm font-bold text-zen-gold uppercase tracking-[0.3em]">Fortune & Health Evaluation</p>
                        </div>
                    </Card>

                    {/* Analysis Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: "생명선 (Health)", val: analysis.majorLines?.life, icon: Activity, col: "text-green-600" },
                            { title: "두뇌선 (Wisdom)", val: analysis.majorLines?.head, icon: Brain, col: "text-blue-600" },
                            { title: "감정선 (Emotion)", val: analysis.majorLines?.heart, icon: Heart, col: "text-pink-600" },
                            { title: "운명선 (Fate)", val: analysis.majorLines?.fate, icon: User, col: "text-purple-600" }
                        ].map((line, idx) => (
                            <Card key={idx} className="bg-white border-zen-border hover:border-zen-gold/50 transition-colors shadow-sm h-full group">
                                <CardHeader className="p-5 pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-sm bg-zen-bg transition-colors group-hover:bg-white", line.col)}>
                                            <line.icon className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-base font-serif font-bold">{line.title}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 pt-2">
                                    <p className="text-sm text-zen-muted leading-relaxed font-sans">{line.val || "기운을 확인할 수 없습니다."}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Acupressure Guide */}
                    {analysis.acupressure && analysis.acupressure.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 underline decoration-zen-gold decoration-4 underline-offset-8">
                                <Sparkles className="w-6 h-6 text-zen-gold" />
                                <h2 className="text-2xl md:text-3xl font-serif font-bold text-zen-text italic">오늘의 기운을 밝히는 지압법</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                {analysis.acupressure.map((point: any, i: number) => (
                                    <Card key={i} className="bg-white border-zen-border overflow-hidden group hover:border-zen-gold transition-all shadow-md">
                                        <div className="h-1 bg-zen-wood/20 group-hover:bg-zen-gold transition-colors" />
                                        <div className="p-6 space-y-5">
                                            <div className="flex items-center justify-between">
                                                <Badge className="bg-zen-bg text-zen-wood border border-zen-border font-bold text-sm px-3 py-1 rounded-sm shadow-none">
                                                    {point.name}
                                                </Badge>
                                                <span className="text-[10px] font-mono font-bold text-zen-muted italic">POINT {i + 1}</span>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[10px] text-zen-muted mb-1 font-bold uppercase tracking-widest text-zen-gold">효능</p>
                                                    <p className="text-sm text-zen-text font-bold font-serif leading-relaxed">{point.effect}</p>
                                                </div>
                                                <div className="h-[1px] bg-zen-bg w-full" />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-zen-muted mb-1 font-bold uppercase">위치</p>
                                                        <p className="text-xs text-zen-muted leading-relaxed font-sans">{point.location}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-zen-muted mb-1 font-bold uppercase">방법</p>
                                                        <p className="text-xs text-zen-muted leading-relaxed font-sans">{point.method}</p>
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
                    <Card className="p-10 bg-white border-zen-border rounded-sm shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Hand className="w-48 h-48 text-zen-text" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-zen-text mb-8 border-b border-zen-border pb-4 italic">심층 손금 감명 리포트</h2>
                        <div className="prose prose-stone max-w-none text-zen-text/80 leading-[1.8] font-sans prose-headings:font-serif prose-headings:text-zen-text">
                            <ReactMarkdown>{analysis.currentAnalysis}</ReactMarkdown>
                        </div>
                        <div className="mt-12 flex justify-center">
                            <Button variant="outline" className="h-14 px-10 border-zen-border font-serif text-lg gap-3">
                                <ArrowRight className="w-5 h-5" /> 리포트 저장 및 비록함 이동
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

function AlertCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
    )
}
