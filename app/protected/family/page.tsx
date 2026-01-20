import { getFamilyMembers, addFamilyMember, deleteFamilyMember } from "@/app/actions/family-actions";
import { getSajuData, WU_XING_COLORS } from "@/lib/saju";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Calendar } from "lucide-react";

import { Suspense } from "react";

export default function FamilyPage() {
    return (
        <div className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-8 px-4">
            <Suspense fallback={<div className="text-center py-20 animate-pulse">데이터를 불러오는 중...</div>}>
                <FamilyContent />
            </Suspense>
        </div>
    );
}

async function FamilyContent() {
    const members = await getFamilyMembers();
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    return (
        <>
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                        가족 관리 대시보드
                    </h1>
                    {isDemoMode && (
                        <Badge variant="outline" className="text-primary border-primary animate-pulse">
                            데모 모드 활성
                        </Badge>
                    )}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                    가족과 지인의 정보를 등록하여 운명 공학적 분석 리스트를 관리하세요.
                    {isDemoMode && " (현재 보시는 데이터는 예시이며, 실제 DB 연동을 위해서는 설정이 필요합니다.)"}
                </p>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                {/* Registration Form */}
                <Card className="lg:col-span-1 glass border-none h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" />
                            구성원 추가
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={addFamilyMember} className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">이름</Label>
                                <Input id="name" name="name" placeholder="홍길동" required className="bg-background/50" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="relationship">관계</Label>
                                <Input id="relationship" name="relationship" placeholder="본인, 부, 모, 친구 등" required className="bg-background/50" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birth_date">생년월일</Label>
                                <Input id="birth_date" name="birth_date" type="date" required className="bg-background/50" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birth_time">생시 (HH:mm)</Label>
                                <Input id="birth_time" name="birth_time" type="time" className="bg-background/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>력</Label>
                                    <select name="calendar_type" className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        <option value="solar">양력</option>
                                        <option value="lunar">음력</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>성별</Label>
                                    <select name="gender" className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        <option value="male">남성</option>
                                        <option value="female">여성</option>
                                    </select>
                                </div>
                            </div>
                            <Button type="submit" disabled={isDemoMode} className="mt-4 w-full">
                                {isDemoMode ? "데모 모드에선 등록 불가" : "등록하기"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Member List */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        등록된 사주 리스트 ({members.length})
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {members.map((member: any) => {
                            const saju = getSajuData(
                                member.birth_date,
                                member.birth_time || "00:00",
                                member.calendar_type === "solar"
                            );

                            return (
                                <Card key={member.id} className="relative group overflow-hidden border-none glass hover:bg-background/40 transition-all duration-300">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-lg">{member.name}</h4>
                                                    <Badge variant="secondary" className="text-[10px]">{member.relationship}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {member.birth_date} ({member.calendar_type === "solar" ? "양" : "음"})
                                                </p>
                                            </div>
                                            {!isDemoMode && (
                                                <form action={async () => {
                                                    "use server";
                                                    await deleteFamilyMember(member.id);
                                                }}>
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </form>
                                            )}
                                        </div>

                                        {/* Saju Pillars */}
                                        <div className="grid grid-cols-4 gap-2 mb-4">
                                            {[
                                                { label: "시", data: saju.pillars.time },
                                                { label: "일", data: saju.pillars.day },
                                                { label: "월", data: saju.pillars.month },
                                                { label: "년", data: saju.pillars.year },
                                            ].map((p, i) => (
                                                <div key={i} className="flex flex-col items-center p-2 rounded-lg bg-background/20 border border-white/5">
                                                    <span className="text-[10px] text-muted-foreground mb-1">{p.label}</span>
                                                    <span className="font-bold text-primary">{p.data.ganji}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Wuxing Distribution */}
                                        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-background/50">
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
                                                        title={`${el}: ${count}`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {members.length === 0 && (
                            <div className="col-span-full py-20 text-center glass rounded-3xl">
                                <p className="text-muted-foreground italic">등록된 정보가 없습니다. 첫 구성원을 추가해보세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
