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

import { calculateManse, calculateDaewoon } from "@/lib/saju/manse";
import { PremiumManseCard } from "@/components/saju/premium-manse-card";
import { FiveElementsChart } from "@/components/saju/five-elements-chart";
import { DaewoonTimeline } from "@/components/saju/daewoon-timeline";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";

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

    // Fetch Profile Data (Basic)
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Fetch Saju Data from family_members (relationship = '본인')
    const { data: mySaju } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('relationship', '본인')
        .maybeSingle();

    const initial = user.email?.charAt(0).toUpperCase() || "U";
    const avatarUrl = user.user_metadata.avatar_url;

    // Check if user has entered saju info
    const hasSajuInfo = mySaju?.birth_date && mySaju?.birth_time;

    // Calculate Manse if info exists
    const manse = hasSajuInfo ? calculateManse(mySaju.birth_date, mySaju.birth_time) : null;

    // Calculate Daewoon (대운) if info exists
    let daewoon = null;
    if (hasSajuInfo && mySaju.birth_date && mySaju.birth_time && mySaju.gender) {
        const birthYear = parseInt(mySaju.birth_date.split('-')[0]);
        const currentYear = new Date().getFullYear();
        const currentAge = currentYear - birthYear;
        daewoon = calculateDaewoon(
            mySaju.birth_date,
            mySaju.birth_time,
            mySaju.gender as 'male' | 'female',
            currentAge
        );
    }

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
                                {mySaju?.name || profile?.name || user.user_metadata.full_name || "익명의 인연"}
                            </h1>
                            <Badge variant="secondary" className="bg-zen-gold/10 text-zen-gold border-zen-gold/20 text-[10px] px-1.5 py-0">MEMBER</Badge>
                        </div>
                        <p className="text-sm text-zen-muted font-mono">{user.email}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

                {/* Unified Accordion: All Profile Sections */}
                <Accordion type="single" collapsible className="w-full bg-white border border-zen-border rounded-sm shadow-sm">

                    {/* 1. Saju Manse */}
                    <AccordionItem value="saju-info" className="border-b border-zen-border px-4">
                        <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-zen-gold" />
                                <span className="font-serif text-zen-text text-lg">나의 사주 원국 (四柱命式)</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 pt-2">
                            {hasSajuInfo && manse ? (
                                <div className="space-y-6">
                                    <PremiumManseCard manse={manse} />
                                    <FiveElementsChart manse={manse} />
                                    {daewoon && <DaewoonTimeline periods={daewoon} />}
                                </div>
                            ) : (
                                <Card className="border-dashed border-2 border-zen-border bg-zen-bg/20">
                                    <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                                        <div className="p-4 rounded-full bg-zen-gold/10 text-zen-gold">
                                            <Calendar className="w-8 h-8" />
                                        </div>
                                        <div className="text-center space-y-1">
                                            <h3 className="font-serif font-bold text-zen-text text-lg">아직 운명 정보가 없습니다.</h3>
                                            <p className="text-sm text-zen-muted max-w-[200px] mx-auto leading-relaxed">
                                                아래 '기본 정보 수정'에서 생년월일시를 입력해주세요.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </AccordionContent>
                    </AccordionItem>

                    {/* 2. Membership & Talisman */}
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

                    {/* 3. Profile Edit Form */}
                    <AccordionItem value="profile-edit" className="border-b border-zen-border px-4">
                        <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-3">
                                <User className="w-4 h-4 text-zen-muted" />
                                <span className="font-serif text-zen-text">기본 정보 수정</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 pt-1">
                            <ProfileEditForm
                                userId={user.id}
                                initialData={mySaju}
                                profileData={profile}
                            />
                        </AccordionContent>
                    </AccordionItem>

                    {/* Logout Link */}
                    <div className="px-4 py-4">
                        <Link href="/auth/logout" className="flex items-center justify-between text-sm text-red-500 hover:text-red-700 transition-colors">
                            <span>로그아웃</span>
                            <ChevronRight className="w-4 h-4 opacity-50" />
                        </Link>
                    </div>
                </Accordion>
            </div>
        </div>
    );
}
