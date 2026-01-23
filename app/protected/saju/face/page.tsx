"use client";

import { useState, useRef } from "react";
import { Scan, Upload, Sparkles, Loader2, Camera, X, CheckCircle, TrendingUp, Heart, Crown, ArrowRight, Info, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { analyzeFaceForDestiny, generateDestinyImage } from "@/app/actions/ai-saju";
import { TALISMAN_COSTS_DISPLAY, type FaceDestinyGoal } from "@/lib/constants";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GOAL_OPTIONS: { value: FaceDestinyGoal; label: string; icon: any; color: string; desc: string; zenLabel: string }[] = [
    { value: "wealth", label: "CEO의 상", icon: TrendingUp, color: "text-amber-700", desc: "재물운(財物運)을 부르는 중후하고 명확한 인상", zenLabel: "재물(財)" },
    { value: "love", label: "아이돌의 상", icon: Heart, color: "text-rose-700", desc: "도화운(桃花運)을 부르는 매력적이고 부드러운 인상", zenLabel: "애정(愛)" },
    { value: "authority", label: "장군의 상", icon: Crown, color: "text-purple-700", desc: "권위운(權威運)을 부르는 강인하고 위엄 있는 인상", zenLabel: "명예(名)" },
];

export default function FaceDestinyPage() {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [selectedGoal, setSelectedGoal] = useState<FaceDestinyGoal>("wealth");
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [genLoading, setGenLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
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
            setGeneratedImage(null);
        };
        reader.readAsDataURL(file);
    };

    const handleClearImage = () => {
        setImagePreview(null);
        setImageBase64(null);
        setAnalysis(null);
        setGeneratedImage(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleAnalyze = async () => {
        if (!imageBase64) {
            toast.error("먼저 이미지를 업로드해주세요.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await analyzeFaceForDestiny(imageBase64, selectedGoal);

            if (result.success) {
                setAnalysis(result);
                toast.success("관상 분석이 완료되었습니다!");
            } else {
                setError(result.error || "관상 분석 중 오류가 발생했습니다.");
            }
        } catch (err) {
            setError("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!analysis?.imagePrompt) {
            toast.error("분석 정보가 없습니다.");
            return;
        }

        setGenLoading(true);
        try {
            const result = await generateDestinyImage(
                analysis.imagePrompt,
                "face",
                analysis.faceDescription
            );

            if (result.success && 'imageData' in result && result.imageData) {
                setGeneratedImage(result.imageData);
                toast.success("개운(開運) 이미지가 생성되었습니다!");
            } else {
                toast.error(result.error || "이미지 생성 실패");
            }
        } catch (err) {
            toast.error("이미지 생성 중 오류가 발생했습니다.");
        } finally {
            setGenLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-12 px-6 pb-24 font-sans">

            {/* Header: Zen Style */}
            <div className="text-center space-y-4 animate-in fade-in duration-700">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-zen-border shadow-sm mb-2">
                    <Scan className="w-4 h-4 text-zen-gold" />
                    <span className="text-[10px] font-bold text-zen-muted uppercase tracking-[0.2em]">Face Destiny Simulation</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-zen-text italic">
                    AI <span className="text-zen-wood">관상 개운(開運)</span>
                </h1>
                <p className="text-zen-muted max-w-2xl mx-auto leading-relaxed">
                    관상은 고정된 것이 아니라 마음과 습관에 따라 변화합니다.<br />
                    AI가 당신의 오관(五官)을 살펴 복을 부르는 얼굴로의 가이드를 제시합니다.
                </p>
            </div>

            {/* Goal Selection: Sharp Cards */}
            <div className="space-y-6">
                <h2 className="text-xl font-serif font-bold text-zen-text flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-zen-gold" />
                    추구하는 개운 목표
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {GOAL_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setSelectedGoal(option.value)}
                            className={cn(
                                "relative p-6 rounded-sm border transition-all text-left group overflow-hidden h-full flex flex-col",
                                selectedGoal === option.value
                                    ? "border-zen-wood bg-white shadow-lg ring-1 ring-zen-wood"
                                    : "border-zen-border bg-white/50 hover:bg-white hover:border-zen-gold shadow-sm"
                            )}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn("p-2 rounded-sm bg-zen-bg", option.color)}>
                                    <option.icon className="w-6 h-6" />
                                </div>
                                <span className="font-serif font-bold text-sm opacity-30">{option.zenLabel}</span>
                            </div>
                            <h3 className="font-serif font-bold text-lg text-zen-text mb-2 tracking-tight group-hover:text-zen-wood transition-colors">{option.label}</h3>
                            <p className="text-xs text-zen-muted leading-relaxed font-sans">{option.desc}</p>

                            {selectedGoal === option.value && (
                                <div className="absolute top-2 right-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zen-wood" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Upload & Compare: Zen Frame */}
            <Card className={cn(
                "p-2 bg-white border border-zen-border rounded-sm shadow-xl relative overflow-hidden",
                !imagePreview && "border-dashed bg-zen-bg/20"
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
                        className="w-full flex flex-col items-center justify-center py-20 px-8 text-center space-y-8 cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-24 h-24 mx-auto rounded-sm bg-white border border-zen-border flex items-center justify-center group-hover:border-zen-gold group-hover:bg-zen-bg transition-all transform group-hover:-translate-y-1 shadow-sm">
                            <Upload className="w-10 h-10 text-zen-muted" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-serif font-bold text-zen-text italic">정면 얼굴을 모셔오세요</h2>
                            <p className="text-zen-muted text-sm max-w-sm mx-auto leading-relaxed">
                                안경이나 모자가 없는 선명한 사진일수록 <br />
                                정교한 개운 시뮬레이션이 가능합니다.
                            </p>
                        </div>
                        <Button className="bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold px-10 h-14 rounded-sm shadow-md">
                            <Camera className="w-5 h-5 mr-3" />
                            사진 선택하기
                        </Button>
                    </div>
                ) : (
                    <div className="w-full p-8 flex flex-col items-center space-y-10">
                        <div className="flex flex-col md:flex-row gap-12 items-center justify-center w-full">
                            {/* Original */}
                            <div className="relative group">
                                <span className="absolute -top-4 left-0 text-[10px] font-bold text-zen-muted tracking-widest uppercase">Before</span>
                                <div className="relative w-full max-w-xs aspect-square rounded-sm overflow-hidden border-4 border-white shadow-xl ring-1 ring-zen-border">
                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Original" />
                                    <button
                                        onClick={handleClearImage}
                                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex items-center justify-center py-4">
                                <div className={cn(
                                    "w-12 h-12 flex items-center justify-center rounded-full bg-zen-bg text-zen-gold border border-zen-border shadow-inner transition-transform",
                                    generatedImage ? "rotate-0 scale-110" : "rotate-90 md:rotate-0 opacity-30"
                                )}>
                                    <ArrowRight className="w-6 h-6" />
                                </div>
                            </div>

                            {/* Generated */}
                            <div className="relative group">
                                <span className="absolute -top-4 left-0 text-[10px] font-bold text-zen-wood tracking-widest uppercase">After (Simulation)</span>
                                <div className={cn(
                                    "relative w-full max-w-xs aspect-square rounded-sm overflow-hidden border-4 border-white shadow-2xl ring-1 ring-zen-gold bg-zen-bg flex items-center justify-center",
                                    !generatedImage && "opacity-50"
                                )}>
                                    {generatedImage ? (
                                        <img src={generatedImage} className="w-full h-full object-cover animate-in fade-in duration-1000" alt="Generated" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-zen-muted p-8 text-center text-xs">
                                            <Sparkles className="w-8 h-8 opacity-20" />
                                            분석 완료 후 <br />이미지 생성을 시작하세요.
                                        </div>
                                    )}
                                </div>
                                {generatedImage && (
                                    <Button size="icon" className="absolute top-2 right-2 bg-white/90 text-zen-text hover:bg-white rounded-sm" onClick={() => {
                                        const link = document.createElement('a'); link.href = generatedImage; link.download = 'destiny-face.png'; link.click();
                                    }}>
                                        <CheckCircle className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {error && <div className="flex items-center gap-2 text-red-500 bg-red-50 px-4 py-2 rounded-sm border border-red-100 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}

                        {!analysis && (
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-14 px-8 border-zen-border font-serif rounded-sm">다시 선택</Button>
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="h-14 px-12 bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold rounded-sm shadow-xl"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-3" />}
                                    관상 분석하기 ({TALISMAN_COSTS_DISPLAY.faceAnalysis} 부적)
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Analysis Results: Zen Detailed Cards */}
            {analysis && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">

                    {/* Score Compare Banner */}
                    <Card className="p-8 bg-white border-zen-border rounded-sm shadow-md text-center">
                        <div className="flex items-center justify-center gap-12 md:gap-20">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-zen-muted uppercase tracking-widest italic">Current</p>
                                <div className="text-6xl font-serif font-black text-zen-text/40">{analysis.currentScore}</div>
                            </div>
                            <div className="h-12 w-[1px] bg-zen-border" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-zen-wood uppercase tracking-widest italic font-sans italic">With Destiny Hacking</p>
                                <div className="text-7xl font-serif font-black text-zen-wood tracking-tighter">{Math.min(100, analysis.currentScore + 20)}</div>
                            </div>
                        </div>
                    </Card>

                    {/* Acupressure / Massage Guide */}
                    {analysis.acupressure && analysis.acupressure.length > 0 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-serif font-bold text-zen-text flex items-center gap-3 italic">건강한 얼굴 기운을 만드는 지압법</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {analysis.acupressure.map((point: any, i: number) => (
                                    <Card key={i} className="bg-white border-zen-border rounded-sm p-6 group hover:border-zen-gold transition-all shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <Badge className="bg-zen-bg text-zen-wood border border-zen-border rounded-sm shadow-none font-bold">{point.name}</Badge>
                                            <span className="text-[10px] font-mono font-bold text-zen-muted italic">POINT {i + 1}</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div><p className="text-[9px] font-bold text-zen-gold uppercase mb-1">효능</p><p className="text-sm font-serif font-bold text-zen-text">{point.effect}</p></div>
                                            <div className="h-[1px] bg-zen-bg w-full" />
                                            <div><p className="text-[9px] font-bold text-zen-muted uppercase mb-1">방법</p><p className="text-xs text-zen-muted leading-relaxed font-sans">{point.method}</p></div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detailed Analysis Content */}
                    <Card className="p-10 bg-white border-zen-border rounded-sm shadow-xl border-t-4 border-t-zen-wood">
                        <h2 className="text-2xl font-serif font-bold text-zen-text mb-8 italic flex items-center gap-3">
                            <Info className="w-5 h-5 text-zen-wood" /> 심층 관상 감명 리포트
                        </h2>
                        <div className="prose prose-stone max-w-none text-zen-text/80 leading-[1.8] font-sans prose-headings:font-serif">
                            <ReactMarkdown>{analysis.currentAnalysis}</ReactMarkdown>
                        </div>
                    </Card>

                    {/* Image Generation Action */}
                    {!generatedImage && (
                        <Card className="p-12 md:p-16 bg-zen-wood text-white rounded-sm shadow-2xl text-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-1000"><Scan className="w-64 h-64" /></div>
                            <div className="relative z-10 space-y-6">
                                <h3 className="text-3xl md:text-4xl font-serif font-bold italic mb-4">운명이 바뀌는 찰나를 시뮬레이션 하세요</h3>
                                <p className="text-white/70 max-w-lg mx-auto leading-relaxed mb-8">
                                    제시된 관상학적 가이드를 당신의 실제 모습에 투영합니다. <br />
                                    가장 이상적인 개운(開運) 페이스를 확인하고 이미지로 간직하세요.
                                </p>
                                <Button
                                    onClick={handleGenerateImage}
                                    disabled={genLoading}
                                    className="h-16 px-12 bg-white text-zen-wood hover:bg-zen-bg font-serif font-bold text-xl rounded-sm shadow-2xl transition-all active:scale-[.98]"
                                >
                                    {genLoading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Sparkles className="w-6 h-6 mr-3 text-zen-gold" />}
                                    {genLoading ? "AI가 개운 형상을 그리는 중..." : `개운 이미지 생성하기 (${TALISMAN_COSTS_DISPLAY.imageGeneration} 부적)`}
                                </Button>
                                <p className="text-[10px] text-white/40 mt-4 tracking-widest uppercase">Premium DALL-E 3 Visual Simulation Engine</p>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
