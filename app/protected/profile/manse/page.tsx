"use client";

import { useEffect, useState } from "react";
import { getFamilyMembers } from "@/app/actions/family-actions";
import { getUserTierLimits } from "@/app/actions/membership-limits";
import { getCurrentUserRole } from "@/app/actions/products";
import { getSajuData, WU_XING_COLORS } from "@/lib/saju";
import {
    analyzeGekguk,
    calculateSinsal,
    analyzeYongsin,
    analyzeYukchin,
    calculateDaeun,
    getGaeunbubRecommendation
} from "@/lib/saju-analysis";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollText, User, Info, Sparkles, BookOpen, Crown, Palette, Compass } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";

// 전문 용어 사전
const TERMINOLOGY: Record<string, { title: string; desc: string }> = {
    "비견": { title: "비견 (比肩)", desc: "나와 같은 오행으로, 형제자매, 동료, 경쟁자를 의미합니다. 독립심과 경쟁의식을 나타냅니다." },
    "겁재": { title: "겁재 (劫財)", desc: "나와 같은 오행이나 음양이 다릅니다. 재물 경쟁, 형제간 갈등의 의미가 있습니다." },
    "식신": { title: "식신 (食神)", desc: "내가 생하는 오행으로 음양이 같습니다. 재능, 표현력, 자녀(여명)를 의미합니다." },
    "상관": { title: "상관 (傷官)", desc: "내가 생하는 오행으로 음양이 다릅니다. 창의력, 반항심, 관을 손상시키는 기운입니다." },
    "편재": { title: "편재 (偏財)", desc: "내가 극하는 오행으로 음양이 같습니다. 투기성 재물, 아버지(남명)를 의미합니다." },
    "정재": { title: "정재 (正財)", desc: "내가 극하는 오행으로 음양이 다릅니다. 정당한 재물, 아내(남명)를 의미합니다." },
    "편관": { title: "편관 (偏官)", desc: "나를 극하는 오행으로 음양이 같습니다. 칠살이라고도 하며, 권위와 스트레스를 의미합니다." },
    "정관": { title: "정관 (正官)", desc: "나를 극하는 오행으로 음양이 다릅니다. 명예, 직장, 남편(여명)을 의미합니다." },
    "편인": { title: "편인 (偏印)", desc: "나를 생하는 오행으로 음양이 같습니다. 학문, 예술, 고독을 의미합니다." },
    "정인": { title: "정인 (正印)", desc: "나를 생하는 오행으로 음양이 다릅니다. 어머니, 학문, 자격증을 의미합니다." },
    "용신": { title: "용신 (用神)", desc: "사주에서 부족하거나 필요한 오행을 보충해주는 가장 중요한 기운입니다. 개운의 핵심입니다." },
    "희신": { title: "희신 (喜神)", desc: "용신을 돕는 기운으로, 용신 다음으로 좋은 작용을 합니다." },
    "기신": { title: "기신 (忌神)", desc: "사주에 해로운 작용을 하는 기운으로, 피해야 할 오행입니다." },
    "역마살": { title: "역마살 (驛馬殺)", desc: "이동, 변동, 해외운을 나타내는 신살입니다. 활동력이 강하고 여행이 많습니다." },
    "도화살": { title: "도화살 (桃花殺)", desc: "인기, 매력, 이성운을 나타내는 신살입니다. 예술적 감각과 연애운에 영향을 줍니다." },
    "화개살": { title: "화개살 (華蓋殺)", desc: "고독, 종교, 학문을 나타내는 신살입니다. 정신적 깊이와 독특한 사고를 의미합니다." },
};

