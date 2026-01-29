"use client";

import { useState, useRef, useEffect } from "react";
import { Scan, Upload, Sparkles, Loader2, Camera, X, CheckCircle, TrendingUp, Heart, Crown, ArrowRight, Info, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { analyzeFaceForDestiny, generateDestinyImage } from "@/app/actions/ai-saju";
import { TALISMAN_COSTS_DISPLAY, type FaceDestinyGoal } from "@/lib/constants";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const GOAL_OPTIONS: { value: FaceDestinyGoal; label: string; icon: any; color: string; desc: string; zenLabel: string }[] = [
    { value: "wealth", label: "CEO의 상", icon: TrendingUp, color: "text-amber-500", desc: "재물운(財物運)을 부르는 중후하고 명확한 인상", zenLabel: "재물(財)" },
    { value: "love", label: "아이돌의 상", icon: Heart, color: "text-rose-500", desc: "도화운(桃花運)을 부르는 매력적이고 부드러운 인상", zenLabel: "애정(愛)" },
    { value: "authority", label: "장군의 상", icon: Crown, color: "text-purple-500", desc: "권위운(權威運)을 부르는 강인하고 위엄 있는 인상", zenLabel: "명예(名)" },
];

export default function FaceDestinyPage() {
    const router = useRouter();
    const [isGuest, setIsGuest] = useState(true);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [selectedGoal, setSelectedGoal] = useState<FaceDestinyGoal>("wealth");
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [genLoading, setGenLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
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
        if (isGuest) {
            toast.error("로그인이 필요한 기능입니다.");
            router.push("/auth/sign-up");
            return;
        }

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
        if (isGuest) {
            toast.error("로그인이 필요한 기능입니다.");
            router.push("/auth/sign-up");
            return;
        }

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
                const errorMsg = 'error' in result ? result.error : "이미지 생성 실패";
                toast.error(errorMsg || "이미지 생성 실패");
            }
        } catch (err) {
            toast.error("이미지 생성 중 오류가 발생했습니다.");
        } finally {
            setGenLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-12 px-6 pb-24 font-sans">

            {/* Header: Dark Luxury Style */}
            <div className="text-center space-y-4 animate-in fade-in duration-700">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-primary/20 backdrop-blur-sm mb-2">
                    <Scan className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Face Destiny Simulation</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-ink-light italic">
                    AI <span className="text-primary-dim">관상 개운(開運)</span>
                </h1>
                <p className="text-ink-light/60 max-w-2xl mx-auto leading-relaxed">
                    관상은 고정된 것이 아니라 마음과 습관에 따라 변화합니다.<br />
                    AI가 당신의 오관(五官)을 살펴 복을 부르는 얼굴로의 가이드를 제시합니다.
                </p>
            </div>

            {/* Goal Selection: Square Cards */}
            <div className="space-y-6">
                <h2 className="text-xl font-serif font-bold text-ink-light flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    추구하는 개운 목표
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {GOAL_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setSelectedGoal(option.value)}
                            className={cn(
                                "relative p-6 border transition-all text-left group overflow-hidden h-full flex flex-col",
                                selectedGoal === option.value
                                    ? "border-primary bg-surface/30 shadow-lg ring-1 ring-primary/50"
                                    : "border-primary/20 bg-surface/10 hover:bg-surface/20 hover:border-primary/50 shadow-sm"
                            )}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn("p-2 bg-surface border border-primary/10", option.color)}>
                                    <option.icon className="w-6 h-6" />
                                </div>
                                <span className="font-serif font-bold text-sm opacity-30 text-ink-light">{option.zenLabel}</span>
                            </div>
                            <h3 className="font-serif font-bold text-lg text-ink-light mb-2 tracking-tight group-hover:text-primary transition-colors">{option.label}</h3>
                            <p className="text-xs text-ink-light/60 leading-relaxed font-sans">{option.desc}</p>

                            {selectedGoal === option.value && (
                                <div className="absolute top-2 right-2">
                                    <div className="w-1.5 h-1.5 bg-primary" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Upload & Compare: Dark Frame */}
            <Card className={cn(
                "p-2 bg-surface/30 backdrop-blur-md border border-primary/20 shadow-xl relative overflow-hidden",
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
                        className="w-full flex flex-col items-center justify-center py-20 px-8 text-center space-y-8 cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-24 h-24 mx-auto bg-surface border border-primary/20 flex items-center justify-center group-hover:border-primary group-hover:bg-surface/50 transition-all transform group-hover:-translate-y-1 shadow-sm">
                            <Upload className="w-10 h-10 text-primary/50 group-hover:text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-serif font-bold text-ink-light italic">정면 얼굴을 모셔오세요</h2>
                            <p className="text-ink-light/60 text-sm max-w-sm mx-auto leading-relaxed">
                                안경이나 모자가 없는 선명한 사진일수록 <br />
                                정교한 개운 시뮬레이션이 가능합니다.
                            </p>
                        </div>
                        <Button className="bg-primary-dim text-background hover:bg-primary font-serif font-bold px-10 h-14 shadow-md transition-colors">
                            <Camera className="w-5 h-5 mr-3" />
                            사진 선택하기
                        </Button>
                    </div>
                ) : (
                    <div className="w-full p-8 flex flex-col items-center space-y-10">
                        <div className="flex flex-col md:flex-row gap-12 items-center justify-center w-full">
                            {/* Original */}
                            <div className="relative group">
                                <span className="absolute -top-4 left-0 text-[10px] font-bold text-ink-light/50 tracking-widest uppercase">Before</span>
                                <div className="relative w-full max-w-xs aspect-square overflow-hidden border border-primary/30 shadow-xl">
                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Original" />
                                    <button
                                        onClick={handleClearImage}
                                        className="absolute top-2 right-2 p-2 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex items-center justify-center py-4">
                                <div className={cn(
                                    "w-12 h-12 flex items-center justify-center bg-surface text-primary border border-primary/30 shadow-inner transition-transform",
                                    generatedImage ? "rotate-0 scale-110" : "rotate-90 md:rotate-0 opacity-30"
                                )}>
                                    <ArrowRight className="w-6 h-6" />
                                </div>
                            </div>

                            {/* Generated */}
                            <div className="relative group">
                                <span className="absolute -top-4 left-0 text-[10px] font-bold text-primary tracking-widest uppercase">After (Simulation)</span>
                                <div className={cn(
                                    "relative w-full max-w-xs aspect-square overflow-hidden border border-primary/30 shadow-2xl bg-surface flex items-center justify-center",
                                    !generatedImage && "opacity-50"
                                )}>
                                    {generatedImage ? (
                                        <img src={generatedImage} className="w-full h-full object-cover animate-in fade-in duration-1000" alt="Generated" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-ink-light/30 p-8 text-center text-xs">
                                            <Sparkles className="w-8 h-8 opacity-20" />
                                            분석 완료 후 <br />이미지 생성을 시작하세요.
                                        </div>
                                    )}
                                </div>
                                {generatedImage && (
                                    <Button size="icon" className="absolute top-2 right-2 bg-primary text-background hover:bg-primary-light" onClick={() => {
                                        const link = document.createElement('a'); link.href = generatedImage; link.download = 'destiny-face.png'; link.click();
                                    }}>
                                        <CheckCircle className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {error && <div className="flex items-center gap-2 text-red-400 bg-red-950/20 px-4 py-2 border border-red-900/50 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}

                        {!analysis && (
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-14 px-8 border-primary/20 font-serif hover:bg-surface text-ink-light">다시 선택</Button>
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="h-14 px-12 bg-primary-dim text-background hover:bg-primary font-serif font-bold shadow-xl transition-colors"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-3" />}
                                    {isGuest ? "로그인하고 분석하기" : `관상 분석하기 (${TALISMAN_COSTS_DISPLAY.faceAnalysis} 부적)`}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Analysis Results */}
            {analysis && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">

                    {/* Score Compare Banner */}
                    <Card className="p-8 bg-surface/30 backdrop-blur-md border border-primary/20 shadow-md text-center">
                        <div className="flex items-center justify-center gap-12 md:gap-20">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-ink-light/60 uppercase tracking-widest italic">Current</p>
                                <div className="text-6xl font-serif font-black text-ink-light/20">{analysis.currentScore}</div>
                            </div>
                            <div className="h-12 w-[1px] bg-primary/20" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest italic font-sans italic">With Destiny Hacking</p>
                                <div className="text-7xl font-serif font-black text-primary tracking-tighter">{Math.min(100, analysis.currentScore + 20)}</div>
                            </div>
                        </div>
                    </Card>

                    {/* Acupressure / Massage Guide */}
                    {analysis.acupressure && analysis.acupressure.length > 0 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-serif font-bold text-ink-light flex items-center gap-3 italic">건강한 얼굴 기운을 만드는 지압법</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {analysis.acupressure.map((point: any, i: number) => (
                                    <Card key={i} className="bg-surface/20 border border-primary/20 p-6 group hover:border-primary/50 transition-all shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <Badge className="bg-surface text-primary border border-primary/30 font-bold">{point.name}</Badge>
                                            <span className="text-[10px] font-mono font-bold text-ink-light/40 italic">POINT {i + 1}</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div><p className="text-[9px] font-bold text-primary uppercase mb-1">효능</p><p className="text-sm font-serif font-bold text-ink-light">{point.effect}</p></div>
                                            <div className="h-[1px] bg-primary/10 w-full" />
                                            <div><p className="text-[9px] font-bold text-ink-light/40 uppercase mb-1">방법</p><p className="text-xs text-ink-light/70 leading-relaxed font-sans">{point.method}</p></div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detailed Analysis Content */}
                    <Card className="p-10 bg-surface/30 backdrop-blur-md border border-primary/20 shadow-xl border-t-4 border-t-primary">
                        <h2 className="text-2xl font-serif font-bold text-ink-light mb-8 italic flex items-center gap-3">
                            <Info className="w-5 h-5 text-primary" /> 심층 관상 감명 리포트
                        </h2>
                        <div className="prose prose-invert max-w-none text-ink-light/80 leading-[1.8] font-sans prose-headings:font-serif prose-headings:text-ink-light prose-strong:text-primary">
                            <ReactMarkdown>{analysis.currentAnalysis}</ReactMarkdown>
                        </div>
                    </Card>

                    {/* Image Generation Action */}
                    {!generatedImage && (
                        <Card className="p-12 md:p-16 bg-[#1A1917] bg-opacity-90 border border-primary/20 text-white shadow-2xl text-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:rotate-12 transition-transform duration-1000"><Scan className="w-64 h-64" /></div>
                            <div className="relative z-10 space-y-6">
                                <h3 className="text-3xl md:text-4xl font-serif font-bold italic mb-4">운명이 바뀌는 찰나를 시뮬레이션 하세요</h3>
                                <p className="text-white/70 max-w-lg mx-auto leading-relaxed mb-8">
                                    제시된 관상학적 가이드를 당신의 실제 모습에 투영합니다. <br />
                                    가장 이상적인 개운(開運) 페이스를 확인하고 이미지로 간직하세요.
                                </p>
                                <Button
                                    onClick={handleGenerateImage}
                                    disabled={genLoading}
                                    className="h-16 px-12 bg-primary text-background hover:bg-primary-light font-serif font-bold text-xl shadow-2xl transition-all active:scale-[.98]"
                                >
                                    {genLoading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Sparkles className="w-6 h-6 mr-3 text-background" />}
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
