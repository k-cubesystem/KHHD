"use client";

import { useState, useRef } from "react";
import {
    Sparkles, Upload, Camera, X, Loader2,
    Crown, Heart, Shield, TrendingUp, Check,
    ChevronRight, Star, Wand2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { analyzeFaceForDestiny, FaceDestinyGoal } from "@/app/actions/ai-image";
import { TALISMAN_COSTS_DISPLAY } from "@/lib/constants";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import ReactMarkdown from "react-markdown";

const GOALS: { id: FaceDestinyGoal; name: string; icon: any; desc: string; color: string }[] = [
    { id: "wealth", name: "CEO의 상", icon: Crown, desc: "재물운 강화", color: "text-yellow-400" },
    { id: "love", name: "아이돌의 상", icon: Heart, desc: "도화운(연애운) 강화", color: "text-pink-400" },
    { id: "authority", name: "장군의 상", icon: Shield, desc: "권위/리더십 강화", color: "text-blue-400" },
];

export default function FaceDestinyPage() {
    const [selectedGoal, setSelectedGoal] = useState<FaceDestinyGoal>("wealth");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<"upload" | "goal" | "result">("upload");
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
            setStep("goal");
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
            const result = await analyzeFaceForDestiny(imageBase64, selectedGoal);

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

    const selectedGoalConfig = GOALS.find(g => g.id === selectedGoal)!;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                    <Wand2 className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Face Destiny Hacking</span>
                </div>
                <h1 className="text-4xl font-black">
                    <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-[#D4AF37] bg-clip-text text-transparent">
                        AI 관상 개운
                    </span>
                </h1>
                <p className="text-muted-foreground">
                    당신의 관상을 분석하고, 원하는 운을 강화하는 방법을 알려드립니다
                </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 text-sm">
                {["사진 업로드", "목표 선택", "분석 결과"].map((label, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${(step === "upload" && i === 0) ||
                            (step === "goal" && i <= 1) ||
                            (step === "result" && i <= 2)
                            ? "bg-[#D4AF37] text-black"
                            : "bg-white/10 text-muted-foreground"
                            }`}>
                            {i + 1}
                        </div>
                        <span className={`hidden sm:block ${(step === "upload" && i === 0) ||
                            (step === "goal" && i <= 1) ||
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
                        capture="user"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <div
                        className="text-center space-y-6 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center hover:from-purple-500/30 hover:to-pink-500/30 transition-colors">
                            <Upload className="w-12 h-12 text-purple-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold">정면 얼굴 사진 업로드</h2>
                            <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                자연광 아래에서 촬영한 정면 사진이 가장 정확한 분석 결과를 제공합니다.
                                <br />안경을 벗고, 앞머리가 이마를 가리지 않는 사진을 권장합니다.
                            </p>
                        </div>
                        <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-8 hover:opacity-90">
                            <Camera className="w-4 h-4 mr-2" />
                            사진 선택 또는 촬영
                        </Button>
                    </div>
                </Card>
            )}

            {/* Step 2: Goal Selection */}
            {step === "goal" && imagePreview && (
                <div className="space-y-6">
                    {/* Image Preview */}
                    <Card className="p-6 bg-white/5 border-white/10">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="relative w-40 h-40 flex-shrink-0">
                                <img
                                    src={imagePreview}
                                    alt="Your face"
                                    className="w-full h-full object-cover rounded-xl border-2 border-purple-500/30"
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
                                    이제 강화하고 싶은 운세를 선택하세요.
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Goal Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {GOALS.map((goal) => (
                            <button
                                key={goal.id}
                                onClick={() => setSelectedGoal(goal.id)}
                                className={`p-6 rounded-2xl border-2 transition-all text-left ${selectedGoal === goal.id
                                    ? "bg-gradient-to-br from-[#D4AF37]/20 to-transparent border-[#D4AF37]"
                                    : "bg-white/5 border-white/10 hover:border-white/30"
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-3 rounded-xl ${selectedGoal === goal.id ? "bg-[#D4AF37]/20" : "bg-white/5"
                                        }`}>
                                        <goal.icon className={`w-6 h-6 ${goal.color}`} />
                                    </div>
                                    {selectedGoal === goal.id && (
                                        <Check className="w-5 h-5 text-[#D4AF37] ml-auto" />
                                    )}
                                </div>
                                <h3 className="font-bold text-lg">{goal.name}</h3>
                                <p className="text-sm text-muted-foreground">{goal.desc}</p>
                            </button>
                        ))}
                    </div>

                    {/* Credit Info */}
                    <Card className="p-4 bg-[#D4AF37]/10 border-[#D4AF37]/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Star className="w-5 h-5 text-[#D4AF37]" />
                                <span className="text-sm">
                                    분석에 <strong className="text-[#D4AF37]">{TALISMAN_COSTS_DISPLAY.faceAnalysis} 부적</strong>이 사용됩니다
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
                            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-8 hover:opacity-90"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    분석 중...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    {selectedGoalConfig.name} 분석 시작
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Results */}
            {step === "result" && analysis && (
                <div className="space-y-6">
                    {/* Score Card */}
                    <Card className="p-8 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-[#D4AF37]/10 border-purple-500/20">
                        <div className="text-center space-y-4">
                            <div className="flex items-center justify-center gap-3">
                                <selectedGoalConfig.icon className={`w-8 h-8 ${selectedGoalConfig.color}`} />
                                <h2 className="text-2xl font-bold">{selectedGoalConfig.name} 분석 완료</h2>
                            </div>

                            <div className="flex items-center justify-center gap-8 py-6">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground mb-2">현재 점수</p>
                                    <div className="text-5xl font-black text-white">
                                        {analysis.currentScore || 65}
                                    </div>
                                </div>
                                <TrendingUp className="w-8 h-8 text-[#D4AF37]" />
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground mb-2">잠재 점수</p>
                                    <div className="text-5xl font-black text-[#D4AF37]">
                                        {Math.min((analysis.currentScore || 65) + 25, 95)}
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                아래 조언을 따르면 {selectedGoalConfig.desc}을 크게 높일 수 있습니다
                            </p>
                        </div>
                    </Card>

                    {/* Analysis Detail */}
                    <Card className="p-6 bg-white/5 border-white/10">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                            상세 분석 결과
                        </h3>
                        <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => <h1 className="text-xl font-bold text-[#D4AF37] mt-4 mb-2">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-lg font-bold text-purple-400 mt-4 mb-2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1">{children}</h3>,
                                    p: ({ children }) => <p className="text-muted-foreground mb-3 leading-relaxed">{children}</p>,
                                    strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-3">{children}</ul>,
                                    li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                                }}
                            >
                                {analysis.currentAnalysis?.replace(/\[\[.*?\]\]/g, '') || ''}
                            </ReactMarkdown>
                        </div>
                    </Card>

                    {/* Recommendations */}
                    {analysis.recommendations && (
                        <Card className="p-6 bg-[#D4AF37]/5 border-[#D4AF37]/20">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Check className="w-5 h-5 text-green-400" />
                                실천 가능한 개운법
                            </h3>
                            <ul className="space-y-3">
                                {analysis.recommendations.map((rec: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm">{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Disclaimer */}
                    <p className="text-xs text-muted-foreground text-center">
                        * 본 서비스는 재미와 참고용으로만 제공됩니다. 의학적/성형 관련 조언이 아닙니다.
                    </p>

                    {/* Try Again */}
                    <div className="text-center">
                        <Button
                            variant="outline"
                            onClick={handleClearImage}
                            className="border-white/10 hover:bg-white/5"
                        >
                            다른 사진으로 분석하기
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
