"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Users, Sparkles, Heart, AlertTriangle, Star, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// 궁합 타입 정의
interface CompatibilityData {
    from: string;
    fromId: string;
    to: string;
    toId: string;
    score: number;
    type: string;
    description?: string;
    advice?: string[];
}

interface FamilyMember {
    id: string;
    name: string;
    birth_date: string;
    birth_time?: string;
    relation?: string;
}

// 점수별 색상 클래스
function getScoreColor(score: number): string {
    if (score >= 90) return "bg-green-500 text-white";
    if (score >= 80) return "bg-green-400 text-white";
    if (score >= 70) return "bg-zen-gold text-white";
    if (score >= 60) return "bg-yellow-400 text-white";
    if (score >= 50) return "bg-orange-400 text-white";
    return "bg-red-400 text-white";
}

// 점수별 배경 색상 (연한 버전)
function getScoreBgColor(score: number): string {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 80) return "bg-green-50 text-green-700 border-green-200";
    if (score >= 70) return "bg-zen-gold/20 text-zen-wood border-zen-gold/30";
    if (score >= 60) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (score >= 50) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-red-50 text-red-700 border-red-200";
}

// 궁합 유형 결정
function getCompatibilityType(score: number): string {
    if (score >= 90) return "천생연분";
    if (score >= 80) return "대길";
    if (score >= 70) return "상생";
    if (score >= 60) return "평화";
    if (score >= 50) return "조화필요";
    return "주의";
}

// 궁합 설명 생성
function getCompatibilityDescription(score: number, from: string, to: string): string {
    if (score >= 90) {
        return `${from}님과 ${to}님은 마치 물과 물고기처럼 서로에게 없어서는 안 될 존재입니다. 서로의 부족한 오행을 완벽히 보완하며, 함께할 때 시너지가 극대화됩니다.`;
    }
    if (score >= 80) {
        return `${from}님과 ${to}님은 매우 좋은 궁합입니다. 서로의 장점을 살려주고 단점을 보완해주는 관계로, 함께하면 더 큰 성과를 이룰 수 있습니다.`;
    }
    if (score >= 70) {
        return `${from}님과 ${to}님은 서로 상생하는 관계입니다. 자연스러운 조화를 이루며, 서로를 존중할 때 더욱 발전할 수 있습니다.`;
    }
    if (score >= 60) {
        return `${from}님과 ${to}님은 평화로운 관계입니다. 큰 충돌 없이 무난하게 지낼 수 있으나, 특별한 시너지를 위해서는 노력이 필요합니다.`;
    }
    if (score >= 50) {
        return `${from}님과 ${to}님은 서로 다른 에너지를 가지고 있어 조화가 필요합니다. 서로의 차이를 인정하고 배려할 때 관계가 개선됩니다.`;
    }
    return `${from}님과 ${to}님은 기운의 충돌이 있을 수 있습니다. 서로를 이해하려는 노력과 인내가 필요하며, 적절한 거리 유지가 도움이 됩니다.`;
}

// 개선 조언 생성
function getCompatibilityAdvice(score: number): string[] {
    if (score >= 80) {
        return [
            "현재의 좋은 관계를 유지하세요",
            "함께하는 시간을 더 늘려보세요",
            "서로의 성과를 축하하고 격려하세요",
        ];
    }
    if (score >= 60) {
        return [
            "정기적인 대화 시간을 가지세요",
            "서로의 관심사를 공유해보세요",
            "작은 배려와 감사 표현을 실천하세요",
        ];
    }
    return [
        "서로의 차이점을 인정하고 존중하세요",
        "감정적인 대화는 잠시 쉬어가세요",
        "제3자의 중재가 도움이 될 수 있습니다",
        "공통의 목표를 설정해보세요",
    ];
}

