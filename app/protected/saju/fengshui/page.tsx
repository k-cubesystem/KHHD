"use client";

import { useState, useRef } from "react";
import { Home, Upload, Sparkles, Loader2, Camera, X, CheckCircle, DollarSign, Heart, Brain, ArrowRight, AlertTriangle, Compass } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { analyzeInteriorForFengshui, generateDestinyImage } from "@/app/actions/ai-saju";
import { TALISMAN_COSTS_DISPLAY, type InteriorTheme } from "@/lib/constants";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: InteriorTheme; label: string; icon: any; color: string; desc: string; zenLabel: string }[] = [
    { value: "wealth", label: "재물 가득", icon: DollarSign, color: "text-amber-700", desc: "돈이 쌓이는 기운의 황금빛 인테리어", zenLabel: "재(財)" },
    { value: "romance", label: "사랑 가득", icon: Heart, color: "text-rose-700", desc: "연애운과 화합을 부르는 로맨틱 인테리어", zenLabel: "애(愛)" },
    { value: "health", label: "건강/집중", icon: Brain, color: "text-emerald-700", desc: "심신 안정과 에너지를 높이는 인테리어", zenLabel: "강(康)" },
];

const ROOM_TYPES = ["거실", "침실", "서재", "주방", "현관"];

export default function FengshuiPage() {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [selectedTheme, setSelectedTheme] = useState<InteriorTheme>("wealth");
    const [selectedRoom, setSelectedRoom] = useState<string>("거실");
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
            toast.error("먼저 방 사진을 업로드해주세요.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await analyzeInteriorForFengshui(imageBase64, selectedTheme, selectedRoom);

            if (result.success) {
                setAnalysis(result);
                toast.success("풍수 분석이 완료되었습니다!");
            } else {
                setError(result.error || "풍수 분석 중 오류가 발생했습니다.");
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
            const result = await generateDestinyImage(analysis.imagePrompt, "interior");

            if (result.success && 'imageData' in result && result.imageData) {
                setGeneratedImage(result.imageData);
                toast.success("풍수 인테리어 이미지가 생성되었습니다!");
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
                    <Compass className="w-4 h-4 text-zen-gold" />
                    <span className="text-[10px] font-bold text-zen-muted uppercase tracking-[0.2em]">Feng Shui Spatial Intelligence</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-zen-text italic">
                    AI <span className="text-zen-wood">풍수 인테리어</span>
                </h1>
                <p className="text-zen-muted max-w-2xl mx-auto leading-relaxed">
                    머무는 공간의 기운이 삶의 질을 결정합니다.<br />
                    AI가 현재 공간의 배치를 분석하고 최적의 풍수지리 인테리어를 제안합니다.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Theme Selector: Zen Sidebar Style */}
                <Card className="lg:col-span-8 bg-white border border-zen-border rounded-sm p-8 shadow-sm">
                    <h2 className="text-xl font-serif font-bold text-zen-text mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-zen-gold" />
                        개운(開運) 테마 설정
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {THEME_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSelectedTheme(option.value)}
                                className={cn(
                                    "p-6 rounded-sm border transition-all text-left flex flex-col justify-between h-full group",
                                    selectedTheme === option.value
                                        ? "border-zen-gold bg-zen-bg/10 ring-1 ring-zen-gold shadow-lg"
                                        : "border-zen-border bg-white hover:border-zen-gold shadow-sm"
                                )}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className={cn("p-2 rounded-sm bg-zen-bg", option.color)}>
                                        <option.icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-bold text-zen-muted opacity-30">{option.zenLabel}</span>
                                </div>
                                <div>
                                    <h3 className="font-serif font-bold text-lg mb-1 group-hover:text-zen-wood transition-colors">{option.label}</h3>
                                    <p className="text-[10px] text-zen-muted leading-relaxed uppercase tracking-tighter opacity-70">Energy Optimization</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Room Selector: Compact Box */}
                <Card className="lg:col-span-4 bg-white border border-zen-border rounded-sm p-8 shadow-sm flex flex-col justify-center">
                    <h2 className="text-xl font-serif font-bold text-zen-text mb-4">분석할 공간 영역</h2>
                    <p className="text-xs text-zen-muted mb-6 leading-relaxed">
                        선택하신 영역의 특성을 고려하여 <br />
                        맞춤형 가이드를 생성합니다.
                    </p>
                    <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                        <SelectTrigger className="bg-zen-bg border-zen-border rounded-sm h-14 font-serif text-lg font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-sm border-zen-border">
                            {ROOM_TYPES.map((room) => (
                                <SelectItem key={room} value={room} className="font-serif">
                                    {room}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Card>
            </div>

            {/* Analysis UI: Comparison Frame */}
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
                            <h2 className="text-2xl font-serif font-bold text-zen-text">공간 사진을 업로드하세요</h2>
                            <p className="text-zen-muted text-sm max-w-sm mx-auto leading-relaxed">
                                {selectedRoom} 내부를 각도가 잘 드러나게 촬영하시면 <br />
                                정교한 풍수 시뮬레이션이 진행됩니다.
                            </p>
                        </div>
                        <Button className="bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold px-10 h-14 rounded-sm shadow-md">
                            <Camera className="w-5 h-5 mr-3" />
                            공간 사진 선택
                        </Button>
                    </div>
                ) : (
                    <div className="w-full p-8 flex flex-col items-center space-y-10">
                        <div className="flex flex-col md:flex-row gap-8 items-center justify-center w-full">
                            {/* Before */}
                            <div className="relative group flex-1 max-w-xl">
                                <span className="absolute -top-4 left-0 text-[10px] font-bold text-zen-muted tracking-widest uppercase">Current (Before)</span>
                                <div className="relative aspect-video rounded-sm overflow-hidden border-4 border-white shadow-xl ring-1 ring-zen-border">
                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Original" />
                                    <button
                                        onClick={handleClearImage}
                                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Center Arrow */}
                            <div className="flex items-center justify-center py-4">
                                <div className={cn(
                                    "w-12 h-12 flex items-center justify-center rounded-full bg-zen-bg text-zen-gold border border-zen-border shadow-inner transition-all",
                                    generatedImage ? "rotate-0 scale-110" : "rotate-90 md:rotate-0 opacity-30"
                                )}>
                                    <ArrowRight className="w-6 h-6" />
                                </div>
                            </div>

                            {/* After */}
                            <div className="relative group flex-1 max-w-xl">
                                <span className="absolute -top-4 left-0 text-[10px] font-bold text-zen-wood tracking-widest uppercase">Optimized (After)</span>
                                <div className={cn(
                                    "relative aspect-video rounded-sm overflow-hidden border-4 border-white shadow-2xl ring-1 ring-zen-gold bg-zen-bg flex items-center justify-center",
                                    !generatedImage && "opacity-50"
                                )}>
                                    {generatedImage ? (
                                        <img src={generatedImage} className="w-full h-full object-cover animate-in fade-in duration-1000" alt="Generated" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-zen-muted p-4 text-center text-xs">
                                            <Sparkles className="w-8 h-8 opacity-20" />
                                            공간 운명 설계...
                                        </div>
                                    )}
                                </div>
                                {generatedImage && (
                                    <Button size="icon" className="absolute top-2 right-2 bg-white/90 text-zen-text hover:bg-white rounded-sm" onClick={() => {
                                        const link = document.createElement('a'); link.href = generatedImage; link.download = 'fengshui-interior.png'; link.click();
                                    }}>
                                        <Home className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {!analysis && (
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-14 px-8 border-zen-border font-serif rounded-sm">다른 사진</Button>
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="h-14 px-12 bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold rounded-sm shadow-xl"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Compass className="w-5 h-5 mr-3" />}
                                    풍수 분석하기 ({TALISMAN_COSTS_DISPLAY.interiorAnalysis} 부적)
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Analysis Findings: Zen Alert Style */}
            {analysis && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">

                    {/* Problems Card */}
                    {analysis.problems && analysis.problems.length > 0 && (
                        <Card className="bg-white border-2 border-dashed border-red-200 rounded-sm p-8 shadow-sm">
                            <h3 className="text-xl font-serif font-bold mb-6 text-red-900 flex items-center gap-3 italic">
                                <AlertTriangle className="w-6 h-6 text-red-600" /> 개선이 시급한 풍수 결함
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {analysis.problems.map((problem: string, i: number) => (
                                    <div key={i} className="flex gap-4 p-5 rounded-sm bg-red-50 border border-red-100">
                                        <div className="text-red-900 font-serif font-bold text-xl opacity-30 mt-[-4px]">/{i + 1}</div>
                                        <p className="text-sm text-red-900 leading-relaxed font-sans">{problem}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Detailed Result Card */}
                    <Card className="p-10 bg-white border border-zen-border rounded-sm shadow-xl border-t-4 border-t-zen-wood">
                        <h2 className="text-2xl font-serif font-bold text-zen-text mb-8 italic flex items-center gap-3">
                            <Compass className="w-6 h-6 text-zen-wood" /> 공간 개선 비책 (秘策)
                        </h2>
                        <div className="prose prose-stone max-w-none text-zen-text/80 leading-[1.8] font-sans prose-headings:font-serif">
                            <ReactMarkdown>{analysis.currentAnalysis}</ReactMarkdown>
                        </div>
                    </Card>

                    {/* Visual Action */}
                    {!generatedImage && (
                        <Card className="p-12 md:p-16 bg-white border border-zen-border rounded-sm shadow-2xl text-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000"><Home className="w-64 h-64 text-zen-text" /></div>
                            <div className="relative z-10 space-y-6">
                                <h3 className="text-3xl md:text-4xl font-serif font-bold text-zen-text italic mb-4 tracking-tight">당신의 터에 새겨질 새로운 기운</h3>
                                <p className="text-zen-muted max-w-lg mx-auto leading-relaxed mb-8">
                                    제시된 비책이 적용된 공간의 미래를 확인하세요. <br />
                                    가구의 재배치와 색채의 변화만으로도 운명의 흐름은 바뀝니다.
                                </p>
                                <Button
                                    onClick={handleGenerateImage}
                                    disabled={genLoading}
                                    className="h-16 px-12 bg-zen-wood text-white hover:bg-[#7A604D] font-serif font-bold text-xl rounded-sm shadow-2xl transition-all"
                                >
                                    {genLoading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Sparkles className="w-6 h-6 mr-3 text-zen-gold" />}
                                    {genLoading ? "공간 형상을 재창조하는 중..." : `인테리어 변신하기 (${TALISMAN_COSTS_DISPLAY.imageGeneration} 부적)`}
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