// 천간/지지 정보
const TIANGAN_INFO: Record<string, { korean: string; element: string; yinyang: string; meaning: string }> = {
    "甲": { korean: "갑", element: "木", yinyang: "양", meaning: "큰 나무, 우두머리, 시작" },
    "乙": { korean: "을", element: "木", yinyang: "음", meaning: "풀, 유연함, 예술" },
    "丙": { korean: "병", element: "火", yinyang: "양", meaning: "태양, 밝음, 열정" },
    "丁": { korean: "정", element: "火", yinyang: "음", meaning: "촛불, 따뜻함, 섬세함" },
    "戊": { korean: "무", element: "土", yinyang: "양", meaning: "산, 중후함, 신뢰" },
    "己": { korean: "기", element: "土", yinyang: "음", meaning: "논밭, 수용력, 인내" },
    "庚": { korean: "경", element: "金", yinyang: "양", meaning: "바위, 강직함, 결단" },
    "辛": { korean: "신", element: "金", yinyang: "음", meaning: "보석, 예민함, 정제" },
    "壬": { korean: "임", element: "水", yinyang: "양", meaning: "바다, 지혜, 포용" },
    "癸": { korean: "계", element: "水", yinyang: "음", meaning: "이슬, 직관, 침착" },
};

const DIZHI_INFO: Record<string, { korean: string; element: string; animal: string; season: string }> = {
    "子": { korean: "자", element: "水", animal: "쥐", season: "한겨울" },
    "丑": { korean: "축", element: "土", animal: "소", season: "늦겨울" },
    "寅": { korean: "인", element: "木", animal: "호랑이", season: "초봄" },
    "卯": { korean: "묘", element: "木", animal: "토끼", season: "봄" },
    "辰": { korean: "진", element: "土", animal: "용", season: "늦봄" },
    "巳": { korean: "사", element: "火", animal: "뱀", season: "초여름" },
    "午": { korean: "오", element: "火", animal: "말", season: "한여름" },
    "未": { korean: "미", element: "土", animal: "양", season: "늦여름" },
    "申": { korean: "신", element: "金", animal: "원숭이", season: "초가을" },
    "酉": { korean: "유", element: "金", animal: "닭", season: "가을" },
    "戌": { korean: "술", element: "土", animal: "개", season: "늦가을" },
    "亥": { korean: "해", element: "水", animal: "돼지", season: "초겨울" },
};

// 오행 한글 표기
const WUXING_KOREAN: Record<string, string> = {
    "木": "목",
    "火": "화",
    "土": "토",
    "金": "금",
    "水": "수"
};

interface Member {
    id: string;
    name: string;
    relationship: string;
    birth_date: string;
    birth_time: string | null;
    calendar_type: string;
    gender: string;
}

interface TermDialogState {
    open: boolean;
    term: string;
    customContent?: {
        title: string;
        description: string;
    };
}

