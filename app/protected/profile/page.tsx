import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, CreditCard, Sparkles, User, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function ProfilePage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    const initial = user.email?.charAt(0).toUpperCase() || "U";

    return (
        <div className="flex flex-col gap-8 py-10 px-6 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="w-24 h-24 border-4 border-[#D4AF37]/20 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                    <AvatarImage src={user.user_metadata.avatar_url} />
                    <AvatarFallback className="text-3xl font-black bg-[#D4AF37]/10 text-[#D4AF37]">{initial}</AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left space-y-2">
                    <h1 className="text-3xl font-black">{user.user_metadata.full_name || "운명공학 회원님"}</h1>
                    <p className="text-muted-foreground">{user.email}</p>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                        <Badge variant="outline" className="border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5">Free Plan</Badge>
                        <Badge variant="secondary" className="text-xs">가입일: 2026.01.20</Badge>
                    </div>
                </div>
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="account" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[#0A0A0A] border border-white/10 p-1 rounded-xl h-12">
                    <TabsTrigger value="account" className="rounded-lg data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black font-bold transition-all">
                        <User className="w-4 h-4 mr-2" />
                        내 정보
                    </TabsTrigger>
                    <TabsTrigger value="subscription" className="rounded-lg data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black font-bold transition-all">
                        <CreditCard className="w-4 h-4 mr-2" />
                        멤버십 구독
                    </TabsTrigger>
                </TabsList>

                {/* Account Tab */}
                <TabsContent value="account" className="mt-6 space-y-6">
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle>기본 정보</CardTitle>
                            <CardDescription>
                                본인 확인 및 서비스 이용을 위한 기본 정보입니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">이메일</Label>
                                <Input id="email" defaultValue={user.email} disabled className="bg-black/50 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">이름</Label>
                                <Input id="name" defaultValue={user.user_metadata.full_name} className="bg-black/50 border-white/10 focus:border-[#D4AF37]/50" />
                            </div>
                            <div className="pt-4 flex justify-end">
                                <Button className="bg-white text-black hover:bg-white/90">변경사항 저장</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Subscription Tab */}
                <TabsContent value="subscription" className="mt-6 space-y-6">

                    {/* Current Plan */}
                    <Card className="relative overflow-hidden border-[#D4AF37]/20 bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A]">
                        <div className="absolute top-0 right-0 p-3">
                            <Sparkles className="w-16 h-16 text-[#D4AF37]/10" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-[#D4AF37]">Premium Access Pass</CardTitle>
                            <CardDescription>더 깊은 운명 분석을 위한 프리미엄 혜택</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="p-3 rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold">심층 분석 리포트</p>
                                        <p className="text-xs text-muted-foreground">오행/풍수/관상 종합 분석</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="p-3 rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
                                        <History className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold">무제한 기록 보관</p>
                                        <p className="text-xs text-muted-foreground">언제든지 다시 열어보는 운명</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-6 text-center space-y-4">
                                <p className="font-bold text-lg text-white">현재 무료 체험 중입니다.</p>
                                <Button className="bg-[#D4AF37] text-black hover:bg-[#F4E4BA] font-bold w-full md:w-auto px-8">
                                    프리미엄 멤버십 업그레이드
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 opacity-50">
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground">결제 내역</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center py-8 text-muted-foreground/50 text-sm">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                아직 결제 내역이 없습니다.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function History(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
            <path d="M3 3v9h9" />
            <path d="M12 7v5l4 2" />
        </svg>
    )
}
