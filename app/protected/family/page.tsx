"use client";

import { useEffect, useState, useTransition } from "react";
import { addFamilyMember, deleteFamilyMember, updateFamilyMember } from "@/app/actions/family-actions";
import { getFamilyWithMissions, type FamilyMemberWithMissions } from "@/app/actions/family-missions";
import { MemberMissionCard } from "@/components/family/member-mission-card";
import { MissionDetailSheet } from "@/components/family/mission-detail-sheet";
import { Button } from "@/components/ui/button";
import { BrandQuote } from "@/components/ui/BrandQuote";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, UserPlus, Plus, Sparkles, User, Edit3, X, History, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ZodiacTimeSelect } from "@/components/zodiac-time-select";
import { createClient } from "@/lib/supabase/client";
import { GuestCTACard } from "@/components/guest-cta-card";
import { Users } from "lucide-react";
import Link from "next/link";
import { cn, toConversationalTone } from "@/lib/utils";
import { BRAND_QUOTES } from "@/lib/constants/brand-quotes";

interface EditingMember {
    id: string;
    name: string;
    relationship: string;
    birth_date: string;
    birth_time: string;
    calendar_type: string;
    gender: string;
}

export default function FamilyPage() {
    const [members, setMembers] = useState<FamilyMemberWithMissions[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [editingMember, setEditingMember] = useState<EditingMember | null>(null);
    const [selectedMember, setSelectedMember] = useState<FamilyMemberWithMissions | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

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

            const data = await getFamilyWithMissions();
            setMembers(data);
        } catch (error) {
            console.error("Fetch Error:", error);
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
                setIsFormOpen(false);
            } catch (error: any) {
                toast.error(error.message);
            }
        });
    };

    const handleUpdateMember = async (formData: FormData) => {
        if (!editingMember) return;

        startTransition(async () => {
            try {
                formData.append("id", editingMember.id);
                await updateFamilyMember(formData);
                toast.success("인연 정보가 수정되었습니다.");
                fetchMembers();
                setEditingMember(null);
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
                fetchMembers();
            } catch (error: any) {
                toast.error(error.message);
            }
        });
    };

    const startEditing = (member: FamilyMemberWithMissions) => {
        setEditingMember({
            id: member.id,
            name: member.name,
            relationship: member.relationship,
            birth_date: member.birth_date,
            birth_time: member.birth_time || "00:00",
            calendar_type: member.calendar_type,
            gender: member.gender,
        });
        setIsFormOpen(false);
    };

    // --- Guest View ---
    if (isGuest) {
        return (
            <div className="flex flex-col gap-10 w-full max-w-[480px] mx-auto py-12 px-6 pb-32">
                <section className="space-y-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex justify-center mb-2">
                        <div className="bg-surface/50 border border-primary/20 px-4 py-1.5 rounded-full flex items-center gap-2 text-primary font-light uppercase tracking-widest text-xs backdrop-blur-md">
                            <Users className="w-3.5 h-3.5" strokeWidth={1} />
                            Family & Relationships
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight text-ink-light">
                        인연(因緣) <span className="text-[#D4AF37]">관리부</span>
                    </h1>
                    <BrandQuote variant="hero">
                        {BRAND_QUOTES.family.subHero}
                    </BrandQuote>
                </section>

                <GuestCTACard
                    title="가입하고 인연 관리 시작하기"
                    description="가족, 친구, 연인, 직장 상사까지 소중한 인연들의 사주를 체계적으로 관리하세요."
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
                        </div>
                    }
                />
            </div>
        );
    }

    // --- Authenticated View ---
    return (
        <div className="flex flex-col gap-6 w-full max-w-[480px] mx-auto py-8 px-0 pb-32 overflow-x-hidden">

            {/* Header */}
            <section className="space-y-4 text-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-center mb-2">
                    <div className="bg-surface/50 border border-primary/20 px-4 py-1.5 rounded-full flex items-center gap-2 text-primary font-light uppercase tracking-widest text-xs backdrop-blur-md">
                        <Users className="w-3.5 h-3.5" strokeWidth={1} />
                        Family & Relationships
                    </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-light tracking-tight text-ink-light">
                    <span className="text-[#D4AF37]">인연 관리부</span>
                </h1>
                <BrandQuote variant="hero">
                    {BRAND_QUOTES.family.hero}
                </BrandQuote>
            </section>

            {/* Stats Header */}
            <div className="px-6 flex items-center justify-between">
                <h3 className="text-lg font-serif font-light text-ink-light flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" strokeWidth={1} />
                    등록된 인연
                </h3>
                <Badge variant="outline" className="border-primary/50 text-primary px-3 py-1 bg-surface/50 backdrop-blur-sm font-light">
                    {members.length}명
                </Badge>
            </div>

            {/* Member Cards */}
            <div className="min-h-[300px]">
                {loading ? (
                    <div className="px-6 space-y-4">
                        <Skeleton className="h-56 w-full rounded-2xl bg-surface/20 border border-white/5" />
                        <Skeleton className="h-56 w-full rounded-2xl bg-surface/20 border border-white/5" />
                    </div>
                ) : members.length > 0 ? (
                    <div className="px-6 space-y-4">
                        {members.map((member, idx) => (
                            <MemberMissionCard
                                key={member.id}
                                member={member}
                                index={idx}
                                onClick={() => {
                                    setSelectedMember(member);
                                    setIsSheetOpen(true);
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="mx-6 py-12 text-center bg-surface/20 border border-dashed border-primary/20 rounded-2xl">
                        <div className="w-14 h-14 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-primary/40 border border-white/5">
                            <UserPlus className="w-6 h-6" strokeWidth={1} />
                        </div>
                        <h4 className="text-base font-serif font-light text-ink-light mb-1">아직 등록된 인연이 없네요.</h4>
                        <p className="text-sm text-ink-light/50 font-sans font-light">{BRAND_QUOTES.family.empty}</p>
                    </div>
                )}
            </div>

            {/* Add Button Area */}
            <div className="px-6">
                {!isFormOpen && !editingMember && (
                    <Button
                        onClick={() => setIsFormOpen(true)}
                        variant="outline"
                        className="w-full py-4 rounded-xl"
                    >
                        <Plus className="w-5 h-5 mr-2" strokeWidth={1} />
                        새로운 인연 등록하기
                    </Button>
                )}
            </div>

            {/* Registration Form (Only shows when active) */}
            {(isFormOpen || editingMember) && (
                <div className="px-6 fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card className="w-full max-w-sm border border-primary/30 bg-[#151515] shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        {/* ... Existing Form Logic ... */}
                        <CardHeader className="pb-4 border-b border-white/5 bg-surface/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg font-serif font-light text-ink-light">
                                    {editingMember ? "인연 정보 수정" : "새 인연 맺기"}
                                </CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => { setIsFormOpen(false); setEditingMember(null); }}>
                                    <X className="w-5 h-5" strokeWidth={1} />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form action={async (formData) => {
                                if (editingMember) await handleUpdateMember(formData);
                                else await handleAddMember(formData);
                            }} className="flex flex-col gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-primary/80">이름</Label>
                                    <Input name="name" defaultValue={editingMember?.name} required />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-primary/80">관계</Label>
                                    <Input name="relationship" defaultValue={editingMember?.relationship} placeholder="예: 배우자" required />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-primary/80">생년월일</Label>
                                        <Input name="birth_date" type="date" defaultValue={editingMember?.birth_date} required className="[color-scheme:dark]" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-primary/80">생시</Label>
                                        <ZodiacTimeSelect name="birth_time" defaultValue={editingMember?.birth_time} className="input-manse text-white" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Select name="calendar_type" defaultValue={editingMember?.calendar_type || "solar"}>
                                        <SelectTrigger className="bg-black/30 border-white/10"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="solar">양력</SelectItem><SelectItem value="lunar">음력</SelectItem></SelectContent>
                                    </Select>
                                    <Select name="gender" defaultValue={editingMember?.gender || "male"}>
                                        <SelectTrigger className="bg-black/30 border-white/10"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="male">남성</SelectItem><SelectItem value="female">여성</SelectItem></SelectContent>
                                    </Select>
                                </div>

                                <Button type="submit" disabled={isPending} className="h-12 mt-2">
                                    {isPending ? "저장 중..." : "저장완료"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Mission Detail Sheet */}
            <MissionDetailSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                member={selectedMember}
            />
        </div>
    );
}
