"use client";

import { useState } from "react";
import { Heart, Share2, Copy, Check, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createCompatibilityInvite } from "@/app/actions/compatibility-actions";
import { toast } from "sonner";

export default function CompatibilityInvitePage() {
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCreateInvite = async () => {
        setLoading(true);
        try {
            const result = await createCompatibilityInvite();

            if (result.success && result.inviteCode) {
                setInviteCode(result.inviteCode);
                toast.success("초대 링크가 생성되었습니다!");
            } else {
                toast.error(result.error || "초대 링크 생성 실패");
            }
        } catch (error) {
            toast.error("오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const inviteUrl = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : "";

    const handleCopy = () => {
        if (inviteUrl) {
            navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            toast.success("링크가 복사되었습니다!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleKakaoShare = () => {
        // Kakao Share implementation
        toast.info("카카오톡 공유 기능은 준비 중입니다.");
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 py-12">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span className="text-xs font-bold text-pink-500 uppercase tracking-wider">Compatibility</span>
                </div>
                <h1 className="text-4xl font-black">
                    <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                        궁합 초대하기
                    </span>
                </h1>
                <p className="text-muted-foreground">
                    친구나 연인에게 링크를 보내 즉시 궁합을 확인하세요
                </p>
            </div>

            {/* Main Card */}
            <Card className="p-8 bg-gradient-to-br from-pink-500/5 to-purple-500/5 border-pink-500/20">
                {!inviteCode ? (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 mx-auto rounded-full bg-pink-500/10 flex items-center justify-center">
                            <Heart className="w-10 h-10 text-pink-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">우리 무슨 사이야?</h2>
                            <p className="text-muted-foreground">
                                나와 상대방의 사주 궁합을 AI가 분석해드립니다.<br />
                                초대 링크를 생성하고 상대방에게 공유하세요.
                            </p>
                        </div>
                        <Button
                            onClick={handleCreateInvite}
                            disabled={loading}
                            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 font-bold px-8 py-6 text-lg"
                        >
                            {loading ? (
                                "생성 중..."
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    초대 링크 만들기
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                                <Check className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold">초대 링크가 생성되었습니다!</h2>
                            <p className="text-sm text-muted-foreground">
                                아래 링크를 복사하여 상대방에게 전송하세요
                            </p>
                        </div>

                        {/* Link Display */}
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={inviteUrl}
                                    readOnly
                                    className="flex-1 bg-transparent border-none outline-none text-sm"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCopy}
                                    className="border-white/10"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 mr-1" />
                                            복사됨
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4 mr-1" />
                                            복사
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Share Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                onClick={handleKakaoShare}
                                className="bg-[#FEE500] text-black hover:bg-[#FEE500]/90 font-bold"
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                카카오톡 공유
                            </Button>
                            <Button
                                onClick={handleCopy}
                                variant="outline"
                                className="border-white/10"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                링크 복사
                            </Button>
                        </div>

                        <Button
                            variant="ghost"
                            onClick={() => setInviteCode(null)}
                            className="w-full"
                        >
                            새 링크 만들기
                        </Button>
                    </div>
                )}
            </Card>

            {/* How it Works */}
            <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-bold mb-4">이용 방법</h3>
                <div className="space-y-3">
                    {[
                        "1. '초대 링크 만들기' 버튼을 클릭합니다",
                        "2. 생성된 링크를 복사하여 상대방에게 전송합니다",
                        "3. 상대방이 링크를 통해 생년월일을 입력합니다",
                        "4. 즉시 두 사람의 궁합 점수가 공개됩니다!",
                    ].map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {i + 1}
                            </div>
                            <p className="text-sm text-muted-foreground">{step}</p>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
