"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, ScanLine, ArrowLeft, Eye, Hand, Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type AnalysisMode = "face" | "palm" | "fengshui";

export default function VisionAnalysisPage() {
    const [mode, setMode] = useState<AnalysisMode>("face");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setSelectedImage(imageUrl);
            // Simulate analysis start
            setTimeout(() => setIsAnalyzing(true), 500);
            // Simulate analysis end
            setTimeout(() => setIsAnalyzing(false), 3500);
        }
    };

    const resetAnalysis = () => {
        setSelectedImage(null);
        setIsAnalyzing(false);
    };

    const modes = [
        { id: "face", label: "관상 (Face)", icon: Eye, desc: "얼굴의 기운으로 운명을 읽습니다" },
        { id: "palm", label: "손금 (Palm)", icon: Hand, desc: "손안에 새겨진 인생의 지도" },
        { id: "fengshui", label: "풍수 (Space)", icon: Compass, desc: "공간의 흐름과 기운 분석" },
    ];

    return (
        <div className="min-h-screen bg-background text-white font-sans flex flex-col relative overflow-hidden pb-20">
            {/* Texture */}
            <div className="hanji-overlay" />
            <div className="paper-grain" />

            {/* Header */}
            <header className="relative z-20 px-6 pt-12 pb-4 flex items-center justify-between">
                <Link href="/protected/analysis" className="p-2 -ml-2 text-white/60 hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <span className="font-serif font-semibold text-primary tracking-widest gold-glow text-lg">
                    AI 영안실 (靈眼室)
                </span>
                <div className="w-10" />
            </header>

            {/* Main Content */}
            <main className="relative z-10 px-6 flex flex-col items-center gap-8 w-full max-w-[480px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Mode Selector */}
                <div className="w-full grid grid-cols-3 gap-2 bg-surface/30 p-1 rounded-lg border border-primary/20">
                    {modes.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => { setMode(m.id as AnalysisMode); resetAnalysis(); }}
                            className={`flex flex-col items-center justify-center py-3 rounded-md transition-all duration-300 ${mode === m.id
                                    ? "bg-primary text-background shadow-lg scale-[1.02]"
                                    : "text-white/50 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <m.icon className="w-5 h-5 mb-1" />
                            <span className="text-[10px] font-bold tracking-wider">{m.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>

                {/* Description */}
                <div className="text-center space-y-1">
                    <h2 className="text-xl font-serif font-bold text-white">
                        {modes.find(m => m.id === mode)?.label}
                    </h2>
                    <p className="text-sm text-white/60 font-light">
                        {modes.find(m => m.id === mode)?.desc}
                    </p>
                </div>

                {/* Upload Area / Camera View */}
                <div className="w-full aspect-[3/4] bg-[#0a0a0a] border-2 border-primary/30 border-dashed rounded-2xl relative overflow-hidden group luxury-card-glow flex flex-col items-center justify-center">

                    {!selectedImage ? (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent opacity-50" />

                            <div className="flex flex-col items-center gap-6 z-10">
                                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-full animate-ping bg-primary/20 duration-[3s]" />
                                    <Camera className="w-8 h-8 text-primary" />
                                </div>

                                <div className="text-center space-y-3">
                                    <label className="cursor-pointer">
                                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                        <span className="px-6 py-3 bg-white text-black font-bold rounded-full text-sm hover:bg-gray-200 transition-colors shadow-lg flex items-center gap-2 mx-auto w-fit">
                                            <Upload className="w-4 h-4" />
                                            사진 업로드
                                        </span>
                                    </label>
                                    <p className="text-xs text-white/40">또는 카메라로 촬영</p>
                                </div>
                            </div>

                            {/* Corner Accents */}
                            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-primary" />
                            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-primary" />
                            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-primary" />
                            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-primary" />
                        </>
                    ) : (
                        <>
                            <img src={selectedImage} alt="Analysis Target" className="absolute inset-0 w-full h-full object-cover opacity-60" />

                            {/* Scanning Animation */}
                            {isAnalyzing && (
                                <div className="absolute inset-0 z-20">
                                    <motion.div
                                        className="w-full h-2 bg-primary/50 shadow-[0_0_15px_rgba(236,182,19,0.8)]"
                                        animate={{ top: ["0%", "100%", "0%"] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                                        <ScanLine className="w-12 h-12 text-primary animate-pulse" />
                                        <span className="text-primary font-bold tracking-widest text-sm bg-black/50 px-3 py-1 rounded-sm backdrop-blur-md">
                                            분석 중...
                                        </span>
                                    </div>
                                </div>
                            )}

                            {!isAnalyzing && (
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-primary text-xs font-bold tracking-widest uppercase">
                                            <SparklesIcon className="w-3 h-3" />
                                            Analysis Complete
                                        </div>
                                        <h3 className="text-xl font-serif font-bold text-white leading-tight">
                                            "귀인(貴人)의 상이 보입니다"
                                        </h3>
                                        <p className="text-sm text-white/70 leading-relaxed">
                                            이마가 넓고 빛나니 초년운이 좋고,
                                            눈빛이 맑아 지혜가 엿보입니다.
                                            올해는 재물운이 상승하는 시기입니다.
                                        </p>
                                        <Button onClick={resetAnalysis} className="w-full mt-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary">
                                            다른 사진 분석하기
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Safe Note */}
                <p className="text-[10px] text-white/30 text-center max-w-xs">
                    ※ 업로드된 사진은 분석 직후 즉시 삭제되며 서버에 저장되지 않습니다.
                </p>

            </main>
        </div>
    );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
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
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    )
}
