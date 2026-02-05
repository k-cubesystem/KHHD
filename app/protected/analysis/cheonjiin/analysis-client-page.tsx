"use client";

import { AnalysisForm } from "@/components/analysis/analysis-form";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { Card } from "@/components/ui/card";
import { BookOpen, Heart, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { DestinyTarget } from "@/app/actions/destiny-targets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getSajuData } from "@/lib/saju";
import { calculateCompatibilityScore } from "@/lib/compatibility";

interface AnalysisClientPageProps {
    targets: DestinyTarget[];
    initialTargetId?: string;
}

export function AnalysisClientPage({ targets, initialTargetId }: AnalysisClientPageProps) {
    const [target1Id, setTarget1Id] = useState<string>("");
    const [target2Id, setTarget2Id] = useState<string>("");
    const [compResult, setCompResult] = useState<{ score: number; comment: string } | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    const handleAnalyzeCompatibility = () => {
        if (!target1Id || !target2Id) return;
        setAnalyzing(true);
        setCompResult(null);

        // Simulate analysis
        setTimeout(() => {
            const m1 = targets.find(t => t.id === target1Id);
            const m2 = targets.find(t => t.id === target2Id);

            if (m1 && m2 && m1.birth_date && m2.birth_date) {
                const s1 = getSajuData(m1.birth_date, m1.birth_time || "00:00", m1.calendar_type === "solar");
                const s2 = getSajuData(m2.birth_date, m2.birth_time || "00:00", m2.calendar_type === "solar");
                const res = calculateCompatibilityScore(s1, s2);
                setCompResult(res);
            }
            setAnalyzing(false);
        }, 1500);
    };

    return (
        <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-8 w-full max-w-5xl mx-auto py-12 px-6 pb-32 font-sans"
        >
            {/* Header */}
            <motion.section variants={fadeInUp} className="space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-primary/20 backdrop-blur-sm mb-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-bold text-primary tracking-[0.2em] font-sans uppercase">Heaven Earth Man Analysis</span>
                    </div>
                </div>
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-ink-light italic leading-tight">
                        천지인(天地人) <br />
                        <span className="text-primary-dim">심층 분석실</span>
                    </h1>
                </div>
            </motion.section>

            <motion.div variants={fadeInUp}>
                <Tabs defaultValue="saju" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-surface/30 p-1 mb-8 border border-white/5 rounded-full">
                        <TabsTrigger value="saju" className="rounded-full data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-bold py-3 transition-all">
                            운명 분석 (Saju)
                        </TabsTrigger>
                        <TabsTrigger value="compatibility" className="rounded-full data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-bold py-3 transition-all">
                            궁합 분석 (Compatibility)
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="saju">
                        <Card className="relative bg-surface/30 backdrop-blur-md p-1 shadow-2xl border border-primary/20 rounded-none overflow-hidden">
                            <div className="absolute inset-0 bg-primary/5 -m-1 pointer-events-none rounded-none" />
                            <AnalysisForm targets={targets} initialTargetId={initialTargetId} />
                        </Card>
                    </TabsContent>

                    <TabsContent value="compatibility">
                        <Card className="relative bg-surface/30 backdrop-blur-md p-8 shadow-2xl border border-primary/20 rounded-none overflow-hidden min-h-[500px] flex flex-col items-center justify-center">
                            <div className="absolute inset-0 bg-primary/5 -m-1 pointer-events-none rounded-none" />

                            {!compResult ? (
                                <div className="w-full max-w-md space-y-8 relative z-10">
                                    <div className="text-center space-y-2">
                                        <Heart className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
                                        <h2 className="text-2xl font-serif font-bold text-ink-light">두 사람의 인연을 확인하세요</h2>
                                        <p className="text-ink-light/50 text-sm">등록된 인연 중 두 명을 선택하여 궁합을 분석합니다.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-primary uppercase tracking-widest">본인 / 인연 A</label>
                                            <Select onValueChange={setTarget1Id} value={target1Id}>
                                                <SelectTrigger className="bg-surface/50 border-white/10 h-12 text-ink-light">
                                                    <SelectValue placeholder="인연 A 선택" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-surface text-ink-light border-white/10">
                                                    {targets.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.relation_type})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-primary uppercase tracking-widest">인연 B</label>
                                            <Select onValueChange={setTarget2Id} value={target2Id}>
                                                <SelectTrigger className="bg-surface/50 border-white/10 h-12 text-ink-light">
                                                    <SelectValue placeholder="인연 B 선택" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-surface text-ink-light border-white/10">
                                                    {targets.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.relation_type})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-14 bg-primary text-background font-bold text-lg rounded-full mt-4 hover:bg-primary-dim transition-all"
                                        disabled={!target1Id || !target2Id || analyzing}
                                        onClick={handleAnalyzeCompatibility}
                                    >
                                        {analyzing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                                        {analyzing ? "분석 중..." : "궁합 분석 시작하기"}
                                    </Button>

                                    {targets.length < 2 && (
                                        <p className="text-xs text-rose-400 text-center mt-4">
                                            * 궁합을 보려면 최소 2명의 인연이 등록되어 있어야 합니다.<br />
                                            '인연관리' 메뉴에서 인연을 추가해주세요.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full max-w-lg space-y-8 relative z-10 text-center animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex items-center justify-center gap-8 mb-8">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-surface border border-primary/20 flex items-center justify-center font-serif font-bold text-2xl text-ink-light mx-auto mb-2 shadow-sm">
                                                {targets.find(t => t.id === target1Id)?.name[0]}
                                            </div>
                                            <span className="text-sm font-bold text-ink/60">{targets.find(t => t.id === target1Id)?.name}</span>
                                        </div>
                                        <Heart className="w-8 h-8 text-primary fill-current animate-pulse" />
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-surface border border-primary/20 flex items-center justify-center font-serif font-bold text-2xl text-ink-light mx-auto mb-2 shadow-sm">
                                                {targets.find(t => t.id === target2Id)?.name[0]}
                                            </div>
                                            <span className="text-sm font-bold text-ink/60">{targets.find(t => t.id === target2Id)?.name}</span>
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <span className="text-sm font-bold text-primary uppercase tracking-widest border border-primary/30 px-3 py-1">Compatibility Score</span>
                                        <div className="mt-4 text-7xl font-serif font-bold text-ink-light tracking-tight">
                                            {compResult.score}<span className="text-4xl text-ink/40 ml-1 font-sans font-light">/100</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-serif font-bold text-ink-light leading-snug">
                                            "{compResult.comment}"
                                        </h3>
                                        <p className="text-ink/60 leading-relaxed font-sans">
                                            두 분의 사주에서 나타나는 오행의 흐름과 간지의 조화를 분석한 결과입니다.
                                        </p>
                                    </div>

                                    <div className="pt-8 flex justify-center gap-4">
                                        <Button variant="outline" onClick={() => setCompResult(null)} className="border-primary/20 hover:bg-surface text-ink/60 font-sans h-12 px-6">
                                            <ArrowRight className="w-4 h-4 mr-2" />
                                            다른 궁합 보기
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>

            {/* Footer */}
            <motion.section variants={fadeInUp} className="text-center space-y-4 opacity-50 font-serif italic text-sm text-ink-light/40 mt-8">
                <p>※ 모든 분석은 명리학적 전통 가이드라인과 최신 데이터 알고리즘을 준수합니다.</p>
                <div className="flex items-center justify-center gap-4 uppercase tracking-[0.2em] font-sans font-bold text-[10px] not-italic">
                    <span>Authentic</span>
                    <span className="w-1 h-1 bg-primary" />
                    <span>Precise</span>
                    <span className="w-1 h-1 bg-primary" />
                    <span>Haehwadang Master Identity</span>
                </div>
            </motion.section>
        </motion.div>
    );
}