export default function MansePage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [termDialog, setTermDialog] = useState<TermDialogState>({ open: false, term: "" });
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const [membersData, tierLimits, userRole] = await Promise.all([
                getFamilyMembers(),
                getUserTierLimits(),
                getCurrentUserRole()
            ]);

            setMembers(membersData);
            // 관리자는 구독 여부와 무관하게 모든 프리미엄 기능 접근 가능
            const isAdmin = userRole.role === 'admin';
            setIsSubscribed(isAdmin || tierLimits?.is_subscribed || false);

            if (membersData.length > 0) {
                // 본인 찾기 또는 첫번째
                const self = membersData.find((m: Member) => m.relationship === "본인");
                setSelectedMemberId(self?.id || membersData[0].id);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const selectedMember = members.find((m) => m.id === selectedMemberId);
    const saju = selectedMember
        ? getSajuData(
            selectedMember.birth_date,
            selectedMember.birth_time || "00:00",
            selectedMember.calendar_type === "solar"
        )
        : null;

    // 프리미엄 분석 계산
    const gekgukAnalysis = saju ? analyzeGekguk(saju) : null;
    const sinsalList = saju ? calculateSinsal(saju) : [];
    const yongsinAnalysis = saju ? analyzeYongsin(saju) : null;
    const yukchinAnalysis = saju ? analyzeYukchin(saju) : null;
    const daeunList = saju && selectedMember ? calculateDaeun(
        selectedMember.birth_date,
        selectedMember.gender || 'male',
        saju
    ) : [];
    const gaeunbubRec = yongsinAnalysis ? getGaeunbubRecommendation(yongsinAnalysis.yongsin) : null;

    const openTermDialog = (term: string) => {
        if (TERMINOLOGY[term]) {
            setTermDialog({ open: true, term });
        }
    };

    const openHanjaDialog = (hanja: string, korean: string, info: any, type: 'tiangan' | 'dizhi' | 'wuxing') => {
        let description = "";
        if (type === 'tiangan') {
            description = `오행: ${info.element} (${WUXING_KOREAN[info.element]})
음양: ${info.yinyang}
의미: ${info.meaning}`;
        } else if (type === 'dizhi') {
            description = `오행: ${info.element} (${WUXING_KOREAN[info.element]})
동물: ${info.animal}
계절: ${info.season}`;
        } else if (type === 'wuxing') {
            const wuxingMeaning: Record<string, string> = {
                "木": "봄, 성장, 인자함, 동쪽을 상징합니다. 나무의 기운으로 확장과 발전을 의미합니다.",
                "火": "여름, 열정, 예의, 남쪽을 상징합니다. 불의 기운으로 활동과 변화를 의미합니다.",
                "土": "환절기, 신뢰, 중앙을 상징합니다. 흙의 기운으로 안정과 조화를 의미합니다.",
                "金": "가을, 정의, 서쪽을 상징합니다. 금속의 기운으로 결단과 수확을 의미합니다.",
                "水": "겨울, 지혜, 북쪽을 상징합니다. 물의 기운으로 지혜와 유연함을 의미합니다."
            };
            description = wuxingMeaning[hanja] || "";
        }

        setTermDialog({
            open: true,
            term: korean,
            customContent: {
                title: `${hanja} (${korean})`,
                description
            }
        });
    };

    const HanjaButton = ({
        hanja,
        korean,
        info,
        type
    }: {
        hanja: string;
        korean: string;
        info: any;
        type: 'tiangan' | 'dizhi';
    }) => (
        <button
            onClick={() => openHanjaDialog(hanja, korean, info, type)}
            className="group cursor-pointer w-full"
        >
            <div className="flex flex-col items-center gap-1.5">
                <span
                    className="text-3xl font-black group-hover:scale-110 transition-transform"
                    style={{ color: WU_XING_COLORS[info.element] }}
                >
                    {hanja}
                </span>
                <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    {korean}
                </span>
            </div>
        </button>
    );

    const TermButton = ({ term }: { term: string }) => (
        <button
            onClick={() => openTermDialog(term)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] text-xs hover:bg-[#D4AF37]/20 transition-colors"
        >
            {term}
            <Info className="w-3 h-3" />
        </button>
    );

    const PremiumFeature = ({
        title,
        children,
        isSubscribed
    }: {
        title: string;
        children: React.ReactNode;
        isSubscribed: boolean;
    }) => (
        <Card className="p-8 bg-white/5 border-white/10 relative overflow-hidden">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {title}
                {!isSubscribed && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[10px]">
                        PREMIUM
                    </span>
                )}
            </h3>

            {/* Content */}
            <div className={cn(!isSubscribed && "blur-sm select-none pointer-events-none")}>
                {children}
            </div>

            {/* Premium Overlay */}
            {!isSubscribed && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="text-center space-y-4 p-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                            <Crown className="w-8 h-8 text-[#D4AF37]" />
                        </div>
                        <h4 className="text-lg font-bold text-ink-light">
                            프리미엄 회원 전용
                        </h4>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            {title} 기능은 프리미엄 회원만 이용하실 수 있습니다.
                        </p>
                        <Link href="/protected/membership">
                            <Button className="bg-[#D4AF37] hover:bg-[#F4E4BA] text-background">
                                <Crown className="w-4 h-4 mr-2" />
                                멤버십 가입하기
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </Card>
    );

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
                <Skeleton className="h-12 w-64 mx-auto" />
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        );
    }

    if (members.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-12 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <User className="w-10 h-10 text-white/20" />
                </div>
                <h1 className="text-2xl font-bold mb-2">등록된 정보가 없습니다</h1>
                <p className="text-muted-foreground mb-6">인연 관리에서 먼저 정보를 등록해주세요.</p>
                <Button asChild className="bg-[#D4AF37] text-black hover:bg-[#F4E4BA]">
                    <a href="/protected/family">인연 등록하기</a>
                </Button>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen">
            {/* Subtle Background */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-[200px]" />
            </div>

            <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                        <ScrollText className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Manse-ryok Pro</span>
                    </div>
                    <h1 className="text-4xl font-black">
                        <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
                            만세력
                        </span>
                    </h1>
                    <p className="text-muted-foreground">
                        사주팔자의 천간·지지·오행을 전문가 수준으로 분석합니다
                    </p>
                </div>

                {/* Member Selector */}
                <div className="flex justify-center">
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger className="w-64 bg-white/5 border-white/10">
                            <SelectValue placeholder="분석 대상 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {members.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.name} ({m.relationship})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {saju && selectedMember && (
                    <>
                        {/* Birth Info */}
                        <Card className="p-6 bg-white/5 border-white/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold">{selectedMember.name}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedMember.birth_date} {selectedMember.birth_time || ""} ({selectedMember.calendar_type === "solar" ? "양력" : "음력"})
                                    </p>
                                </div>
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold",
                                    selectedMember.gender === "male" ? "bg-blue-500/20 text-blue-400" : "bg-pink-500/20 text-pink-400"
                                )}>
                                    {selectedMember.gender === "male" ? "남" : "여"}명
                                </div>
                            </div>
                        </Card>

                        {/* Four Pillars - Main Display */}
                        <Card className="p-8 bg-white/5 border-white/10">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                사주팔자 (四柱八字)
                            </h3>

                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { label: "시주", sub: "時柱", data: saju.pillars.time },
                                    { label: "일주", sub: "日柱", data: saju.pillars.day },
                                    { label: "월주", sub: "月柱", data: saju.pillars.month },
                                    { label: "년주", sub: "年柱", data: saju.pillars.year },
                                ].map((pillar, idx) => {
                                    const ganInfo = TIANGAN_INFO[pillar.data.gan];
                                    const zhiInfo = DIZHI_INFO[pillar.data.zhi];

                                    return (
                                        <div key={idx} className="text-center">
                                            <p className="text-xs text-muted-foreground mb-2">{pillar.label}</p>
                                            <p className="text-[10px] text-muted-foreground/50 mb-3">{pillar.sub}</p>

                                            {/* 천간 - 클릭 가능 */}
                                            <div
                                                className="w-full aspect-square rounded-xl flex items-center justify-center mb-2"
                                                style={{ backgroundColor: `${WU_XING_COLORS[ganInfo?.element || "土"]}15` }}
                                            >
                                                <HanjaButton
                                                    hanja={pillar.data.gan}
                                                    korean={ganInfo?.korean || ""}
                                                    info={ganInfo}
                                                    type="tiangan"
                                                />
                                            </div>

                                            {/* 지지 - 클릭 가능 */}
                                            <div
                                                className="w-full aspect-square rounded-xl flex items-center justify-center"
                                                style={{ backgroundColor: `${WU_XING_COLORS[zhiInfo?.element || "土"]}15` }}
                                            >
                                                <HanjaButton
                                                    hanja={pillar.data.zhi}
                                                    korean={zhiInfo?.korean || ""}
                                                    info={zhiInfo}
                                                    type="dizhi"
                                                />
                                            </div>

                                            {/* Info */}
                                            <div className="mt-3 space-y-1">
                                                <p className="text-xs text-muted-foreground">
                                                    {ganInfo?.element}{ganInfo?.yinyang} / {zhiInfo?.animal}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Ganji Full */}
                            <div className="mt-8 pt-6 border-t border-white/5">
                                <p className="text-center text-lg tracking-widest font-bold">
                                    {saju.ganjiList.join(" ")}
                                </p>
                            </div>
                        </Card>

                        {/* Wuxing Distribution */}
                        <Card className="p-8 bg-white/5 border-white/10">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">
                                오행 분포 (五行分布)
                            </h3>

                            <div className="grid grid-cols-5 gap-4">
                                {Object.entries(saju.elementsDistribution).map(([element, count]) => (
                                    <button
                                        key={element}
                                        onClick={() => openHanjaDialog(element, WUXING_KOREAN[element], { element }, 'wuxing')}
                                        className="text-center group cursor-pointer"
                                    >
                                        <div
                                            className="w-full aspect-square rounded-xl flex items-center justify-center text-2xl font-black mb-2 group-hover:scale-105 transition-transform"
                                            style={{ backgroundColor: `${WU_XING_COLORS[element]}20` }}
                                        >
                                            <span style={{ color: WU_XING_COLORS[element] }}>
                                                {element}
                                            </span>
                                        </div>
                                        <p className="text-xl font-black">{count}</p>
                                        <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                            {WUXING_KOREAN[element]}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            {/* Balance Bar */}
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <div className="flex h-4 rounded-full overflow-hidden bg-white/5">
                                    {Object.entries(saju.elementsDistribution).map(([element, count]) => {
                                        const total = Object.values(saju.elementsDistribution).reduce((a, b) => a + b, 0);
                                        const percent = (count / total) * 100;
                                        if (percent === 0) return null;
                                        return (
                                            <div
                                                key={element}
                                                style={{
                                                    width: `${percent}%`,
                                                    backgroundColor: WU_XING_COLORS[element]
                                                }}
                                                title={`${element}: ${count}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>



                        {/* 격국 분석 */}
                        <PremiumFeature title="격국 분석 (格局分析)" isSubscribed={isSubscribed}>
                            {gekgukAnalysis ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                                            <p className="text-xs text-muted-foreground mb-2">사주 격국</p>
                                            <p className="text-xl font-bold text-primary">{gekgukAnalysis.gekguk}</p>
                                            <p className="text-xs text-muted-foreground/70 mt-2">{gekgukAnalysis.hanja}</p>
                                        </div>
                                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                                            <p className="text-xs text-muted-foreground mb-2">격국 강도</p>
                                            <p className="text-xl font-bold">{gekgukAnalysis.strengthLabel}</p>
                                            <div className="w-full h-2 bg-surface/50 rounded-full mt-2 overflow-hidden">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{ width: `${(gekgukAnalysis.strength / 5) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-sm font-bold">격국 특징</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {gekgukAnalysis.description}
                                        </p>
                                        <ul className="space-y-2 text-sm text-muted-foreground">
                                            {gekgukAnalysis.characteristics.map((char, idx) => (
                                                <li key={idx} className="flex items-start gap-2">
                                                    <span className="text-primary mt-1">•</span>
                                                    <span>{char}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">사주 데이터를 불러오는 중...</p>
                            )}
                        </PremiumFeature>

                        {/* 대운/세운 */}
                        <PremiumFeature title="대운·세운 (大運·歲運)" isSubscribed={isSubscribed}>
                            {daeunList.length > 0 ? (
                                <div className="space-y-6">
                                    {/* 현재 대운 */}
                                    {(() => {
                                        const currentYear = new Date().getFullYear();
                                        const currentDaeun = daeunList.find(d =>
                                            currentYear >= d.startYear && currentYear <= d.endYear
                                        ) || daeunList[0];

                                        return (
                                            <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                                                <div className="flex items-center justify-between mb-4">
                                                    <p className="text-xs text-muted-foreground">현재 대운</p>
                                                    <span className="px-2 py-1 rounded bg-primary/20 text-primary text-xs">
                                                        {currentDaeun.startYear}-{currentDaeun.endYear} ({currentDaeun.age})
                                                    </span>
                                                </div>
                                                <div className="text-center space-y-2">
                                                    <div className="flex justify-center gap-3">
                                                        <span className="text-3xl font-black text-primary">{currentDaeun.gan}</span>
                                                        <span className="text-3xl font-black text-primary">{currentDaeun.zhi}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{currentDaeun.ganjiKorean} ({currentDaeun.gan}{currentDaeun.zhi})</p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* 연도별 세운 (최근 3년) */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {[0, 1, 2].map(offset => {
                                            const year = new Date().getFullYear() + offset;
                                            const yearGanIdx = (year - 4) % 10;
                                            const yearZhiIdx = (year - 4) % 12;
                                            const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
                                            const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
                                            const gan = ganList[yearGanIdx];
                                            const zhi = zhiList[yearZhiIdx];

                                            return (
                                                <div key={year} className="bg-surface/20 p-3 rounded-lg text-center">
                                                    <p className="text-xs text-muted-foreground mb-1">{year}년</p>
                                                    <p className="text-sm font-bold">{gan}{zhi}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {offset === 0 ? '현재' : offset === 1 ? '다음' : '후년'}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* 대운 흐름 */}
                                    <div className="space-y-3">
                                        <p className="text-sm font-bold">대운 흐름</p>
                                        {(() => {
                                            const currentYear = new Date().getFullYear();
                                            const currentDaeun = daeunList.find(d =>
                                                currentYear >= d.startYear && currentYear <= d.endYear
                                            ) || daeunList[0];
                                            return (
                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    {currentDaeun.description}
                                                </p>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">대운 데이터를 불러오는 중...</p>
                            )}
                        </PremiumFeature>

                        {/* 육친 관계도 */}
                        <PremiumFeature title="육친 관계도 (六親關係圖)" isSubscribed={isSubscribed}>
                            {yukchinAnalysis && Object.keys(yukchinAnalysis).length > 0 ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(yukchinAnalysis).map(([key, data]) => (
                                            <div key={key} className="bg-surface/20 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-sm font-bold">{data.name}</p>
                                                    <span className="text-xs text-muted-foreground">{data.hanja}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-lg font-black text-primary">{data.count}</span>
                                                    <span className="text-xs text-muted-foreground">개</span>
                                                    <span className={`ml-auto px-2 py-0.5 rounded text-[10px] ${data.strength === 'strong' ? 'bg-primary/20 text-primary' :
                                                        data.strength === 'moderate' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-muted-foreground/20 text-muted-foreground'
                                                        }`}>
                                                        {data.strength === 'strong' ? '강' : data.strength === 'moderate' ? '중' : '약'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground/70">
                                                    {data.pillars.join(', ')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-sm font-bold">육친 해석</p>
                                        <div className="space-y-2">
                                            {Object.entries(yukchinAnalysis).slice(0, 3).map(([key, data]) => (
                                                <p key={key} className="text-sm text-muted-foreground leading-relaxed">
                                                    <span className="text-ink-light font-medium">{data.name}:</span> {data.interpretation}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">육친 데이터를 불러오는 중...</p>
                            )}
                        </PremiumFeature>

                        {/* 개운법 */}
                        <PremiumFeature title="개운법 (開運法)" isSubscribed={isSubscribed}>
                            {gaeunbubRec ? (
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4 rounded-xl">
                                        <p className="text-sm font-bold mb-3 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                            행운의 오행
                                        </p>
                                        <div className="flex gap-2">
                                            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                                                {gaeunbubRec.luckyElement} ({gaeunbubRec.luckyElement === '木' ? '목' :
                                                    gaeunbubRec.luckyElement === '火' ? '화' :
                                                        gaeunbubRec.luckyElement === '土' ? '토' :
                                                            gaeunbubRec.luckyElement === '金' ? '금' : '수'})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                                <Palette className="w-3 h-3" />
                                                행운의 색
                                            </p>
                                            <p className="text-xs font-medium">{gaeunbubRec.colors.join(', ')}</p>
                                        </div>
                                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                                <Compass className="w-3 h-3" />
                                                행운의 방위
                                            </p>
                                            <p className="text-xs font-medium">{gaeunbubRec.directions.join(', ')}</p>
                                        </div>
                                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                                            <p className="text-xs text-muted-foreground mb-2">행운의 숫자</p>
                                            <div className="flex gap-1">
                                                {gaeunbubRec.numbers.map(num => (
                                                    <span key={num} className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                                                        {num}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                                            <p className="text-xs text-muted-foreground mb-2">추천 직업</p>
                                            <p className="text-xs font-medium">{gaeunbubRec.jobs.slice(0, 3).join(', ')}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-sm font-bold">일상 개운법</p>
                                        <ul className="space-y-2 text-sm text-muted-foreground">
                                            {gaeunbubRec.activities.map((activity, idx) => (
                                                <li key={idx} className="flex items-start gap-2">
                                                    <span className="text-primary mt-1">✓</span>
                                                    <span>{activity}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">개운법 데이터를 불러오는 중...</p>
                            )}
                        </PremiumFeature>


                        {/* 신살 */}
                        <PremiumFeature title="신살 (神殺)" isSubscribed={isSubscribed}>
                            <div className="space-y-6">
                                <div className="bg-gradient-to-r from-seal/10 to-seal/5 border border-seal/20 p-4 rounded-xl">
                                    <p className="text-sm font-bold mb-3 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-seal" />
                                        보유 신살
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1.5 rounded-full bg-seal/20 text-seal text-sm font-medium">
                                            역마살 (驛馬殺)
                                        </span>
                                        <span className="px-3 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-medium">
                                            천을귀인 (天乙貴人)
                                        </span>
                                        <span className="px-3 py-1.5 rounded-full bg-[#9370DB]/20 text-[#9370DB] text-sm font-medium">
                                            화개살 (華蓋殺)
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* 역마살 */}
                                    <div className="bg-surface/30 border border-seal/20 p-4 rounded-xl">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="text-sm font-bold text-seal">역마살 (驛馬殺)</p>
                                                <p className="text-xs text-muted-foreground mt-1">이동, 변화, 활동</p>
                                            </div>
                                            <span className="px-2 py-0.5 rounded bg-seal/20 text-seal text-[10px]">
                                                움직임
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            이동과 변화를 좋아하는 성향으로, 한 곳에 머무르기보다는 여러 곳을 다니며 활동하는 것을 선호합니다. 해외 활동이나 출장이 많을 수 있습니다.
                                        </p>
                                    </div>

                                    {/* 천을귀인 */}
                                    <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="text-sm font-bold text-primary">천을귀인 (天乙貴人)</p>
                                                <p className="text-xs text-muted-foreground mt-1">귀인, 도움, 행운</p>
                                            </div>
                                            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px]">
                                                길신
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            어려움에 처했을 때 도움을 주는 귀인이 나타나는 길신입니다. 위기 상황에서 예상치 못한 도움을 받을 수 있으며, 인복이 좋습니다.
                                        </p>
                                    </div>

                                    {/* 화개살 */}
                                    <div className="bg-surface/30 border border-[#9370DB]/20 p-4 rounded-xl">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="text-sm font-bold" style={{ color: '#9370DB' }}>화개살 (華蓋殺)</p>
                                                <p className="text-xs text-muted-foreground mt-1">예술, 종교, 학문</p>
                                            </div>
                                            <span className="px-2 py-0.5 rounded bg-[#9370DB]/20 text-[10px]" style={{ color: '#9370DB' }}>
                                                예술
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            예술적 감각과 영적인 재능이 뛰어나며, 종교나 철학에 관심이 많습니다. 혼자만의 시간을 즐기며 창작 활동에 적합합니다.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-bold">신살 종합</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        역마살로 인해 활동적이며, 천을귀인의 도움을 받아 어려움을 극복할 수 있습니다. 화개살의 예술적 감각을 활용하면 창작 분야에서 성공할 가능성이 높습니다.
                                    </p>
                                </div>
                            </div>
                        </PremiumFeature>

                        {/* 용신론 */}
                        <PremiumFeature title="용신론 (用神論)" isSubscribed={isSubscribed}>
                            <div className="space-y-6">
                                {/* 용신 */}
                                <div className="bg-gradient-to-r from-[#50C878]/10 to-[#50C878]/5 border border-[#50C878]/20 p-4 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-bold flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" style={{ color: '#50C878' }} />
                                            용신 (用神)
                                        </p>
                                        <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#50C87820', color: '#50C878' }}>
                                            木 (목)
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        사주의 균형을 맞추고 부족한 기운을 보완하는 가장 중요한 오행입니다. 木 기운을 활용하면 운세가 상승합니다.
                                    </p>
                                </div>

                                {/* 희신 */}
                                <div className="bg-surface/30 border border-[#4A90E2]/20 p-4 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-bold" style={{ color: '#4A90E2' }}>
                                            희신 (喜神)
                                        </p>
                                        <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#4A90E220', color: '#4A90E2' }}>
                                            水 (수)
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        용신을 도와주는 오행으로, 水 기운이 木을 생하여 도움을 줍니다. 용신과 함께 활용하면 효과가 극대화됩니다.
                                    </p>
                                </div>

                                {/* 기신 */}
                                <div className="bg-surface/30 border border-[#FFD700]/20 p-4 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-bold" style={{ color: '#FFD700' }}>
                                            기신 (忌神)
                                        </p>
                                        <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#FFD70020', color: '#FFD700' }}>
                                            金 (금)
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        사주의 균형을 해치는 오행으로, 金 기운은 木을 극하여 부정적 영향을 줍니다. 가급적 피하는 것이 좋습니다.
                                    </p>
                                </div>

                                {/* 용신 활용법 */}
                                <div className="space-y-3">
                                    <p className="text-sm font-bold">용신 활용법</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-surface/20 border border-primary/10 p-3 rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-1">직업</p>
                                            <p className="text-sm font-medium">교육, 출판, 환경</p>
                                        </div>
                                        <div className="bg-surface/20 border border-primary/10 p-3 rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-1">방위</p>
                                            <p className="text-sm font-medium">동쪽, 북동쪽</p>
                                        </div>
                                        <div className="bg-surface/20 border border-primary/10 p-3 rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-1">색상</p>
                                            <p className="text-sm font-medium">초록, 파랑</p>
                                        </div>
                                        <div className="bg-surface/20 border border-primary/10 p-3 rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-1">시간</p>
                                            <p className="text-sm font-medium">새벽 3-7시</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-bold">용신론 해석</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        용신인 木과 희신인 水를 적극 활용하고, 기신인 金은 피하는 것이 운세 향상에 도움이 됩니다. 木 기운이 강한 환경과 직업을 선택하면 좋습니다.
                                    </p>
                                </div>
                            </div>
                        </PremiumFeature>

                        {/* 주요 용어 가이드 - 맨 아래로 이동 */}
                        <Card className="p-8 bg-white/5 border-white/10">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                주요 용어 가이드
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-3">십신 (十神)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"].map((term) => (
                                            <TermButton key={term} term={term} />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground mb-3">신살 (神殺)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["역마살", "도화살", "화개살", "천을귀인"].map((term) => (
                                            <TermButton key={term} term={term} />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground mb-3">용신론 (用神論)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["용신", "희신", "기신"].map((term) => (
                                            <TermButton key={term} term={term} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </>
                )
                }
            </div >

            {/* Term Dialog */}
            < Dialog open={termDialog.open} onOpenChange={(open) => setTermDialog({ ...termDialog, open })}>
                <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[#D4AF37]">
                            <BookOpen className="w-5 h-5" />
                            {termDialog.customContent?.title || TERMINOLOGY[termDialog.term]?.title}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {termDialog.customContent?.description || TERMINOLOGY[termDialog.term]?.desc}
                    </p>
                </DialogContent>
            </Dialog >
        </div >
    );
}
