"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Flame, User, Calendar, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { getFamilyMembers } from "@/app/actions/family-actions";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    birth_date: string;
    birth_time: string | null;
    calendar_type: string;
    gender: string;
}

function NewYear2026Content() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const targetId = searchParams.get("targetId");

    const [loading, setLoading] = useState(true);
    const [member, setMember] = useState<FamilyMember | null>(null);
    const [fortune, setFortune] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        const fetchMemberAndFortune = async () => {
            setLoading(true);

            // Check authentication
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth/sign-up");
                return;
            }

            // Get target member
            if (targetId) {
                const members = await getFamilyMembers();
                const selectedMember = members.find((m: FamilyMember) => m.id === targetId);

                if (selectedMember) {
                    setMember(selectedMember as FamilyMember);
                } else {
                    router.push("/protected/analysis");
                    return;
                }
            } else {
                // No targetId provided, redirect to hub
                router.push("/protected/analysis");
                return;
            }

            setLoading(false);
        };

        fetchMemberAndFortune();
    }, [targetId, router]);

    const handleGenerateFortune = async () => {
        if (!member) return;

        setAnalyzing(true);

        // TODO: Implement AI fortune generation
        // This would call an API endpoint that generates 2026 new year fortune
        // For now, we'll simulate with a timeout
        setTimeout(() => {
            setFortune(
                `${member.name}님의 2026년 병오년(丙午年) 신년 종합운세입니다.\n\n` +
                `붉은 말의 해, 불의 기운이 강렬한 한 해가 시작되었습니다. ` +
                `말처럼 앞으로 달려나가는 추진력과 활력이 넘치는 시기입니다.\n\n` +
                `[종합운] 전반적으로 상승 기운이 강한 한 해입니다. 특히 새로운 시도와 도전에 길한 운세가 보입니다.\n\n` +
                `[재물운] 상반기보다 하반기에 재물운이 상승합니다. 투자보다는 저축이 유리합니다.\n\n` +
                `[애정운] 기존 관계는 안정적이며, 새로운 인연은 늦봄에서 초여름 사이에 기대할 수 있습니다.\n\n` +
                `[건강운] 화(火) 기운이 강하므로 심장과 혈액 순환에 주의가 필요합니다. 충분한 수분 섭취를 권장합니다.\n\n` +
                `[조언] 말의 해답게 신중함보다는 과감함이 필요한 시기입니다. 망설이지 말고 앞으로 나아가세요.`
            );
            setAnalyzing(false);
        }, 3000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-12">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-ink-light/60 font-serif">사용자 정보를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-8 w-full max-w-4xl mx-auto py-12 px-6 pb-32"
        >
            {/* Back Button */}
            <motion.div variants={fadeInUp}>
                <Link href="/protected/analysis" className="inline-flex items-center gap-2 text-primary/70 hover:text-primary transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    <span>분석 허브로 돌아가기</span>
                </Link>
            </motion.div>

            {/* Header */}
            <motion.section variants={fadeInUp} className="space-y-6 text-center">
                {/* Badge */}
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-seal/20 border border-seal/40 backdrop-blur-sm mb-2">
                        <Sparkles className="w-4 h-4 text-seal" strokeWidth={1.5} />
                        <span className="text-[10px] font-bold text-seal tracking-[0.2em] font-sans uppercase">
                            2026 丙午年 Special
                        </span>
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-ink-light italic leading-tight">
                        <span className="text-seal">병오년</span>,<br />
                        <span className="text-primary-dim">신년 종합운세</span>
                    </h1>
                    <p className="text-base md:text-lg text-ink-light/70 font-light leading-relaxed max-w-2xl mx-auto">
                        붉은 말이 달리는 2026년, 당신의 운명은 어떻게 펼쳐질까요?
                    </p>
                </div>
            </motion.section>

            {/* Profile Card */}
            {member && (
                <motion.div variants={fadeInUp}>
                    <Card className="bg-surface/40 border border-primary/20 p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <User className="w-8 h-8 text-primary" strokeWidth={1.5} />
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-serif font-bold text-2xl text-ink-light mb-2">
                                    {member.name}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-ink-light/60">
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {member.relationship}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {member.birth_date}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* Fortune Result or CTA */}
            <motion.div variants={fadeInUp}>
                {fortune ? (
                    <Card className="relative bg-surface/30 backdrop-blur-md p-8 shadow-2xl border border-primary/20 overflow-hidden">
                        {/* Noise texture overlay */}
                        <div className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none">
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundImage:
                                        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
                                    backgroundRepeat: "repeat",
                                }}
                            />
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <Flame className="w-6 h-6 text-seal" />
                                <h2 className="text-2xl font-serif font-bold text-ink-light">
                                    2026년 신년운세
                                </h2>
                            </div>

                            <div className="prose prose-invert max-w-none">
                                <p className="text-ink-light/80 leading-relaxed whitespace-pre-line font-light">
                                    {fortune}
                                </p>
                            </div>

                            <div className="pt-6 border-t border-primary/10">
                                <Button
                                    onClick={() => setFortune(null)}
                                    variant="outline"
                                    className="w-full md:w-auto"
                                >
                                    다시 생성하기
                                </Button>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Card className="relative bg-surface/30 backdrop-blur-md p-12 text-center shadow-2xl border border-primary/20 overflow-hidden">
                        {/* Noise texture overlay */}
                        <div className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none">
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundImage:
                                        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
                                    backgroundRepeat: "repeat",
                                }}
                            />
                        </div>

                        <div className="relative z-10 space-y-6 max-w-md mx-auto">
                            <div className="w-20 h-20 mx-auto rounded-full bg-seal/20 flex items-center justify-center mb-4">
                                <Flame className="w-10 h-10 text-seal" />
                            </div>

                            <h3 className="text-2xl font-serif font-bold text-ink-light">
                                신년운세 분석 준비 완료
                            </h3>

                            <p className="text-ink-light/60 leading-relaxed">
                                붉은 말이 달리는 2026년, <span className="text-primary font-medium">{member?.name}님</span>의
                                <br />
                                한 해를 밝게 비춰줄 운세를 확인하세요.
                            </p>

                            <Button
                                onClick={handleGenerateFortune}
                                disabled={analyzing}
                                className="w-full md:w-auto bg-gradient-to-r from-seal to-seal/80 hover:from-seal/90 hover:to-seal/70 text-ink-light font-serif font-bold text-lg px-8 py-6 rounded-lg shadow-lg transition-all"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        분석 중...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-2" />
                                        2026년 신년운세 확인하기
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>
                )}
            </motion.div>

            {/* Footer */}
            <motion.section
                variants={fadeInUp}
                className="text-center space-y-4 opacity-50 font-serif italic text-sm text-ink-light/40 mt-8"
            >
                <p>※ 병오년(丙午年)은 불의 말의 해로, 강한 추진력과 변화의 기운이 특징입니다.</p>
                <div className="flex items-center justify-center gap-4 uppercase tracking-[0.2em] font-sans font-bold text-[10px] not-italic">
                    <span>Authentic</span>
                    <span className="w-1 h-1 bg-seal" />
                    <span>Insightful</span>
                    <span className="w-1 h-1 bg-seal" />
                    <span>Haehwadang 2026</span>
                </div>
            </motion.section>
        </motion.div>
    );
}

export default function NewYear2026Page() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-12">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-ink-light/60 font-serif">로딩 중...</p>
            </div>
        }>
            <NewYear2026Content />
        </Suspense>
    );
}
