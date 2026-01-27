"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, MessageCircle, Share2, Sparkles, RefreshCw, Users, Bell, ArrowRight } from "lucide-react";
import { generateDailyFortune } from "@/app/actions/daily-fortune";
import { sendKakaoNotification } from "@/app/actions/notification";
import { getFamilyMembers } from "@/app/actions/family-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";

interface DailyFortuneViewProps {
    userId: string;
    userName: string;
}

interface ProfileOption {
    id: string;
    name: string;
    type: 'USER' | 'FAMILY';
}

export function DailyFortuneView({ userId, userName }: DailyFortuneViewProps) {
    const [fortune, setFortune] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [subscribing, setSubscribing] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    const [profiles, setProfiles] = useState<ProfileOption[]>([
        { id: userId, name: userName, type: 'USER' }
    ]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>(userId);
    const [missingInfo, setMissingInfo] = useState(false);

    useEffect(() => {
        loadProfiles();
    }, []);

    useEffect(() => {
        if (selectedProfileId) {
            loadFortune();
        }
    }, [selectedProfileId]);

    const loadProfiles = async () => {
        try {
            const family = await getFamilyMembers();
            const familyOptions = family.map((f: any) => ({
                id: f.id,
                name: f.name,
                type: 'FAMILY' as const
            }));
            setProfiles([
                { id: userId, name: userName, type: 'USER' },
                ...familyOptions
            ]);
        } catch (e) {
            console.error("Failed to load family:", e);
        }
    };

    const loadFortune = async (force: boolean = false) => {
        setLoading(true);
        setMissingInfo(false);
        setFortune(null);

        try {
            const selected = profiles.find(p => p.id === selectedProfileId) || profiles[0];
            const result = await generateDailyFortune(userId, selected.id, selected.type, undefined, force);

            if (result.success && result.content) {
                setFortune(result.content);
            } else {
                if (result.error && (result.error.includes("생년월일") || result.error.includes("가족의 생년월일"))) {
                    setMissingInfo(true);
                } else {
                    toast.error(result.error || "운세를 불러오지 못했습니다.");
                }
            }
        } catch (e) {
            console.error(e);
            toast.error("오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSendKakao = async () => {
        if (!fortune) return;
        setSending(true);
        try {
            const result = await sendKakaoNotification(userId, "DAILY_FORTUNE_V1", {
                content: fortune.substring(0, 50) + "...",
                link: window.location.href
            });

            if (result.success) {
                toast.success("카카오톡으로 발송되었습니다.");
            } else {
                if (result.mocked) {
                    toast.info("테스트 모드: 발송 로그가 기록되었습니다.");
                } else {
                    toast.error("발송 실패: " + result.error);
                }
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSending(false);
        }
    };

    const handleSubscribe = async () => {
        setSubscribing(true);
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsSubscribed(!isSubscribed);
        toast.success(isSubscribed ? "단톡 알림이 해제되었습니다." : "매일 아침 8시에 운세를 보내드립니다.");
        setSubscribing(false);
    };

    const selectedProfile = profiles.find(p => p.id === selectedProfileId);

    return (
        <Card className="p-6 md:p-8 bg-white/5 border-zen-gold/20 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-zen-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-zen-text flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-zen-gold" />
                            <span className="text-zen-wood">{selectedProfile?.name}</span>님의 오늘의 운세
                        </h2>
                        <p className="text-sm text-zen-muted mt-1">
                            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                            <SelectTrigger className="w-[140px] bg-white/50 border-zen-border">
                                <Users className="w-4 h-4 mr-2 text-zen-muted" />
                                <SelectValue placeholder="대상 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {profiles.map(profile => (
                                    <SelectItem key={profile.id} value={profile.id}>
                                        {profile.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button variant="ghost" size="icon" onClick={() => loadFortune(true)} className="text-zen-muted hover:text-zen-text" title="새로고침(다시 생성)">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[200px] border border-zen-border/30 rounded-xl bg-white/5">
                        <Loader2 className="w-8 h-8 text-zen-gold animate-spin" />
                        <p className="text-zen-muted font-serif animate-pulse">
                            {selectedProfile?.name}님의 기운을 읽고 있습니다...
                        </p>
                    </div>
                ) : missingInfo ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[200px] border border-zen-border/30 rounded-xl bg-white/5">
                        <Sparkles className="w-12 h-12 text-zen-muted/50" />
                        <div className="text-center space-y-2">
                            <p className="text-zen-text font-serif text-lg">
                                사주 정보를 찾을 수 없습니다
                            </p>
                            <p className="text-zen-muted text-sm">
                                정확한 운세 분석을 위해 생년월일시 정보가 필요합니다.
                            </p>
                        </div>
                        <Button asChild className="bg-zen-wood text-white hover:bg-zen-wood/90">
                            <Link href="/protected/family">
                                정보 등록하러 가기 <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/5 p-6 rounded-xl border border-white/30 leading-relaxed text-zen-text/90 font-serif text-lg whitespace-pre-wrap shadow-inner"
                    >
                        {fortune}
                    </motion.div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4 border-t border-white/10">
                    <Button
                        variant={isSubscribed ? "secondary" : "outline"}
                        onClick={handleSubscribe}
                        disabled={subscribing}
                        className={`
                            ${isSubscribed
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                : "border-zen-border text-zen-muted hover:bg-zen-bg hover:text-zen-text"
                            }
                        `}
                    >
                        {subscribing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className={`w-4 h-4 mr-2 ${isSubscribed ? "fill-current" : ""}`} />}
                        {isSubscribed ? "매일 아침 알림 받는 중" : "매일 아침 알림 받기"}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleSendKakao}
                        disabled={sending || !fortune}
                        className="border-yellow-400/50 text-yellow-500 hover:bg-yellow-400/10 hover:text-yellow-400"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                        카카오톡으로 공유
                    </Button>
                </div>
            </div>
        </Card>
    );
}
