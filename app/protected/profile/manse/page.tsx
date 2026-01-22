"use client";

import { useEffect, useState } from "react";
import { getFamilyMembers } from "@/app/actions/family-actions";
import { getSajuData, WU_XING_COLORS } from "@/lib/saju";
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
import { ScrollText, User, Info, Sparkles, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
const TIANGAN_INFO: Record<string, { element: string; yinyang: string; meaning: string }> = {
    "甲": { element: "木", yinyang: "양", meaning: "큰 나무, 우두머리, 시작" },
    "乙": { element: "木", yinyang: "음", meaning: "풀, 유연함, 예술" },
    "丙": { element: "火", yinyang: "양", meaning: "태양, 밝음, 열정" },
    "丁": { element: "火", yinyang: "음", meaning: "촛불, 따뜻함, 섬세함" },
    "戊": { element: "土", yinyang: "양", meaning: "산, 중후함, 신뢰" },
    "己": { element: "土", yinyang: "음", meaning: "논밭, 수용력, 인내" },
    "庚": { element: "金", yinyang: "양", meaning: "바위, 강직함, 결단" },
    "辛": { element: "金", yinyang: "음", meaning: "보석, 예민함, 정제" },
    "壬": { element: "水", yinyang: "양", meaning: "바다, 지혜, 포용" },
    "癸": { element: "水", yinyang: "음", meaning: "이슬, 직관, 침착" },
};

const DIZHI_INFO: Record<string, { element: string; animal: string; season: string }> = {
    "子": { element: "水", animal: "쥐", season: "한겨울" },
    "丑": { element: "土", animal: "소", season: "늦겨울" },
    "寅": { element: "木", animal: "호랑이", season: "초봄" },
    "卯": { element: "木", animal: "토끼", season: "봄" },
    "辰": { element: "土", animal: "용", season: "늦봄" },
    "巳": { element: "火", animal: "뱀", season: "초여름" },
    "午": { element: "火", animal: "말", season: "한여름" },
    "未": { element: "土", animal: "양", season: "늦여름" },
    "申": { element: "金", animal: "원숭이", season: "초가을" },
    "酉": { element: "金", animal: "닭", season: "가을" },
    "戌": { element: "土", animal: "개", season: "늦가을" },
    "亥": { element: "水", animal: "돼지", season: "초겨울" },
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

export default function MansePage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [termDialog, setTermDialog] = useState<{ open: boolean; term: string }>({ open: false, term: "" });

    useEffect(() => {
        const fetchMembers = async () => {
            const data = await getFamilyMembers();
            setMembers(data);
            if (data.length > 0) {
                // 본인 찾기 또는 첫번째
                const self = data.find((m: Member) => m.relationship === "본인");
                setSelectedMemberId(self?.id || data[0].id);
            }
            setLoading(false);
        };
        fetchMembers();
    }, []);

    const selectedMember = members.find((m) => m.id === selectedMemberId);
    const saju = selectedMember
        ? getSajuData(
            selectedMember.birth_date,
            selectedMember.birth_time || "00:00",
            selectedMember.calendar_type === "solar"
        )
        : null;

    const openTermDialog = (term: string) => {
        if (TERMINOLOGY[term]) {
            setTermDialog({ open: true, term });
        }
    };

    const TermButton = ({ term }: { term: string }) => (
        <button
            onClick={() => openTermDialog(term)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] text-xs hover:bg-[#D4AF37]/20 transition-colors"
        >
            {term}
            <Info className="w-3 h-3" />
        </button>
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
                    <a href="/protected/relationships">인연 등록하기</a>
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

                                            {/* 천간 */}
                                            <div
                                                className="w-full aspect-square rounded-xl flex items-center justify-center text-3xl font-black mb-2"
                                                style={{ backgroundColor: `${WU_XING_COLORS[ganInfo?.element || "土"]}15` }}
                                            >
                                                <span style={{ color: WU_XING_COLORS[ganInfo?.element || "土"] }}>
                                                    {pillar.data.gan}
                                                </span>
                                            </div>

                                            {/* 지지 */}
                                            <div
                                                className="w-full aspect-square rounded-xl flex items-center justify-center text-3xl font-black"
                                                style={{ backgroundColor: `${WU_XING_COLORS[zhiInfo?.element || "土"]}15` }}
                                            >
                                                <span style={{ color: WU_XING_COLORS[zhiInfo?.element || "土"] }}>
                                                    {pillar.data.zhi}
                                                </span>
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
                                    <div key={element} className="text-center">
                                        <div
                                            className="w-full aspect-square rounded-xl flex items-center justify-center text-2xl font-black mb-2"
                                            style={{ backgroundColor: `${WU_XING_COLORS[element]}20` }}
                                        >
                                            <span style={{ color: WU_XING_COLORS[element] }}>
                                                {element}
                                            </span>
                                        </div>
                                        <p className="text-xl font-black">{count}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {element === "木" && "목"}
                                            {element === "火" && "화"}
                                            {element === "土" && "토"}
                                            {element === "金" && "금"}
                                            {element === "水" && "수"}
                                        </p>
                                    </div>
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

                        {/* Terminology Guide */}
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
                                        {["역마살", "도화살", "화개살"].map((term) => (
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

                        {/* Coming Soon Features */}
                        <Card className="p-8 bg-white/5 border-white/10 border-dashed">
                            <div className="text-center space-y-3">
                                <p className="text-sm text-muted-foreground">추가 분석 기능 준비 중</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {["격국 분석", "대운/세운", "육친 관계도", "개운법"].map((f) => (
                                        <span key={f} className="px-3 py-1 rounded-full bg-white/5 text-xs text-muted-foreground">
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </>
                )}
            </div>

            {/* Term Dialog */}
            <Dialog open={termDialog.open} onOpenChange={(open) => setTermDialog({ ...termDialog, open })}>
                <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[#D4AF37]">
                            <BookOpen className="w-5 h-5" />
                            {TERMINOLOGY[termDialog.term]?.title}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {TERMINOLOGY[termDialog.term]?.desc}
                    </p>
                </DialogContent>
            </Dialog>
        </div>
    );
}
