import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, User, Settings, CreditCard, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { calculateManse } from "@/lib/saju/manse";

export default async function ProfilePage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="min-h-screen bg-zen-bg font-sans flex items-center justify-center p-6">
                <Card className="max-w-md w-full border-zen-border bg-white shadow-lg text-center p-8 space-y-6">
                    <div className="w-16 h-16 bg-zen-gold/10 rounded-full flex items-center justify-center mx-auto text-zen-gold">
                        <User className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-serif font-bold text-zen-text">로그인이 필요합니다</h2>
                        <p className="text-zen-muted text-sm">
                            내 사주 정보를 관리하고 운명을 분석하려면<br />로그인이 필요합니다.
                        </p>
                    </div>
                    <div className="pt-2">
                        <Link href="/auth/login">
                            <Button className="w-full h-12 bg-zen-wood text-white font-bold text-lg hover:bg-[#7A604D]">
                                로그인하러 가기
                            </Button>
                        </Link>
                    </div>
                    <Link href="/" className="block text-xs text-zen-muted underline">
                        메인으로 돌아가기
                    </Link>
                </Card>
            </div>
        );
    }

    // Fetch Profile Data (Birth info) - Try to get from 'profiles' table
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const initial = user.email?.charAt(0).toUpperCase() || "U";
    const avatarUrl = user.user_metadata.avatar_url;

    // Check if user has entered saju info
    const hasSajuInfo = profile?.birth_date && profile?.birth_time;

    // Calculate Manse if info exists
    const manse = hasSajuInfo ? calculateManse(profile.birth_date, profile.birth_time) : null;

    return (
        <div className="min-h-screen bg-zen-bg font-sans pb-20">
            {/* 1. Header Area */}
            <div className="bg-white border-b border-zen-border pt-12 pb-8 px-6">
                <div className="max-w-md mx-auto flex items-center gap-6">
                    <Avatar className="w-20 h-20 border border-zen-border shadow-sm">
                        <AvatarImage src={avatarUrl} className="object-cover" />
                        <AvatarFallback className="bg-zen-wood text-white font-serif text-2xl">{initial}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-serif font-bold text-zen-text">
                                {user.user_metadata.full_name || "익명의 인연"}
                            </h1>
                            <Badge variant="secondary" className="bg-zen-gold/10 text-zen-gold border-zen-gold/20 text-[10px] px-1.5 py-0">MEMBER</Badge>
                        </div>
                        <p className="text-sm text-zen-muted font-mono">{user.email}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-6 py-8 space-y-8">

                {/* 2. Main Content: Saju Manse (Destiny Chart) */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-serif font-bold text-zen-text flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-zen-gold" />
                            나의 사주 원국 (四柱命式)
                        </h2>
                        {hasSajuInfo && (
                            <Link href="/protected/profile/edit" className="text-xs text-zen-muted underline">정보 수정</Link>
                        )}
                    </div>

                    {hasSajuInfo && manse ? (
                        // Case A: Data Exists (Show Manse)
                        <Card className="border-zen-border shadow-sm overflow-hidden bg-white">
                            <CardContent className="p-0">
                                {/* 4 Pillars Grid */}
                                <div className="grid grid-cols-4 divide-x divide-zen-border border-b border-zen-border">
                                    {/* Header */}
                                    <div className="text-center py-2 text-xs font-bold text-zen-muted bg-zen-bg/30">시주(時)</div>
                                    <div className="text-center py-2 text-xs font-bold text-zen-muted bg-zen-bg/30">일주(日)</div>
                                    <div className="text-center py-2 text-xs font-bold text-zen-muted bg-zen-bg/30">월주(月)</div>
                                    <div className="text-center py-2 text-xs font-bold text-zen-muted bg-zen-bg/30">년주(年)</div>
                                </div>
                                <div className="grid grid-cols-4 divide-x divide-zen-border h-32">
                                    {/* Gan (Upper) */}
                                    <div className={`flex flex-col items-center justify-center p-2 ${manse.time.color}`}>
                                        <span className="text-3xl font-serif font-bold">{manse.time.gan}</span>
                                        <span className="text-[10px] opacity-70 mt-1">천간</span>
                                    </div>
                                    <div className={`flex flex-col items-center justify-center p-2 ${manse.day.color} ring-1 ring-inset ring-zen-gold/20`}>
                                        <span className="text-3xl font-serif font-bold">{manse.day.gan}</span>
                                        <span className="text-[10px] opacity-70 mt-1 font-bold text-zen-wood">나(我)</span>
                                    </div>
                                    <div className={`flex flex-col items-center justify-center p-2 ${manse.month.color}`}>
                                        <span className="text-3xl font-serif font-bold">{manse.month.gan}</span>
                                        <span className="text-[10px] opacity-70 mt-1">천간</span>
                                    </div>
                                    <div className={`flex flex-col items-center justify-center p-2 ${manse.year.color}`}>
                                        <span className="text-3xl font-serif font-bold">{manse.year.gan}</span>
                                        <span className="text-[10px] opacity-70 mt-1">천간</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 divide-x divide-zen-border border-t border-zen-border h-32">
                                    {/* Ji (Lower) */}
                                    <div className={`flex flex-col items-center justify-center p-2 ${manse.time.color}`}>
                                        <span className="text-3xl font-serif font-bold">{manse.time.ji}</span>
                                        <span className="text-[10px] opacity-70 mt-1">{manse.time.label}</span>
                                    </div>
                                    <div className={`flex flex-col items-center justify-center p-2 ${manse.day.color} ring-1 ring-inset ring-zen-gold/20`}>
                                        <span className="text-3xl font-serif font-bold">{manse.day.ji}</span>
                                        <span className="text-[10px] opacity-70 mt-1">{manse.day.label}</span>
                                    </div>
                                    <div className={`flex flex-col items-center justify-center p-2 ${manse.month.color}`}>
                                        <span className="text-3xl font-serif font-bold">{manse.month.ji}</span>
                                        <span className="text-[10px] opacity-70 mt-1">{manse.month.label}</span>
                                    </div>
                                    <div className={`flex flex-col items-center justify-center p-2 ${manse.year.color}`}>
                                        <span className="text-3xl font-serif font-bold">{manse.year.ji}</span>
                                        <span className="text-[10px] opacity-70 mt-1">{manse.year.label}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <div className="bg-zen-bg/30 p-4 text-center border-t border-zen-border">
                                <p className="text-sm text-zen-text leading-relaxed font-serif">
                                    "당신은 <span className="font-bold text-zen-wood">{manse.day.label.split(' ')[0]} {manse.day.ji}({manse.day.label.split(' ')[1]})</span>의 날에 태어났으며,<br />
                                    {manse.month.label.split(' ')[0]} {manse.month.ji}({manse.month.label.split(' ')[1]})의 계절을 품고 있습니다."
                                </p>
                            </div>
                        </Card>
                    ) : (
                        // Case B: Data Missing (Empty State)
                        <Card className="border-dashed border-2 border-zen-border bg-zen-bg/20">
                            <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                                <div className="p-4 rounded-full bg-zen-gold/10 text-zen-gold">
                                    <Calendar className="w-8 h-8" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-serif font-bold text-zen-text text-lg">아직 운명 정보가 없습니다.</h3>
                                    <p className="text-sm text-zen-muted max-w-[200px] mx-auto leading-relaxed">
                                        정확한 사주 분석을 위해 생년월일시 정보를 등록해 주세요.
                                    </p>
                                </div>
                                <Link href="/protected/profile/edit">
                                    <Button className="font-serif bg-zen-wood text-white mt-2">
                                        내 사주 정보 입력하기
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </section>

                {/* 3. Settings & Membership (Accordion for cleaner mobile view) */}
                <section>
                    <h2 className="text-lg font-serif font-bold text-zen-text mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-zen-muted" />
                        계정 관리
                    </h2>
                    <Accordion type="single" collapsible className="w-full bg-white border border-zen-border rounded-sm shadow-sm">
                        <AccordionItem value="membership" className="border-b border-zen-border px-4">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-4 h-4 text-zen-gold" />
                                    <span className="font-serif text-zen-text">멤버십 & 부적</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pt-1 space-y-4">
                                <div className="p-4 bg-zen-bg rounded-sm border border-zen-border flex items-center justify-between">
                                    <span className="text-sm text-zen-muted">보유 부적</span>
                                    <span className="font-bold text-zen-gold text-lg">0장</span>
                                </div>
                                <Link href="/protected/billing">
                                    <Button variant="outline" className="w-full border-zen-gold text-zen-gold hover:bg-zen-gold/5">
                                        충전하러 가기
                                    </Button>
                                </Link>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="profile-edit" className="border-b border-zen-border px-4">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-zen-muted" />
                                    <span className="font-serif text-zen-text">기본 정보 수정</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pt-1">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zen-muted">이름</Label>
                                        <Input defaultValue={user.user_metadata.full_name} disabled className="bg-zen-bg" />
                                    </div>
                                    <Button className="w-full" disabled>수정 불가 (관리자 문의)</Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <Link href="/auth/logout" className="flex items-center justify-between px-4 py-4 text-sm text-red-500 hover:bg-red-50 transition-colors">
                            <span>로그아웃</span>
                            <ChevronRight className="w-4 h-4 opacity-50" />
                        </Link>
                    </Accordion>
                </section>
            </div>
        </div>
    );
}
