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
        <Card className="p-6 md:p-8 bg-surface/30 backdrop-blur-sm border-primary/20 relative overflow-hidden shadow-lg">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-ink-light flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <span className="text-primary-dim">{selectedProfile?.name}</span>님의 오늘의 운세
                        </h2>
                        <p className="text-sm text-ink/60 mt-1">
                            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                            <SelectTrigger className="w-[140px] bg-surface/50 border-primary/20 text-ink-light">
                                <Users className="w-4 h-4 mr-2 text-ink/60" />
                                <SelectValue placeholder="대상 선택" />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-primary/20 text-ink-light">
                                {profiles.map(profile => (
                                    <SelectItem key={profile.id} value={profile.id} className="focus:bg-primary/20 focus:text-ink-light">
                                        {profile.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button variant="ghost" size="icon" onClick={() => loadFortune(true)} className="text-ink/60 hover:text-ink-light hover:bg-white/10" title="새로고침(다시 생성)">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[200px] border border-primary/20 rounded-xl bg-surface/30">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-ink/60 font-serif animate-pulse">
                            {selectedProfile?.name}님의 기운을 읽고 있습니다...
                        </p>
                    </div>
                ) : missingInfo ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[200px] border border-primary/20 rounded-xl bg-surface/30">
                        <Sparkles className="w-12 h-12 text-ink/40" />
                        <div className="text-center space-y-2">
                            <p className="text-ink-light font-serif text-lg">
                                사주 정보를 찾을 수 없습니다
                            </p>
                            <p className="text-ink/60 text-sm">
                                정확한 운세 분석을 위해 생년월일시 정보가 필요합니다.
                            </p>
                        </div>
                        <Button asChild className="bg-primary-dark text-white hover:bg-primary-dark/90">
                            <Link href="/protected/family">
                                정보 등록하러 가기 <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-surface/40 p-6 rounded-xl border border-primary/10 leading-relaxed text-ink-light/90 font-serif text-lg whitespace-pre-wrap shadow-inner"
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
                                ? "bg-primary text-background hover:bg-primary/90"
                                : "border-primary/20 text-ink/60 hover:bg-surface/50 hover:text-ink-light"
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
                        className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary-dim"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                        카카오톡으로 공유
                    </Button>
                </div>
            </div>
        </Card>
    );
}
