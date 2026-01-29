"use client";

import { useEffect, useState, useTransition } from "react";
import { getFamilyMembers, addFamilyMember, deleteFamilyMember } from "@/app/actions/family-actions";
import { getSajuData, WU_XING_COLORS } from "@/lib/saju";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, UserPlus, Plus, Sparkles, User, Users, X, ChevronDown, Flower2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ZodiacTimeSelect } from "@/components/zodiac-time-select";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GuestCTACard } from "@/components/guest-cta-card";

export default function FamilyPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]); // For Compatibility Analysis
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const router = useRouter();

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setIsGuest(true);
                setLoading(false);
                return;
            }

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
                toast.success("함께할 인연이 등록되었습니다.");
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
                toast.success("인연 정보가 삭제되었습니다.");
                fetchMembers(); // Re-fetch list
                setSelectedMembers(prev => prev.filter(mid => mid !== id)); // Remove from selection if deleted
            } catch (error: any) {
                toast.error(error.message);
            }
        });
    };

    const toggleSelection = (id: string) => {
        if (selectedMembers.includes(id)) {
            setSelectedMembers(prev => prev.filter(mId => mId !== id));
        } else {
            if (selectedMembers.length >= 2) {
                toast.error("궁합 분석은 최대 2명까지만 선택 가능합니다.");
                return;
            }
            setSelectedMembers(prev => [...prev, id]);
        }
    };

    const handleCompatibilityAnalysis = () => {
        if (selectedMembers.length !== 2) return;
        // Navigate to Compatibility Page
        router.push(`/protected/saju/compatibility?target1=${selectedMembers[0]}&target2=${selectedMembers[1]}`);
    };

    if (isGuest) {
        return (
            <div className="flex flex-col gap-10 w-full max-w-7xl mx-auto py-12 px-6 pb-32">
                <section className="space-y-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex justify-center mb-2">
                        <div className="bg-surface/50 border border-primary/20 px-4 py-1.5 rounded-full flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs backdrop-blur-md">
                            <Users className="w-3.5 h-3.5" />
                            Family & Relationships
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-ink-light">
                        인연(因緣) <span className="text-primary-dim">관리부</span>
                    </h1>
                    <p className="text-ink-light/60 text-lg max-w-2xl mx-auto leading-relaxed font-sans font-light">
                        옷깃만 스쳐도 인연이라 했습니다.<br />
                        소중한 이들의 명조를 등록하고, 서로의 합(合)을 확인해 보세요.
                    </p>
                </section>

                <GuestCTACard
                    title="가입하고 인연 관리 시작하기"
                    description="가족, 친구, 연인, 직장 상사까지 소중한 인연들의 사주를 체계적으로 관리하고, 궁합과 처세술을 확인하세요. 데이터가 쌓일수록 더욱 정교한 인연 분석이 가능해집니다."
                    icon={<Users className="w-8 h-8 text-primary" strokeWidth={1} />}
                    preview={
                        <div className="space-y-3">
                            <div className="bg-surface/20 border border-primary/20 p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                            <User className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-serif text-ink-light">홍길동</h3>
                                            <p className="text-xs text-ink-light/60">배우자 • 1990.03.15</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-primary/10 text-primary border-primary/30">목(木)</Badge>
                                </div>
                            </div>
                            <div className="bg-surface/20 border border-primary/20 p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-seal/10 border border-seal/20 flex items-center justify-center">
                                            <User className="w-6 h-6 text-seal" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-serif text-ink-light">김철수</h3>
                                            <p className="text-xs text-ink-light/60">상사 • 1985.07.22</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-seal/10 text-seal border-seal/30">화(火)</Badge>
                                </div>
                            </div>
                        </div>
                    }
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 w-full max-w-7xl mx-auto py-12 px-6 pb-32">

            {/* Header: Dark Luxury */}
            <section className="space-y-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-center mb-2">
                    <div className="bg-surface/50 border border-primary/20 px-4 py-1.5 rounded-full flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs backdrop-blur-md">
                        <Users className="w-3.5 h-3.5" />
                        Family & Relationships
                    </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-ink-light">
                    인연(因緣) <span className="text-primary-dim">관리부</span>
                </h1>
                <p className="text-ink-light/60 text-lg max-w-2xl mx-auto leading-relaxed font-sans font-light">
                    옷깃만 스쳐도 인연이라 했습니다.<br />
                    소중한 이들의 명조를 등록하고, 서로의 합(合)을 확인해 보세요.
                </p>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

                {/* Registration Form (Left Column on Desktop, Top on Mobile) */}
                <div className="lg:col-span-4 h-fit order-1">
                    <Card className="border-primary/20 bg-surface/30 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden lg:sticky lg:top-24">
                        <div className="h-1 bg-gradient-to-r from-primary-dark via-primary to-primary-dark w-full" />

                        {/* Collapsible Header for Mobile */}
                        <CardHeader
                            className="pb-4 border-b border-white/5 bg-surface/50 cursor-pointer lg:cursor-default"
                            onClick={() => window.innerWidth < 1024 && setIsFormOpen(!isFormOpen)}
                        >
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-xl font-serif font-bold text-ink-light">
                                    <Plus className="w-5 h-5 text-primary" />
                                    새 인연 맺기
                                </CardTitle>
                                <ChevronDown className={cn(
                                    "w-5 h-5 text-ink-light/50 transition-transform lg:hidden",
                                    isFormOpen ? "rotate-180" : ""
                                )} />
                            </div>
                        </CardHeader>

                        {/* Form Content */}
                        <div className={cn(
                            "transition-all duration-300 overflow-hidden",
                            isFormOpen ? "max-h-[1000px] opacity-100" : "max-h-0 lg:max-h-none opacity-0 lg:opacity-100"
                        )}>
                            <CardContent className="pt-6 space-y-5">
                                <form action={async (formData) => {
                                    await handleAddMember(formData);
                                    if (window.innerWidth < 1024) setIsFormOpen(false);
                                }} className="flex flex-col gap-5">

                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-xs uppercase tracking-widest text-primary font-bold">성명 (Name)</Label>
                                        <Input id="name" name="name" placeholder="예: 홍길동" required className="bg-surface/50 border-primary/20 focus:border-primary text-ink-light rounded-lg h-11 placeholder:text-ink-light/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="relationship" className="text-xs uppercase tracking-widest text-primary font-bold">관계 (Relation)</Label>
                                        <Input id="relationship" name="relationship" placeholder="본인, 배우자, 자녀 등" required className="bg-surface/50 border-primary/20 focus:border-primary text-ink-light rounded-lg h-11 placeholder:text-ink-light/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="birth_date" className="text-xs uppercase tracking-widest text-primary font-bold">생년월일 (Date)</Label>
                                        <Input id="birth_date" name="birth_date" type="date" required className="bg-surface/50 border-primary/20 focus:border-primary text-ink-light rounded-lg h-11 [color-scheme:dark]" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="birth_time" className="text-xs uppercase tracking-widest text-primary font-bold">생시 (Time)</Label>
                                        <ZodiacTimeSelect
                                            name="birth_time"
                                            className="bg-surface/50 border-primary/20 focus:border-primary text-ink-light rounded-lg h-11"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase tracking-widest text-primary font-bold">달력 (Type)</Label>
                                            <Select name="calendar_type" defaultValue="solar">
                                                <SelectTrigger className="bg-surface/50 border-primary/20 text-ink-light rounded-lg h-11">
                                                    <SelectValue placeholder="선택" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-surface border-primary/20 text-ink-light">
                                                    <SelectItem value="solar">양력 (Solar)</SelectItem>
                                                    <SelectItem value="lunar">음력 (Lunar)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase tracking-widest text-primary font-bold">성별 (Gender)</Label>
                                            <Select name="gender" defaultValue="male">
                                                <SelectTrigger className="bg-surface/50 border-primary/20 text-ink-light rounded-lg h-11">
                                                    <SelectValue placeholder="선택" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-surface border-primary/20 text-ink-light">
                                                    <SelectItem value="male">남성 (Male)</SelectItem>
                                                    <SelectItem value="female">여성 (Female)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={isPending} className="mt-4 w-full bg-primary hover:bg-primary-dim text-background font-serif font-bold py-6 rounded-lg shadow-[0_0_15px_rgba(226,213,181,0.2)] transition-all active:scale-[0.98]">
                                        {isPending ? "기운을 담는 중..." : "운명부 등록하기"}
                                    </Button>
                                </form>
                            </CardContent>
                        </div>
                    </Card>
                </div>

                {/* Member List (Right Column) */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <h3 className="text-lg font-serif font-bold text-ink-light flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            등록된 인연 리스트
                        </h3>
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="border-primary/50 text-primary px-3 py-1 bg-surface/50 backdrop-blur-sm">
                                Total {members.length}
                            </Badge>
                            <span className="text-[10px] text-ink-light/40 md:hidden">
                                * 탭하여 선택
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {loading ? (
                            Array(4).fill(0).map((_, i) => (
                                <Skeleton key={i} className="h-48 w-full rounded-2xl bg-surface/20 border border-white/5" />
                            ))
                        ) : members.map((member: any) => {
                            const saju = getSajuData(
                                member.birth_date,
                                member.birth_time || "00:00",
                                member.calendar_type === "solar"
                            );
                            const isSelected = selectedMembers.includes(member.id);

                            return (
                                <Card
                                    key={member.id}
                                    className={cn(
                                        "relative group overflow-hidden border transition-all duration-300 rounded-2xl cursor-pointer hover:-translate-y-1",
                                        isSelected
                                            ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(226,213,181,0.15)]"
                                            : "border-primary/10 bg-surface/30 backdrop-blur-sm hover:border-primary/40 hover:bg-surface/50"
                                    )}
                                    onClick={() => toggleSelection(member.id)}
                                >
                                    {/* Texture Overlay */}
                                    <div className="absolute inset-0 bg-noise-pattern opacity-10 pointer-events-none" />

                                    {/* Selection Checkbox */}
                                    <div className="absolute top-2 right-2 md:top-4 md:right-4 z-20">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelection(member.id)}
                                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-primary/30 w-4 h-4 md:w-5 md:h-5 rounded-md"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>

                                    <CardContent className="pt-4 px-3 pb-4 md:pt-6 md:px-6 md:pb-6 relative z-10">
                                        <div className="flex flex-col md:flex-row justify-between items-start mb-3 md:mb-6 gap-2">
                                            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full">
                                                <div className={cn(
                                                    "w-8 h-8 md:w-12 md:h-12 rounded-xl flex items-center justify-center border transition-colors shrink-0",
                                                    isSelected
                                                        ? "bg-primary text-background border-primary"
                                                        : "bg-surface border-primary/20 text-primary-dim group-hover:text-primary group-hover:border-primary/50"
                                                )}>
                                                    <User className="w-4 h-4 md:w-6 md:h-6" />
                                                </div>
                                                <div className="w-full">
                                                    <div className="flex flex-wrap items-center gap-1 md:gap-2">
                                                        <h4 className="font-serif font-bold text-sm md:text-xl text-ink-light truncate max-w-[80px] md:max-w-none">{member.name}</h4>
                                                        <span className="text-[9px] md:text-[10px] uppercase font-bold text-primary-dim border border-primary/20 px-1.5 py-0.5 rounded bg-surface/50 shrink-0">{member.relationship}</span>
                                                    </div>
                                                    <p className="text-[10px] md:text-xs text-ink-light/50 mt-0.5 md:mt-1 font-medium font-sans">
                                                        {member.birth_date.slice(2).replace(/-/g, ". ")}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMember(member.id, member.name);
                                                }}
                                                className="absolute bottom-2 right-2 md:bottom-4 md:right-4 text-ink-light/20 hover:text-red-400 hover:bg-red-950/20 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all z-20 w-6 h-6 md:w-8 md:h-8 p-0"
                                            >
                                                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                                            </Button>
                                        </div>

                                        {/* Saju Pillars */}
                                        <div className="grid grid-cols-4 gap-1 md:gap-2 mb-3 md:mb-6">
                                            {[
                                                { label: "시", data: saju.pillars.time },
                                                { label: "일", data: saju.pillars.day },
                                                { label: "월", data: saju.pillars.month },
                                                { label: "년", data: saju.pillars.year },
                                            ].map((p, i) => (
                                                <div key={i} className="flex flex-col items-center py-1 md:py-2.5 rounded-lg bg-surface/50 border border-white/5 group-hover:border-primary/20 transition-colors">
                                                    <span className="text-[8px] md:text-[9px] text-ink-light/40 mb-0.5 md:mb-1 font-bold uppercase tracking-wider">{p.label}</span>
                                                    <span className="font-serif font-bold text-ink-light text-xs md:text-base">{p.data.ganji}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Wuxing Balance */}
                                        <div className="space-y-1 md:space-y-2">
                                            <div className="flex justify-between text-[8px] md:text-[10px] font-bold text-ink-light/40 uppercase tracking-widest">
                                                <span>오행 밸런스</span>
                                            </div>
                                            <div className="flex gap-0.5 md:gap-1 h-1.5 md:h-2 rounded-full overflow-hidden bg-surface p-0.5 border border-white/5">
                                                {Object.entries(saju.elementsDistribution).map(([el, count]) => {
                                                    const width = (count / 8) * 100;
                                                    if (width === 0) return null;
                                                    return (
                                                        <div
                                                            key={el}
                                                            style={{
                                                                width: `${width}%`,
                                                                backgroundColor: WU_XING_COLORS[el]
                                                            }}
                                                            className="rounded-full opacity-90 shadow-[0_0_5px_rgba(0,0,0,0.5)]"
                                                            title={`${el}: ${count}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {members.length === 0 && !loading && (
                            <div className="col-span-full py-20 text-center bg-surface/20 border border-dashed border-primary/20 rounded-2xl">
                                <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-primary/40 border border-white/5">
                                    <UserPlus className="w-8 h-8" />
                                </div>
                                <h4 className="text-lg font-serif font-bold text-ink-light mb-1">등록된 인연이 없습니다.</h4>
                                <p className="text-sm text-ink-light/50 font-sans">좌측의 등록 양식을 통해 소중한 인연을 추가하세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Compatibility Action Bar */}
            {selectedMembers.length > 0 && (
                <div className="fixed bottom-24 lg:bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 w-[90%] md:w-auto">
                    <div className="bg-primary hover:bg-primary-dim transition-colors text-background px-4 py-3 md:px-6 md:py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.4)] flex items-center justify-between md:justify-center gap-4 border border-white/20 backdrop-blur-md">

                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {selectedMembers.map((id, idx) => {
                                    const m = members.find(x => x.id === id);
                                    return (
                                        <div key={id} className="w-8 h-8 rounded-full bg-surface border-2 border-primary flex items-center justify-center font-serif text-xs font-bold text-primary shadow-sm" style={{ zIndex: selectedMembers.length - idx }}>
                                            {m?.name[0]}
                                        </div>
                                    )
                                })}
                            </div>
                            <span className="text-sm font-bold font-sans hidden md:inline">
                                {selectedMembers.length}명 선택됨
                            </span>
                        </div>

                        <div className="h-6 w-[1px] bg-black/10 hidden md:block" />

                        {selectedMembers.length === 2 ? (
                            <Button
                                onClick={handleCompatibilityAnalysis}
                                className="bg-background/20 hover:bg-background/30 text-ink-900 font-bold rounded-full px-5 h-9 transition-all active:scale-95 text-sm"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                궁합 보기
                            </Button>
                        ) : (
                            <span className="text-xs text-ink-900/60 font-sans font-bold pr-2 whitespace-nowrap">
                                1명 더 선택하세요
                            </span>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedMembers([])}
                            className="text-ink-900/40 hover:text-ink-900 rounded-full h-8 w-8 hover:bg-black/5 -mr-2"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
