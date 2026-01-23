"use client";

import { useState, useRef } from "react";
import {
    Home, Upload, Camera, X, Loader2,
    Coins, Heart, Leaf, ChevronRight, Star,
    ShoppingBag, Lightbulb, Sparkles, Check
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { analyzeInteriorForFengshui, InteriorTheme } from "@/app/actions/ai-image";
import { TALISMAN_COSTS_DISPLAY } from "@/lib/constants";
import ReactMarkdown from "react-markdown";

const THEMES: { id: InteriorTheme; name: string; icon: any; desc: string; color: string; colors: string }[] = [
    { id: "wealth", name: "재물 가득", icon: Coins, desc: "풍요와 번영의 기운", color: "text-yellow-400", colors: "골드, 옐로우" },
    { id: "romance", name: "사랑 가득", icon: Heart, desc: "사랑과 인연의 기운", color: "text-pink-400", colors: "핑크, 피치" },
    { id: "health", name: "건강/집중", icon: Leaf, desc: "건강과 집중의 기운", color: "text-green-400", colors: "그린, 우드톤" },
];

const ROOM_TYPES = ["거실", "침실", "서재", "주방", "현관"];

export default function SpaceButlerPage() {
    const [selectedTheme, setSelectedTheme] = useState<InteriorTheme>("wealth");
    const [selectedRoom, setSelectedRoom] = useState("거실");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<"upload" | "options" | "result">("upload");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("이미지 파일만 업로드 가능합니다.");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError("10MB 이하의 이미지만 업로드 가능합니다.");
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
            setStep("options");
        };
        reader.readAsDataURL(file);
    };

    const handleClearImage = () => {
        setImagePreview(null);
        setImageBase64(null);
        setAnalysis(null);
        setError(null);
        setStep("upload");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleAnalyze = async () => {
        if (!imageBase64) {
            setError("먼저 이미지를 업로드해주세요.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await analyzeInteriorForFengshui(imageBase64, selectedTheme, selectedRoom);

            if (result.success) {
                setAnalysis(result);
                setStep("result");
            } else {
                setError(result.error || "분석 중 오류가 발생했습니다.");
            }
        } catch (err) {
            setError("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const selectedThemeConfig = THEMES.find(t => t.id === selectedTheme)!;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                    <Home className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Space Butler</span>
                </div>
                <h1 className="text-4xl font-black">
                    <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-[#D4AF37] bg-clip-text text-transparent">
                        AI 풍수 인테리어
                    </span>
                </h1>
                <p className="text-muted-foreground">
                    당신의 공간을 분석하고, 원하는 기운이 가득한 인테리어를 제안합니다
                </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 text-sm">
                {["사진 업로드", "옵션 선택", "분석 결과"].map((label, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${(step === "upload" && i === 0) ||
                            (step === "options" && i <= 1) ||
                            (step === "result" && i <= 2)
                            ? "bg-emerald-500 text-black"
                            : "bg-white/10 text-muted-foreground"
                            }`}>
                            {i + 1}
                        </div>
                        <span className={`hidden sm:block ${(step === "upload" && i === 0) ||
                            (step === "options" && i <= 1) ||
                            (step === "result" && i <= 2)
                            ? "text-white"
                            : "text-muted-foreground"
                            }`}>{label}</span>
                        {i < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                ))}
            </div>

            {/* Step 1: Upload */}
            {step === "upload" && (
                <Card className="p-8 bg-white/5 border-white/10 border-dashed border-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <div
                        className="text-center space-y-6 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center hover:from-emerald-500/30 hover:to-teal-500/30 transition-colors">
                            <Upload className="w-12 h-12 text-emerald-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold">방 사진 업로드</h2>
                            <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                분석하고 싶은 방의 전체 모습이 보이는 사진을 업로드하세요.
                                <br />거실, 침실, 서재 등 개선하고 싶은 공간을 촬영해주세요.
                            </p>
                        </div>
                        <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold px-8 hover:opacity-90">
                            <Camera className="w-4 h-4 mr-2" />
                            사진 선택하기
                        </Button>
                    </div>
                </Card>
            )}

            {/* Step 2: Options Selection */}
            {step === "options" && imagePreview && (
                <div className="space-y-6">
                    {/* Image Preview */}
                    <Card className="p-6 bg-white/5 border-white/10">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="relative w-48 h-36 flex-shrink-0">
                                <img
                                    src={imagePreview}
                                    alt="Your room"
                                    className="w-full h-full object-cover rounded-xl border-2 border-emerald-500/30"
                                />
                                <button
                                    onClick={handleClearImage}
                                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                            <div className="text-center md:text-left">
                                <h3 className="font-bold text-lg mb-2">사진이 업로드되었습니다</h3>
                                <p className="text-sm text-muted-foreground">
                                    방 유형과 원하는 테마를 선택하세요.
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Room Type Selection */}
                    <Card className="p-6 bg-white/5 border-white/10">
                        <h3 className="font-bold mb-4">방 유형 선택</h3>
                        <div className="flex flex-wrap gap-2">
                            {ROOM_TYPES.map((room) => (
                                <button
                                    key={room}
                                    onClick={() => setSelectedRoom(room)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedRoom === room
                                        ? "bg-emerald-500 text-black"
                                        : "bg-white/5 hover:bg-white/10"
                                        }`}
                                >
                                    {room}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Theme Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {THEMES.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => setSelectedTheme(theme.id)}
                                className={`p-6 rounded-2xl border-2 transition-all text-left ${selectedTheme === theme.id
                                    ? "bg-gradient-to-br from-emerald-500/20 to-transparent border-emerald-500"
                                    : "bg-white/5 border-white/10 hover:border-white/30"
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-3 rounded-xl ${selectedTheme === theme.id ? "bg-emerald-500/20" : "bg-white/5"
                                        }`}>
                                        <theme.icon className={`w-6 h-6 ${theme.color}`} />
                                    </div>
                                    {selectedTheme === theme.id && (
                                        <Check className="w-5 h-5 text-emerald-400 ml-auto" />
                                    )}
                                </div>
                                <h3 className="font-bold text-lg">{theme.name}</h3>
                                <p className="text-sm text-muted-foreground">{theme.desc}</p>
                                <p className="text-xs text-muted-foreground mt-2">추천 컬러: {theme.colors}</p>
                            </button>
                        ))}
                    </div>

                    {/* Credit Info */}
                    <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Star className="w-5 h-5 text-emerald-400" />
                                <span className="text-sm">
                                    분석에 <strong className="text-emerald-400">{TALISMAN_COSTS_DISPLAY.interiorAnalysis} 부적</strong>이 사용됩니다
                                </span>
                            </div>
                        </div>
                    </Card>

                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-4">
                        <Button
                            variant="outline"
                            onClick={handleClearImage}
                            className="border-white/10 hover:bg-white/5"
                        >
                            다시 선택
                        </Button>
                        <Button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold px-8 hover:opacity-90"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    분석 중...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    {selectedRoom} 풍수 분석 시작
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Results */}
            {step === "result" && analysis && (
                <div className="space-y-6">
                    {/* Theme Banner */}
                    <Card className="p-6 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-[#D4AF37]/10 border-emerald-500/20">
                        <div className="flex items-center gap-4">
                            <div className="p-4 rounded-2xl bg-emerald-500/20">
                                <selectedThemeConfig.icon className={`w-8 h-8 ${selectedThemeConfig.color}`} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{selectedRoom} - {selectedThemeConfig.name} 테마</h2>
                                <p className="text-muted-foreground">{selectedThemeConfig.desc}를 위한 풍수 분석 완료</p>
                            </div>
                        </div>
                    </Card>

                    {/* Analysis Detail */}
                    <Card className="p-6 bg-white/5 border-white/10">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-400" />
                            풍수 분석 결과
                        </h3>
                        <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => <h1 className="text-xl font-bold text-emerald-400 mt-4 mb-2">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-lg font-bold text-teal-400 mt-4 mb-2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1">{children}</h3>,
                                    p: ({ children }) => <p className="text-muted-foreground mb-3 leading-relaxed">{children}</p>,
                                    strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-3">{children}</ul>,
                                    li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                                }}
                            >
                                {analysis.currentAnalysis?.replace(/\[\[.*?\]\]/g, '').replace(/\[\[\/.*?\]\]/g, '') || ''}
                            </ReactMarkdown>
                        </div>
                    </Card>

                    {/* Shopping List */}
                    {analysis.shoppingList && analysis.shoppingList.length > 0 && (
                        <Card className="p-6 bg-[#D4AF37]/5 border-[#D4AF37]/20">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                                추천 쇼핑 리스트
                            </h3>
                            <ul className="space-y-3">
                                {analysis.shoppingList.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                                        <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Problems */}
                    {analysis.problems && analysis.problems.length > 0 && (
                        <Card className="p-6 bg-red-500/5 border-red-500/20">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <X className="w-5 h-5 text-red-400" />
                                개선이 필요한 포인트
                            </h3>
                            <ul className="space-y-2">
                                {analysis.problems.map((problem: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className="text-red-400">•</span>
                                        {problem}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Disclaimer */}
                    <p className="text-xs text-muted-foreground text-center">
                        * 본 서비스는 재미와 참고용으로만 제공됩니다. 실제 인테리어 시공 시 전문가와 상담하세요.
                    </p>

                    {/* Try Again */}
                    <div className="text-center">
                        <Button
                            variant="outline"
                            onClick={handleClearImage}
                            className="border-white/10 hover:bg-white/5"
                        >
                            다른 공간 분석하기
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
