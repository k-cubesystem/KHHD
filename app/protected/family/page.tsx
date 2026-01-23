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
import { Trash2, UserPlus, Plus, Sparkles, User, Users, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ZodiacTimeSelect } from "@/components/zodiac-time-select";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function FamilyPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]); // For Compatibility Analysis
    const [isFormOpen, setIsFormOpen] = useState(false);
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
        // Navigate to Compatibility Page (Assuming create logic later)
        router.push(`/protected/saju/compatibility?target1=${selectedMembers[0]}&target2=${selectedMembers[1]}`);
    };

    return (
        <div className="flex flex-col gap-10 w-full max-w-6xl mx-auto py-12 px-6 pb-32">

            {/* Header: Zen Style */}
            <section className="space-y-4 text-center">
                <div className="flex justify-center mb-2">
                    <div className="bg-zen-bg border border-zen-border px-4 py-1.5 rounded-sm flex items-center gap-2 text-zen-wood text-xs font-bold uppercase tracking-widest">
                        <Users className="w-3.5 h-3.5" />
                        Family & Relationships
                    </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-zen-text">
                    인연(因緣) 관리부
                </h1>
                <p className="text-zen-muted text-lg max-w-2xl mx-auto leading-relaxed font-sans">
                    옷깃만 스쳐도 인연이라 했습니다.<br />
                    소중한 이들의 명조를 등록하고, 서로의 합(合)을 확인해 보세요.
                </p>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

                {/* Registration Form (Left Column on Desktop, Top Accordion on Mobile) */}
                <div className="lg:col-span-4 h-fit order-1">
                    <Card className="border-zen-border bg-white shadow-sm hover:shadow-md transition-shadow rounded-sm overflow-hidden lg:sticky lg:top-24">
                        <div className="h-1 bg-zen-wood w-full" />

                        {/* Header with Toggle */}
                        <CardHeader
                            className="pb-4 border-b border-zen-border/50 bg-zen-bg/50 cursor-pointer lg:cursor-default"
                            onClick={() => window.innerWidth < 1024 && setIsFormOpen(!isFormOpen)}
                        >
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-xl font-serif font-bold text-zen-text">
                                    <Plus className="w-5 h-5 text-zen-gold" />
                                    새 인연 맺기
                                </CardTitle>
                                <ChevronDown className={cn(
                                    "w-5 h-5 text-zen-muted transition-transform lg:hidden",
                                    isFormOpen ? "rotate-180" : ""
                                )} />
                            </div>
                        </CardHeader>

                        {/* Collapsible Content */}
                        <div className={cn(
                            "transition-all duration-300 overflow-hidden",
                            isFormOpen ? "max-h-[1000px] opacity-100" : "max-h-0 lg:max-h-none opacity-0 lg:opacity-100"
                        )}>
                            <CardContent className="pt-6">
                                <form action={async (formData) => {
                                    await handleAddMember(formData);
                                    if (window.innerWidth < 1024) setIsFormOpen(false); // Close on mobile after submit
                                }} className="flex flex-col gap-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-xs uppercase tracking-widest text-zen-muted font-bold">성명 (Name)</Label>
                                        <Input id="name" name="name" placeholder="예: 홍길동" required className="bg-white border-zen-border focus:border-zen-gold transition-all text-zen-text rounded-sm h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="relationship" className="text-xs uppercase tracking-widest text-zen-muted font-bold">관계 (Relation)</Label>
                                        <Input id="relationship" name="relationship" placeholder="본인, 배우자, 자녀 등" required className="bg-white border-zen-border focus:border-zen-gold transition-all text-zen-text rounded-sm h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="birth_date" className="text-xs uppercase tracking-widest text-zen-muted font-bold">생년월일 (Date)</Label>
                                        <Input id="birth_date" name="birth_date" type="date" required className="bg-white border-zen-border focus:border-zen-gold transition-all text-zen-text rounded-sm h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="birth_time" className="text-xs uppercase tracking-widest text-zen-muted font-bold">생시 (Time)</Label>
                                        <ZodiacTimeSelect
                                            name="birth_time"
                                            className="bg-white border-zen-border focus:border-zen-gold transition-all text-zen-text rounded-sm h-11"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase tracking-widest text-zen-muted font-bold">달력 (Type)</Label>
                                            <Select name="calendar_type" defaultValue="solar">
                                                <SelectTrigger className="bg-white border-zen-border text-zen-text rounded-sm h-11">
                                                    <SelectValue placeholder="선택" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-zen-border">
                                                    <SelectItem value="solar">양력 (Solar)</SelectItem>
                                                    <SelectItem value="lunar">음력 (Lunar)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase tracking-widest text-zen-muted font-bold">성별 (Gender)</Label>
                                            <Select name="gender" defaultValue="male">
                                                <SelectTrigger className="bg-white border-zen-border text-zen-text rounded-sm h-11">
                                                    <SelectValue placeholder="선택" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-zen-border">
                                                    <SelectItem value="male">남성 (Male)</SelectItem>
                                                    <SelectItem value="female">여성 (Female)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={isPending} className="mt-4 w-full bg-zen-wood hover:bg-[#7A604D] text-white font-serif font-bold py-6 rounded-sm shadow-sm transition-all active:scale-[0.98]">
                                        {isPending ? "기운을 담는 중..." : "운명부 등록하기"}
                                    </Button>
                                </form>
                            </CardContent>
                        </div>
                    </Card>
                </div>

                {/* Member List (Right Column) */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-zen-border pb-4">
                        <h3 className="text-lg font-serif font-bold text-zen-text flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-zen-gold" />
                            등록된 인연 리스트
                        </h3>
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="border-zen-wood text-zen-wood px-3 py-1 bg-white">
                                Total {members.length}
                            </Badge>
                            {/* Mobile visual hint for selection */}
                            <span className="text-[10px] text-zen-muted md:hidden">
                                * 탭하여 선택
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                        {loading ? (
                            Array(4).fill(0).map((_, i) => (
                                <Skeleton key={i} className="h-48 w-full rounded-sm bg-white border border-zen-border" />
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
                                        "relative group overflow-hidden border transition-all duration-300 rounded-sm cursor-pointer hover:-translate-y-1",
                                        isSelected
                                            ? "border-zen-gold bg-zen-gold/5 shadow-md ring-1 ring-zen-gold"
                                            : "border-zen-border bg-white hover:border-zen-gold/50 hover:shadow-lg"
                                    )}
                                    onClick={() => toggleSelection(member.id)}
                                >
                                    {/* Selection Checkbox */}
                                    <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelection(member.id)}
                                            className="data-[state=checked]:bg-zen-gold data-[state=checked]:border-zen-gold border-zen-border w-4 h-4 md:w-5 md:h-5 rounded-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>

                                    <CardContent className="pt-4 px-3 pb-4 md:pt-6 md:px-6 md:pb-6">
                                        <div className="flex flex-col md:flex-row justify-between items-start mb-3 md:mb-6 gap-2">
                                            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full">
                                                <div className={cn(
                                                    "w-8 h-8 md:w-12 md:h-12 rounded-sm flex items-center justify-center border transition-colors shrink-0",
                                                    isSelected
                                                        ? "bg-zen-gold text-white border-zen-gold"
                                                        : "bg-zen-bg border-zen-border text-zen-wood group-hover:bg-zen-wood group-hover:text-white"
                                                )}>
                                                    <User className="w-4 h-4 md:w-6 md:h-6" />
                                                </div>
                                                <div className="w-full">
                                                    <div className="flex flex-wrap items-center gap-1 md:gap-2">
                                                        <h4 className="font-serif font-bold text-sm md:text-xl text-zen-text truncate max-w-[80px] md:max-w-none">{member.name}</h4>
                                                        <span className="text-[9px] md:text-[10px] uppercase font-bold text-zen-muted border border-zen-border px-1 py-0.5 rounded-sm bg-zen-bg shrink-0">{member.relationship}</span>
                                                    </div>
                                                    <p className="text-[10px] md:text-xs text-zen-muted mt-0.5 md:mt-1 font-medium font-sans">
                                                        {member.birth_date.slice(2).replace(/-/g, ". ")}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Delete Button (Hidden on Mobile unless logic changed, keeping simplistic for now) */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMember(member.id, member.name);
                                                }}
                                                className="absolute bottom-2 right-2 md:bottom-4 md:right-4 text-zen-border hover:text-red-500 hover:bg-red-50 rounded-sm opacity-100 md:opacity-0 group-hover:opacity-100 transition-all z-20 w-6 h-6 md:w-9 md:h-9 p-0"
                                            >
                                                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                                            </Button>
                                        </div>

                                        {/* Saju Pillars (Compact on Mobile) */}
                                        <div className="grid grid-cols-4 gap-1 md:gap-2 mb-3 md:mb-6">
                                            {[
                                                { label: "시", data: saju.pillars.time },
                                                { label: "일", data: saju.pillars.day },
                                                { label: "월", data: saju.pillars.month },
                                                { label: "년", data: saju.pillars.year },
                                            ].map((p, i) => (
                                                <div key={i} className="flex flex-col items-center py-1 md:py-2.5 rounded-sm bg-zen-bg border border-zen-border group-hover:bg-white group-hover:border-zen-gold/30 transition-colors">
                                                    <span className="text-[8px] md:text-[9px] text-zen-muted mb-0.5 md:mb-1 font-bold uppercase tracking-wider">{p.label}</span>
                                                    <span className="font-serif font-bold text-zen-text text-xs md:text-base">{p.data.ganji}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Wuxing Balance */}
                                        <div className="space-y-1 md:space-y-2">
                                            <div className="flex justify-between text-[8px] md:text-[10px] font-bold text-zen-muted uppercase tracking-widest">
                                                <span>오행</span>
                                            </div>
                                            <div className="flex gap-0.5 md:gap-1 h-1.5 md:h-2 rounded-full overflow-hidden bg-zen-bg p-0.5 border border-zen-border">
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
                                                            className="rounded-full opacity-80"
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
                            <div className="col-span-full py-20 text-center bg-white border border-dashed border-zen-border rounded-sm">
                                <div className="w-16 h-16 bg-zen-bg rounded-full flex items-center justify-center mx-auto mb-4 text-zen-muted border border-zen-border">
                                    <UserPlus className="w-8 h-8" />
                                </div>
                                <h4 className="text-lg font-serif font-bold text-zen-text mb-1">등록된 인연이 없습니다.</h4>
                                <p className="text-sm text-zen-muted font-sans">좌측의 등록 양식을 통해 소중한 인연을 추가하세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Compatibility Action Bar */}
            {selectedMembers.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className="bg-zen-text text-white pl-6 pr-2 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-zen-border/20 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {selectedMembers.map((id, idx) => {
                                    const m = members.find(x => x.id === id);
                                    return (
                                        <div key={id} className="w-8 h-8 rounded-full bg-zen-gold border-2 border-zen-text flex items-center justify-center font-serif text-xs font-bold text-zen-text shadow-sm" style={{ zIndex: selectedMembers.length - idx }}>
                                            {m?.name[0]}
                                        </div>
                                    )
                                })}
                            </div>
                            <span className="text-sm font-bold font-sans">
                                {selectedMembers.length}명 선택됨
                            </span>
                        </div>

                        <div className="h-6 w-[1px] bg-white/20" />

                        {selectedMembers.length === 2 ? (
                            <Button
                                onClick={handleCompatibilityAnalysis}
                                className="bg-zen-gold hover:bg-zen-gold/90 text-zen-text font-bold rounded-full px-5 h-9 transition-all active:scale-95 text-sm"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                궁합 보기
                            </Button>
                        ) : (
                            <span className="text-xs text-white/60 font-sans pr-2">
                                1명 더 선택하세요
                            </span>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedMembers([])}
                            className="text-white/40 hover:text-white rounded-full h-8 w-8 hover:bg-white/10"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
