'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const REVIEWS = [
    { id: 1, text: "아이 사주를 알고 나니 성향을 이해하게 되어서 다투는 일이 줄었어요.", author: "김**님 (자녀)" },
    { id: 2, text: "남편과 맞지 않는 이유를 알게 되어 서로 배려하게 되었습니다.", author: "이**님 (배우자)" },
    { id: 3, text: "가족 모두의 건강운을 미리 챙길 수 있어서 마음이 든든해요.", author: "박**님 (부모님)" },
    { id: 4, text: "이사 방향 조언 덕분에 좋은 집으로 이사했습니다. 감사합니다.", author: "최**님 (가족)" },
    { id: 5, text: "중요한 시험 날짜를 길일로 잡았는데 합격했어요!", author: "정**님 (자녀)" },
];

export function FamilyReviewSlide() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % REVIEWS.length);
        }, 5000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="w-full">
            <div className="flex items-center justify-center gap-2 mb-6">
                <Quote className="w-4 h-4 text-[#D4AF37] rotate-180" />
                <span className="text-sm font-serif font-bold text-[#D4AF37]">가족의 운명이 바뀐 이야기</span>
            </div>

            <div className="relative h-[200px] w-full max-w-sm mx-auto overflow-hidden">
                {/* Gradient Masks */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0A0A0A] to-transparent z-20 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0A0A0A] to-transparent z-20 pointer-events-none" />

                <div className="absolute inset-0 flex items-center justify-center">
                    {REVIEWS.map((review, i) => {
                        // Calculate circular offset
                        let offset = (i - currentIndex);
                        const len = REVIEWS.length;

                        // Handle wrap-around for smooth infinite scroll
                        // If offset is too large positive (e.g. 4), substract len to make it small negative (-1)
                        if (offset > len / 2) offset -= len;
                        else if (offset < -len / 2) offset += len;

                        // Only render if visible (prev, curr, next)
                        const isVisible = Math.abs(offset) <= 2;
                        if (!isVisible) return null;

                        const isActive = offset === 0;

                        return (
                            <motion.div
                                key={review.id}
                                className="absolute w-full px-4"
                                initial={false}
                                animate={{
                                    y: offset * 90, // 90px spacing
                                    scale: isActive ? 1 : 0.9,
                                    opacity: isActive ? 1 : (Math.abs(offset) === 1 ? 0.4 : 0),
                                    zIndex: isActive ? 10 : 0,
                                    filter: isActive ? 'blur(0px)' : 'blur(2px)',
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 100,
                                    damping: 20,
                                    mass: 1
                                }}
                                style={{
                                    transformOrigin: "center center"
                                }}
                            >
                                <Card className={cn(
                                    "p-5 rounded-2xl backdrop-blur-md transition-colors duration-500",
                                    isActive
                                        ? "bg-surface/50 border-primary/30 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                                        : "bg-surface/10 border-white/5 shadow-none"
                                )}>
                                    <p className={cn(
                                        "leading-relaxed transition-all duration-300",
                                        isActive ? "text-sm text-ink-light" : "text-xs text-ink-light/40"
                                    )}>
                                        "{review.text}"
                                    </p>
                                    <p className={cn(
                                        "mt-2 text-right font-medium transition-all duration-300",
                                        isActive ? "text-xs text-primary" : "text-[10px] text-primary/30"
                                    )}>
                                        — {review.author}
                                    </p>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
