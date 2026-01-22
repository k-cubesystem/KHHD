"use client";

import { useEffect, useState, useTransition } from "react";
import { getFamilyMembers, addFamilyMember, deleteFamilyMember } from "@/app/actions/family-actions";
import { getSajuData, WU_XING_COLORS } from "@/lib/saju";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Plus, Sparkles, User, Users, Check, Heart } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Member {
    id: string;
    name: string;
    relationship: string;
    birth_date: string;
    birth_time: string | null;
    calendar_type: string;
    gender: string;
}

// 12간지 시간 옵션
const SHICHEN_OPTIONS = [
    { value: "unknown", label: "모름", time: null },
    { value: "23:30", label: "자시 (子時)", desc: "23:30 ~ 01:29" },
    { value: "02:30", label: "축시 (丑時)", desc: "01:30 ~ 03:29" },
    { value: "04:30", label: "인시 (寅時)", desc: "03:30 ~ 05:29" },
    { value: "06:30", label: "묘시 (卯時)", desc: "05:30 ~ 07:29" },
    { value: "08:30", label: "진시 (辰時)", desc: "07:30 ~ 09:29" },
    { value: "10:30", label: "사시 (巳時)", desc: "09:30 ~ 11:29" },
    { value: "12:30", label: "오시 (午時)", desc: "11:30 ~ 13:29" },
    { value: "14:30", label: "미시 (未時)", desc: "13:30 ~ 15:29" },
    { value: "16:30", label: "신시 (申時)", desc: "15:30 ~ 17:29" },
    { value: "18:30", label: "유시 (酉時)", desc: "17:30 ~ 19:29" },
    { value: "20:30", label: "술시 (戌時)", desc: "19:30 ~ 21:29" },
    { value: "22:30", label: "해시 (亥時)", desc: "21:30 ~ 23:29" },
];

