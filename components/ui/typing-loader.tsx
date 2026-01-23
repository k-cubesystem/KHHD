"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { COMFORT_MESSAGES, LOADING_STEPS } from "@/lib/constants/messages";

interface TypingLoaderProps {
    className?: string;
    mode?: "analyze" | "page"; // 분석용(단계별) 또는 페이지 로딩용(랜덤 위로)
}

export function TypingLoader({ className, mode = "analyze" }: TypingLoaderProps) {
    const [textIndex, setTextIndex] = useState(0);
    const [displayText, setDisplayText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    // 모드에 따라 메시지 소스 선택
    const messages = mode === "analyze" ? LOADING_STEPS : COMFORT_MESSAGES;

    // 랜덤 시작 (페이지 모드일 경우)
    useEffect(() => {
        if (mode === "page") {
            setTextIndex(Math.floor(Math.random() * messages.length));
        }
    }, [mode, messages.length]);

    useEffect(() => {
        const currentMessage = messages[textIndex % messages.length];
        const typeSpeed = isDeleting ? 30 : 80; // 지울 땐 빠르게, 쓸 땐 사람이 치는 것처럼
        const pauseTime = 2000; // 다 쓰고 나서 2초간 보여줌

        const timer = setTimeout(() => {
            if (!isDeleting && displayText === currentMessage) {
                // 다 썼으면 잠시 대기 후 삭제 모드로
                setTimeout(() => setIsDeleting(true), pauseTime);
                return;
            }

            if (isDeleting && displayText === "") {
                // 다 지웠으면 다음 메시지로 넘어감
                setIsDeleting(false);
                setTextIndex((prev) => prev + 1);
                return;
            }

            const nextText = isDeleting
                ? currentMessage.substring(0, displayText.length - 1)
                : currentMessage.substring(0, displayText.length + 1);

            setDisplayText(nextText);
        }, typeSpeed);

        return () => clearTimeout(timer);
    }, [displayText, isDeleting, messages, textIndex]);

    return (
        <div className={cn("flex flex-col items-center justify-center gap-6 p-8", className)}>
            {/* Orb Animation */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                    rotate: [0, 180, 360],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-zen-gold/30 to-zen-wood/30 blur-md border border-zen-gold/20"
            />

            {/* Typing Text */}
            <div className="h-20 flex items-center justify-center max-w-md text-center">
                <motion.p
                    className="text-lg md:text-xl font-serif font-medium text-zen-text/90 leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {displayText}
                    <span className="animate-pulse ml-1 text-zen-gold">|</span>
                </motion.p>
            </div>

            <p className="text-xs text-zen-muted tracking-widest uppercase mt-4">
                Haehwadang • Destiny Analysis
            </p>
        </div>
    );
}
