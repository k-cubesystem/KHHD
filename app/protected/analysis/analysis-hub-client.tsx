"use client";

import { motion } from "framer-motion";
import { CloudMoon, Sparkles, ScrollText, Coins, Eye } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { SajuProfileSelector } from "@/components/analysis/saju-profile-selector";
import { StoryCard as StoryCardComponent } from "@/components/analysis/story-card";
import { LucideIcon } from "lucide-react";

interface AnalysisHubClientProps {
    isGuest: boolean;
    userName?: string;
}

interface StoryCardData {
    id: string;
    title: string;
    story: string;
    tagline: string;
    icon: LucideIcon;
    href: string;
    requiresSelector: boolean;
    visual?: {
        gradient?: string;
        image?: string;
        color?: string;
    };
}

export function AnalysisHubClient({ isGuest, userName }: AnalysisHubClientProps) {
    const router = useRouter();
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [targetRoute, setTargetRoute] = useState("");

    const storyCards: StoryCardData[] = [
        {
            id: "cheonjiin",
            title: "천지인(天地人) 원명 분석",
            story: "나를 아는 것이 모든 전략의 시작입니다. 당신이 타고난 그릇의 크기와 모양, 그리고 채워야 할 기운을 확인하세요.",
            tagline: "내 운명의 설계도 확인하기",
            icon: CloudMoon,
            href: "/protected/analysis/cheonjiin",
            requiresSelector: true,
            visual: {
                gradient: "linear-gradient(135deg, rgba(74, 124, 89, 0.1) 0%, rgba(10, 10, 10, 0) 100%)",
            },
        },
        {
            id: "today",
            title: "오늘의 운세",
            story: "매일 아침, 하루의 기상을 미리 확인하세요. 때로는 멈추는 것이 나아가는 것보다 빠를 때가 있습니다.",
            tagline: "오늘의 기상도 보기",
            icon: ScrollText,
            href: "/protected/analysis/today",
            requiresSelector: true,
            visual: {
                gradient: "linear-gradient(135deg, rgba(229, 227, 223, 0.1) 0%, rgba(10, 10, 10, 0) 100%)",
            },
        },
        {
            id: "wealth",
            title: "재물운 심층 분석",
            story: "재물은 쫓는 것이 아니라, 길목을 지키는 것입니다. 당신의 인생에서 재물이 모이는 시기와 방향을 알려드립니다.",
            tagline: "내 재물운의 흐름 읽기",
            icon: Coins,
            href: "/protected/analysis/wealth",
            requiresSelector: true,
            visual: {
                gradient: "linear-gradient(135deg, rgba(197, 179, 88, 0.1) 0%, rgba(10, 10, 10, 0) 100%)",
            },
        },
        {
            id: "new-year",
            title: "2026 병오년 미리보기",
            story: "곧 다가올 붉은 말의 해. 뜨거운 열기를 당신의 동력으로 바꿀 준비가 되셨나요? 2026년의 기회를 선점하세요.",
            tagline: "2026년 신년운세 미리보기",
            icon: Sparkles,
            href: "/protected/analysis/new-year",
            requiresSelector: true,
            visual: {
                gradient: "linear-gradient(135deg, rgba(192, 112, 85, 0.1) 0%, rgba(10, 10, 10, 0) 100%)",
            },
        },
        {
            id: "vision",
            title: "AI 영안실 (관상/손금)",
            story: "당신의 얼굴과 손에는 살아온 역사와 살아갈 미래가 새겨져 있습니다. AI가 그 신비로운 암호를 해독해 드립니다.",
            tagline: "관상/손금/풍수 분석하기",
            icon: Eye,
            href: "/protected/analysis/vision",
            requiresSelector: false,
            visual: {
                gradient: "linear-gradient(135deg, rgba(80, 50, 120, 0.15) 0%, rgba(10, 10, 10, 0) 100%)",
            },
        },
    ];

    const handleCardClick = (card: StoryCardData, e: React.MouseEvent) => {
        e.preventDefault();

        // Guest redirect to sign-up
        if (isGuest) {
            router.push("/auth/sign-up");
            return;
        }

        // Open selector for analysis pages
        if (card.requiresSelector) {
            setTargetRoute(card.href);
            setSelectorOpen(true);
        } else {
            router.push(card.href);
        }
    };

    return (
        <div className="relative min-h-screen">
            {/* Background Layer */}
            <div className="fixed inset-0 -z-10">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a0a] via-[#0a0a0a] to-[#1a1410]" />

                {/* Optional: Background Image with Overlay */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: 'url(/landing-section-2.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                    }}
                />

                {/* Noise Texture */}
                <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                    <div
                        className="w-full h-full"
                        style={{
                            backgroundImage:
                                'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
                            backgroundRepeat: "repeat",
                        }}
                    />
                </div>

                {/* Radial Gradient Overlay for Focus */}
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/50 to-background" />
            </div>

            <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="relative flex flex-col gap-8 w-full max-w-[480px] mx-auto py-12 px-6 pb-32"
            >
                {/* Header - The Greeting */}
                <motion.section variants={fadeInUp} className="space-y-6 text-center">
                    <div className="flex justify-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-primary/20 backdrop-blur-sm mb-2">
                            <CloudMoon className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-bold text-primary tracking-[0.2em] font-sans uppercase">
                                The Destiny Library
                            </span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-3xl font-serif font-light tracking-tight text-ink-light leading-tight">
                            안녕하세요{userName ? `, ${userName}` : ''}님.<br />
                            <span className="font-bold">오늘은 어떤 해답을 찾고 계신가요?</span>
                        </h1>
                        <p className="text-base text-ink-light/60 font-light leading-relaxed max-w-2xl mx-auto">
                            당신을 위한 <span className="text-primary font-serif">4권의 운명서</span>가 준비되어 있습니다.
                        </p>
                    </div>
                </motion.section>

                {/* Story Cards - Vertical Stream */}
                <motion.div
                    variants={fadeInUp}
                    className="grid grid-cols-1 gap-6"
                >
                    {storyCards.map((card, index) => (
                        <motion.div
                            key={card.id}
                            variants={fadeInUp}
                            transition={{ delay: index * 0.1 }}
                        >
                            <StoryCardComponent
                                title={card.title}
                                story={card.story}
                                tagline={card.tagline}
                                icon={card.icon}
                                onClick={(e) => handleCardClick(card, e)}
                                visual={card.visual}
                                isGuest={isGuest}
                            />
                        </motion.div>
                    ))}
                </motion.div>

                {/* Footer */}
                <motion.section
                    variants={fadeInUp}
                    className="text-center space-y-4 opacity-50 font-serif italic text-sm text-ink-light/40 mt-8"
                >
                    <p>※ 모든 분석은 명리학적 전통을 존중하며 현대적 해석을 더합니다.</p>
                    <div className="flex items-center justify-center gap-4 uppercase tracking-[0.2em] font-sans font-bold text-[10px] not-italic">
                        <span>Authentic</span>
                        <span className="w-1 h-1 bg-primary" />
                        <span>Insightful</span>
                        <span className="w-1 h-1 bg-primary" />
                        <span>Haehwadang Master Identity</span>
                    </div>
                </motion.section>

                {/* Profile Selector Modal */}
                <SajuProfileSelector
                    isOpen={selectorOpen}
                    onClose={() => setSelectorOpen(false)}
                    targetRoute={targetRoute}
                />
            </motion.div>
        </div>
    );
}