export default function CompatibilityMatrixPage() {
    const [family, setFamily] = useState<FamilyMember[]>([]);
    const [matrix, setMatrix] = useState<CompatibilityData[]>([]);
    const [selectedCell, setSelectedCell] = useState<CompatibilityData | null>(null);
    const [loading, setLoading] = useState(true);

    // 가족 데이터 로드
    useEffect(() => {
        async function loadFamily() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            // 본인 정보 가져오기
            const { data: profile } = await supabase
                .from("profiles")
                .select("id, name, birth_date, birth_time")
                .eq("id", user.id)
                .single();

            // 가족 구성원 가져오기
            const { data: members } = await supabase
                .from("family_members")
                .select("id, name, birth_date, birth_time, relation")
                .eq("user_id", user.id);

            const familyList: FamilyMember[] = [];

            if (profile) {
                familyList.push({
                    id: profile.id,
                    name: profile.name || "나",
                    birth_date: profile.birth_date || "",
                    birth_time: profile.birth_time,
                    relation: "본인",
                });
            }

            if (members) {
                familyList.push(...members.map((m) => ({
                    id: m.id,
                    name: m.name,
                    birth_date: m.birth_date,
                    birth_time: m.birth_time,
                    relation: m.relation,
                })));
            }

            setFamily(familyList);

            // 궁합 매트릭스 계산 (Mock - 실제로는 사주 기반 계산)
            const matrixData: CompatibilityData[] = [];
            for (let i = 0; i < familyList.length; i++) {
                for (let j = i + 1; j < familyList.length; j++) {
                    // TODO: 실제 사주 기반 궁합 계산 로직 연동
                    const score = Math.floor(50 + Math.random() * 50);
                    matrixData.push({
                        from: familyList[i].name,
                        fromId: familyList[i].id,
                        to: familyList[j].name,
                        toId: familyList[j].id,
                        score,
                        type: getCompatibilityType(score),
                        description: getCompatibilityDescription(score, familyList[i].name, familyList[j].name),
                        advice: getCompatibilityAdvice(score),
                    });
                }
            }

            setMatrix(matrixData);
            setLoading(false);
        }

        loadFamily();
    }, []);

    // 특정 두 사람의 궁합 찾기
    function findCompatibility(name1: string, name2: string): CompatibilityData | undefined {
        return matrix.find(
            (m) =>
                (m.from === name1 && m.to === name2) ||
                (m.from === name2 && m.to === name1)
        );
    }

    if (loading) {
        return (
            <div className="container mx-auto p-6 max-w-4xl min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-zen-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zen-muted">궁합 분석 중...</p>
                </div>
            </div>
        );
    }

    if (family.length < 2) {
        return (
            <div className="container mx-auto p-6 max-w-4xl min-h-screen">
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="space-y-8"
                >
                    <motion.div variants={fadeInUp}>
                        <Link
                            href="/protected/family"
                            className="text-sm text-zen-muted hover:text-zen-wood flex items-center gap-1 mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" /> 가족 관리로 돌아가기
                        </Link>
                    </motion.div>

                    <motion.div
                        variants={fadeInUp}
                        className="text-center py-20"
                    >
                        <Users className="w-16 h-16 text-zen-muted mx-auto mb-4" />
                        <h2 className="text-2xl font-serif font-bold text-zen-text mb-2">
                            가족 구성원을 추가해주세요
                        </h2>
                        <p className="text-zen-muted mb-6">
                            궁합 매트릭스를 보려면 최소 2명의 가족이 등록되어야 합니다.
                        </p>
                        <Link href="/protected/family">
                            <Button>가족 등록하러 가기</Button>
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl min-h-screen pb-20">
            <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-8"
            >
                {/* Header */}
                <motion.div variants={fadeInUp} className="flex flex-col gap-2">
                    <Link
                        href="/protected/family"
                        className="text-sm text-zen-muted hover:text-zen-wood flex items-center gap-1 mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> 가족 관리로 돌아가기
                    </Link>
                    <h1 className="text-3xl font-serif font-bold text-zen-text flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-zen-gold" />
                        가족 인연 매트릭스
                    </h1>
                    <p className="text-zen-muted font-sans">
                        등록된 가족 구성원 간의 에너지 흐름을 한눈에 파악하세요.
                        셀을 클릭하면 상세 분석을 볼 수 있습니다.
                    </p>
                </motion.div>

                {/* 범례 */}
                <motion.div variants={fadeInUp}>
                    <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-green-500" />
                            <span className="text-zen-muted">90+ 천생연분</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-zen-gold" />
                            <span className="text-zen-muted">70-89 상생</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-yellow-400" />
                            <span className="text-zen-muted">60-69 평화</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-orange-400" />
                            <span className="text-zen-muted">50-59 조화필요</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-red-400" />
                            <span className="text-zen-muted">0-49 주의</span>
                        </div>
                    </div>
                </motion.div>

                {/* Matrix Chart */}
                <motion.div variants={fadeInUp}>
                    <Card className="zen-card overflow-hidden">
                        <CardHeader className="border-b border-zen-border bg-zen-bg/50">
                            <CardTitle className="text-zen-title flex items-center gap-2">
                                <span className="w-1 h-6 bg-zen-gold rounded-full" />
                                궁합 매트릭스
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 overflow-x-auto">
                            <div
                                className="grid gap-2"
                                style={{
                                    gridTemplateColumns: `100px repeat(${family.length}, 1fr)`,
                                    minWidth: `${100 + family.length * 80}px`,
                                }}
                            >
                                {/* Column Header */}
                                <div className="h-16" />
                                {family.map((member, i) => (
                                    <div
                                        key={`col-${i}`}
                                        className="h-16 flex items-center justify-center font-serif font-bold text-zen-text bg-zen-bg/50 rounded-sm px-2 text-center"
                                    >
                                        <span className="truncate">{member.name}</span>
                                    </div>
                                ))}

                                {/* Rows */}
                                {family.map((rowMember, i) => (
                                    <>
                                        {/* Row Header */}
                                        <div
                                            key={`row-${i}`}
                                            className="h-16 flex items-center justify-center font-serif font-bold text-zen-text bg-zen-bg/50 rounded-sm"
                                        >
                                            {rowMember.name}
                                        </div>

                                        {/* Cells */}
                                        {family.map((colMember, j) => {
                                            if (i === j) {
                                                return (
                                                    <div
                                                        key={`cell-${i}-${j}`}
                                                        className="h-16 bg-zen-border/20 rounded-sm flex items-center justify-center"
                                                    >
                                                        <span className="text-zen-muted text-xs">
                                                            -
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            const compat = findCompatibility(
                                                rowMember.name,
                                                colMember.name
                                            );

                                            if (!compat) {
                                                return (
                                                    <div
                                                        key={`cell-${i}-${j}`}
                                                        className="h-16 bg-zen-border/10 rounded-sm"
                                                    />
                                                );
                                            }

                                            return (
                                                <motion.button
                                                    key={`cell-${i}-${j}`}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setSelectedCell(compat)}
                                                    className={cn(
                                                        "h-16 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-all border",
                                                        getScoreBgColor(compat.score),
                                                        selectedCell?.from === compat.from &&
                                                            selectedCell?.to === compat.to &&
                                                            "ring-2 ring-zen-wood ring-offset-2"
                                                    )}
                                                >
                                                    <span className="text-lg font-bold font-serif">
                                                        {compat.score}
                                                    </span>
                                                    <span className="text-[10px] opacity-80">
                                                        {compat.type}
                                                    </span>
                                                </motion.button>
                                            );
                                        })}
                                    </>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 통계 요약 */}
                <motion.div variants={fadeInUp}>
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="zen-card p-4 text-center">
                            <div className="text-3xl font-serif font-bold text-green-600 mb-1">
                                {matrix.filter((m) => m.score >= 80).length}
                            </div>
                            <div className="text-sm text-zen-muted">좋은 궁합</div>
                        </Card>
                        <Card className="zen-card p-4 text-center">
                            <div className="text-3xl font-serif font-bold text-zen-gold mb-1">
                                {matrix.filter((m) => m.score >= 60 && m.score < 80).length}
                            </div>
                            <div className="text-sm text-zen-muted">보통 궁합</div>
                        </Card>
                        <Card className="zen-card p-4 text-center">
                            <div className="text-3xl font-serif font-bold text-orange-500 mb-1">
                                {matrix.filter((m) => m.score < 60).length}
                            </div>
                            <div className="text-sm text-zen-muted">노력 필요</div>
                        </Card>
                    </div>
                </motion.div>
            </motion.div>

            {/* 상세 분석 모달 */}
            <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl font-serif">
                            <Heart
                                className={cn(
                                    "w-6 h-6",
                                    selectedCell && selectedCell.score >= 70
                                        ? "text-red-500"
                                        : "text-zen-muted"
                                )}
                            />
                            {selectedCell?.from} & {selectedCell?.to}의 궁합
                        </DialogTitle>
                    </DialogHeader>

                    {selectedCell && (
                        <div className="space-y-6">
                            {/* 점수 */}
                            <div className="text-center py-6 bg-zen-surface rounded-sm">
                                <div
                                    className={cn(
                                        "inline-flex items-center justify-center w-24 h-24 rounded-full text-4xl font-serif font-bold",
                                        getScoreColor(selectedCell.score)
                                    )}
                                >
                                    {selectedCell.score}
                                </div>
                                <p className="mt-3 text-lg font-medium text-zen-text">
                                    {selectedCell.type}
                                </p>
                            </div>

                            {/* 설명 */}
                            <div>
                                <h4 className="font-medium text-zen-text mb-2 flex items-center gap-2">
                                    <Star className="w-4 h-4 text-zen-gold" />
                                    궁합 분석
                                </h4>
                                <p className="text-sm text-zen-muted leading-relaxed">
                                    {selectedCell.description}
                                </p>
                            </div>

                            {/* 조언 */}
                            <div>
                                <h4 className="font-medium text-zen-text mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-zen-gold" />
                                    관계 향상 조언
                                </h4>
                                <ul className="space-y-2">
                                    {selectedCell.advice?.map((advice, i) => (
                                        <li
                                            key={i}
                                            className="text-sm text-zen-muted flex items-start gap-2"
                                        >
                                            <span className="w-5 h-5 rounded-full bg-zen-gold/20 text-zen-wood flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                                {i + 1}
                                            </span>
                                            {advice}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {selectedCell.score < 60 && (
                                <div className="p-4 bg-orange-50 rounded-sm border border-orange-200">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-orange-800">
                                                관계 개선이 필요합니다
                                            </p>
                                            <p className="text-xs text-orange-600 mt-1">
                                                서로의 차이를 인정하고 열린 마음으로 대화하면
                                                충분히 좋은 관계를 만들 수 있습니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
