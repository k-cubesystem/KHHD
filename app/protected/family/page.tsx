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
import { Trash2, UserPlus, Calendar, Plus, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ZodiacTimeSelect } from "@/components/zodiac-time-select";

export default function FamilyPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

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
                toast.success("가족 구성원이 성공적으로 등록되었습니다.");
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
                fetchMembers();
            } catch (error: any) {
                toast.error(error.message);
            }
        });
    };

    return (
        <div className="flex flex-col gap-12 w-full max-w-6xl mx-auto py-12 px-6">
            <section className="space-y-4 text-center">
                <h1 className="text-5xl font-extrabold tracking-tight text-gold py-2">
                    운명 공학 패밀리 관리
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                    전통의 지혜와 첨단 데이터 사이언스가 만나는 곳. <br />
                    가족과 소중한 지인들의 운명을 한눈에 관리하고 통찰을 얻으십시오.
                </p>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Registration Form */}
                <Card className="lg:col-span-1 glass border-white/10 shadow-2xl h-fit sticky top-24">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <Plus className="w-5 h-5 text-primary" />
                            새 인연 등록
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={handleAddMember} className="flex flex-col gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs uppercase tracking-widest text-muted-foreground">성명</Label>
                                <Input id="name" name="name" placeholder="예: 홍길동" required className="bg-background/40 border-white/10 focus:border-primary/50 transition-all font-medium" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="relationship" className="text-xs uppercase tracking-widest text-muted-foreground">관계</Label>
                                <Input id="relationship" name="relationship" placeholder="본인, 배우자, 자녀 등" required className="bg-background/40 border-white/10 focus:border-primary/50 transition-all" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birth_date" className="text-xs uppercase tracking-widest text-muted-foreground">생년월일</Label>
                                <Input id="birth_date" name="birth_date" type="date" required className="bg-background/40 border-white/10 focus:border-primary/50 transition-all" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birth_time" className="text-xs uppercase tracking-widest text-muted-foreground">생시 (선택)</Label>
                                <ZodiacTimeSelect
                                    name="birth_time"
                                    className="bg-background/40 border-white/10 focus:border-primary/50 transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">달력</Label>
                                    <Select name="calendar_type" defaultValue="solar">
                                        <SelectTrigger className="bg-background/40 border-white/10">
                                            <SelectValue placeholder="선택" />
                                        </SelectTrigger>
                                        <SelectContent className="glass border-white/10">
                                            <SelectItem value="solar">양력</SelectItem>
                                            <SelectItem value="lunar">음력</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">성별</Label>
                                    <Select name="gender" defaultValue="male">
                                        <SelectTrigger className="bg-background/40 border-white/10">
                                            <SelectValue placeholder="선택" />
                                        </SelectTrigger>
                                        <SelectContent className="glass border-white/10">
                                            <SelectItem value="male">남성</SelectItem>
                                            <SelectItem value="female">여성</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button type="submit" disabled={isPending} className="mt-4 w-full bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                                {isPending ? "기운을 담는 중..." : "운명부에 등록"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Member List */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-primary" />
                            등록된 운명 리스트
                            <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">
                                {members.length}명
                            </Badge>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {loading ? (
                            Array(4).fill(0).map((_, i) => (
                                <Skeleton key={i} className="h-48 w-full rounded-3xl glass" />
                            ))
                        ) : members.map((member: any) => {
                            const saju = getSajuData(
                                member.birth_date,
                                member.birth_time || "00:00",
                                member.calendar_type === "solar"
                            );

                            return (
                                <Card key={member.id} className="relative group overflow-hidden border-none glass hover:bg-white/5 transition-all duration-500 rounded-3xl group shadow-lg hover:shadow-primary/5">
                                    <CardContent className="pt-8 px-8 pb-8">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                                                    <User className="w-6 h-6 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-xl">{member.name}</h4>
                                                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{member.relationship}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 font-medium italic">
                                                        {member.birth_date.replace(/-/g, ". ")} ({member.calendar_type === "solar" ? "양력" : "음력"})
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteMember(member.id, member.name)}
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {/* Saju Pillars */}
                                        <div className="grid grid-cols-4 gap-3 mb-6">
                                            {[
                                                { label: "시", data: saju.pillars.time },
                                                { label: "일", data: saju.pillars.day },
                                                { label: "월", data: saju.pillars.month },
                                                { label: "년", data: saju.pillars.year },
                                            ].map((p, i) => (
                                                <div key={i} className="flex flex-col items-center py-3 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-colors">
                                                    <span className="text-[10px] text-muted-foreground mb-1 font-bold uppercase tracking-widest">{p.label}</span>
                                                    <span className="font-bold text-primary text-base">{p.data.ganji}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Wuxing Distribution */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                <span>오행 분포</span>
                                                <span>Balance</span>
                                            </div>
                                            <div className="flex gap-1.5 h-2.5 rounded-full overflow-hidden bg-white/5 p-0.5">
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
                                                            className="rounded-full shadow-inner"
                                                            title={`${el}: ${count}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </CardContent>
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                        <Sparkles className="w-24 h-24" />
                                    </div>
                                </Card>
                            );
                        })}

                        {members.length === 0 && !loading && (
                            <div className="col-span-full py-32 text-center glass rounded-[2.5rem] border-dashed border-2 border-white/10">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <UserPlus className="w-10 h-10 text-white/20" />
                                </div>
                                <h4 className="text-xl font-bold mb-2">아직 등록된 사주 정보가 없습니다.</h4>
                                <p className="text-muted-foreground">함께 분석할 가족이나 지인의 정보를 먼저 등록해보세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