export default function RelationshipsPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const router = useRouter();

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const data = await getFamilyMembers();
            setMembers(data);
        } catch (error) {
            toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleAddMember = async (formData: FormData) => {
        startTransition(async () => {
            try {
                await addFamilyMember(formData);
                toast.success("인연이 성공적으로 등록되었습니다.");
                setAddDialogOpen(false);
                fetchMembers();
            } catch (error: any) {
                toast.error(error.message);
            }
        });
    };

    const handleDeleteMember = async (id: string, name: string) => {
        if (!confirm(`${name}님의 정보를 삭제하시겠습니까?`)) return;

        startTransition(async () => {
            try {
                await deleteFamilyMember(id);
                toast.success(`${name}님의 정보가 삭제되었습니다.`);
                setSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
                fetchMembers();
            } catch (error: any) {
                toast.error(error.message);
            }
        });
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleAnalyze = () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 1) {
            router.push(`/protected/analysis?memberId=${ids[0]}`);
        } else {
            router.push(`/protected/analysis?members=${ids.join(",")}&mode=compatibility`);
        }
    };

    return (
        <div className="relative min-h-screen">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[20%] right-[5%] w-[500px] h-[500px] bg-[#D4AF37]/3 rounded-full blur-[180px]" />
            </div>

            <div className="max-w-5xl mx-auto px-6 py-12 pb-32">
                {/* Header */}
                <div className="text-center space-y-4 mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                        <Users className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Relationships</span>
                    </div>
                    <h1 className="text-4xl font-black">
                        <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
                            인연 관리
                        </span>
                    </h1>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        소중한 인연들의 정보를 관리하고, 궁합과 운명을 분석하세요.
                        <br />2명 이상 선택 시 궁합 분석이 가능합니다.
                    </p>
                </div>

                {/* Action Bar */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold">등록된 인연</h2>
                        <Badge variant="secondary" className="bg-[#D4AF37]/10 text-[#D4AF37] border-none">
                            {members.length}명
                        </Badge>
                    </div>

                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#D4AF37] text-black hover:bg-[#F4E4BA] font-bold">
                                <Plus className="w-4 h-4 mr-2" />
                                새 인연 등록
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                                    새 인연 등록
                                </DialogTitle>
                            </DialogHeader>
                            <form action={handleAddMember} className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs text-muted-foreground">성명</Label>
                                    <Input id="name" name="name" placeholder="홍길동" required className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="relationship" className="text-xs text-muted-foreground">관계</Label>
                                    <Input id="relationship" name="relationship" placeholder="본인, 배우자, 자녀 등" required className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birth_date" className="text-xs text-muted-foreground">생년월일</Label>
                                    <Input id="birth_date" name="birth_date" type="date" required className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">생시 (12간지)</Label>
                                    <Select name="birth_time" defaultValue="unknown">
                                        <SelectTrigger className="bg-white/5 border-white/10">
                                            <SelectValue placeholder="생시 선택" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            {SHICHEN_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span>{opt.label}</span>
                                                        {opt.desc && (
                                                            <span className="text-xs text-muted-foreground">{opt.desc}</span>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">달력</Label>
                                        <Select name="calendar_type" defaultValue="solar">
                                            <SelectTrigger className="bg-white/5 border-white/10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="solar">양력</SelectItem>
                                                <SelectItem value="lunar">음력</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">성별</Label>
                                        <Select name="gender" defaultValue="male">
                                            <SelectTrigger className="bg-white/5 border-white/10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">남성</SelectItem>
                                                <SelectItem value="female">여성</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full bg-[#D4AF37] text-black hover:bg-[#F4E4BA] font-bold mt-4"
                                >
                                    {isPending ? "등록 중..." : "운명부에 등록"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Member Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                        ))
                    ) : members.length === 0 ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-white/20" />
                            </div>
                            <h3 className="font-bold mb-2">등록된 인연이 없습니다</h3>
                            <p className="text-sm text-muted-foreground">새 인연을 등록해주세요.</p>
                        </div>
                    ) : (
                        members.map((member) => {
                            const isSelected = selectedIds.has(member.id);
                            const saju = getSajuData(
                                member.birth_date,
                                member.birth_time || "00:00",
                                member.calendar_type === "solar"
                            );

                            return (
                                <Card
                                    key={member.id}
                                    onClick={() => toggleSelect(member.id)}
                                    className={cn(
                                        "relative cursor-pointer transition-all duration-300 border-2",
                                        isSelected
                                            ? "border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                                            : "border-white/10 bg-white/5 hover:border-white/20"
                                    )}
                                >
                                    {/* Selection Indicator */}
                                    <div className={cn(
                                        "absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                        isSelected ? "bg-[#D4AF37] text-black" : "bg-white/10"
                                    )}>
                                        {isSelected && <Check className="w-4 h-4" />}
                                    </div>

                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                member.gender === "male" ? "bg-blue-500/20" : "bg-pink-500/20"
                                            )}>
                                                <User className={cn(
                                                    "w-5 h-5",
                                                    member.gender === "male" ? "text-blue-400" : "text-pink-400"
                                                )} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold">{member.name}</h3>
                                                <p className="text-xs text-muted-foreground">{member.relationship}</p>
                                            </div>
                                        </div>

                                        {/* Saju Pillars Mini */}
                                        <div className="flex gap-2 mb-3">
                                            {["year", "month", "day", "time"].map((key) => (
                                                <div key={key} className="flex-1 text-center py-1.5 rounded-lg bg-white/5">
                                                    <span className="text-xs font-bold text-[#D4AF37]">
                                                        {saju.pillars[key as keyof typeof saju.pillars].ganji}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Birth Info */}
                                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <span>{member.birth_date} ({member.calendar_type === "solar" ? "양" : "음"})</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-red-400"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMember(member.id, member.name);
                                                }}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Floating Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 shadow-2xl">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                                <span className="text-sm font-bold text-[#D4AF37]">{selectedIds.size}</span>
                            </div>
                            <span className="text-sm">명 선택됨</span>
                        </div>

                        <div className="h-6 w-px bg-white/10" />

                        <Button
                            onClick={() => setSelectedIds(new Set())}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-white"
                        >
                            선택 해제
                        </Button>

                        <Button
                            onClick={handleAnalyze}
                            className="bg-gradient-to-r from-[#D4AF37] to-[#F4E4BA] text-black font-bold px-6"
                        >
                            {selectedIds.size >= 2 ? (
                                <>
                                    <Heart className="w-4 h-4 mr-2" />
                                    궁합 분석
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    천지인 분석
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
