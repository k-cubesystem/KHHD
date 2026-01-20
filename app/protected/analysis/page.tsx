import { getFamilyMembers } from "@/app/actions/family-actions";
import { startFateAnalysis } from "@/app/actions/analysis-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";
import { Camera, MapPin, Sparkles, UserCircle } from "lucide-react";

export default function AnalysisPage() {
    return (
        <div className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-8 px-4">
            <Suspense fallback={<div className="text-center py-20 animate-pulse">운명 분석실을 준비 중입니다...</div>}>
                <AnalysisContent />
            </Suspense>
        </div>
    );
}

async function AnalysisContent() {
    const members = await getFamilyMembers();
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    return (
        <>
            <section className="space-y-4 text-center">
                <Badge variant="outline" className="text-primary border-primary px-4 py-1">
                    Premium Fortune Engineering
                </Badge>
                <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/40 pb-2">
                    운명 분석실
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    천(사주), 지(풍수), 인(관상/손금)의 고차원적 결합 분석을 시작합니다.
                    해화당 마스터와 KAIST 알고리즘이 당신의 삶을 설계해 드립니다.
                </p>
            </section>

            <form action={startFateAnalysis} className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* Step 1: 대상 선택 */}
                <Card className="glass border-none shadow-2xl overflow-hidden">
                    <CardHeader className="bg-primary/5">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <UserCircle className="w-6 h-6 text-primary" />
                            1. 분석 대상 선택
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="memberId">가족 또는 지인 선택</Label>
                            <select
                                id="memberId"
                                name="memberId"
                                required
                                className="flex h-12 w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">대상을 선택해 주세요</option>
                                {members.map((m: any) => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.relationship})</option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 2: 풍수 지리 */}
                <Card className="glass border-none shadow-2xl overflow-hidden">
                    <CardHeader className="bg-primary/5">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <MapPin className="w-6 h-6 text-primary" />
                            2. 거주지 풍수 분석
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="homeAddress">현재 거주지 주소</Label>
                            <Input
                                id="homeAddress"
                                name="homeAddress"
                                placeholder="지번 또는 도로명 주소 입력"
                                className="h-12 bg-background/50 rounded-xl"
                            />
                            <p className="text-[10px] text-muted-foreground mt-2">
                                * 상세 주소는 환경과 지기의 흐름을 파악하는 데 활용됩니다.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 3: 관상 및 손금 */}
                <Card className="md:col-span-2 glass border-none shadow-2xl overflow-hidden">
                    <CardHeader className="bg-primary/5">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Camera className="w-6 h-6 text-primary" />
                            3. 관상 및 손금 이미지 업로드 (멀티모달)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="p-8 border-2 border-dashed border-primary/20 rounded-3xl flex flex-col items-center gap-4 hover:border-primary/40 transition-all bg-background/30">
                                <Label htmlFor="faceImage" className="cursor-pointer text-center group">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Camera className="w-8 h-8 text-primary" />
                                    </div>
                                    <span className="font-bold text-lg">얼굴 정면 사진 업로드</span>
                                    <p className="text-xs text-muted-foreground mt-2">이마부터 턱끝까지 선명한 사진</p>
                                </Label>
                                <Input id="faceImage" name="faceImage" type="file" accept="image/*" className="hidden" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-8 border-2 border-dashed border-primary/20 rounded-3xl flex flex-col items-center gap-4 hover:border-primary/40 transition-all bg-background/30">
                                <Label htmlFor="handImage" className="cursor-pointer text-center group">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Sparkles className="w-8 h-8 text-primary" />
                                    </div>
                                    <span className="font-bold text-lg">주요 손금 사진 업로드</span>
                                    <p className="text-xs text-muted-foreground mt-2">손바닥 중앙이 잘 보이도록 촬영</p>
                                </Label>
                                <Input id="handImage" name="handImage" type="file" accept="image/*" className="hidden" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-2 flex justify-center py-8">
                    <Button
                        type="submit"
                        disabled={isDemoMode}
                        className="h-16 px-16 rounded-full text-xl font-bold bg-gradient-to-r from-primary to-primary/60 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,215,0,0.2)]"
                    >
                        {isDemoMode ? "데모 모드에선 분석 불가" : "운명 공학 스뮬레이션 시작"}
                    </Button>
                </div>
            </form>
        </>
    );
}
