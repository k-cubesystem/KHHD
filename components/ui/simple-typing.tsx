"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const DEFAULT_MESSAGES = [
    "당신의 가장 빛나는 계절을 찾습니다.",
    "운명의 결을 읽어내는 시간.",
    "오직 당신만을 위한 깊은 해답.",
    "복잡한 세상 속, 흔들리지 않는 지혜."
];

export function SimpleTyping({
    messages = DEFAULT_MESSAGES,
    className = "text-2xl font-serif text-zen-text"
}: {
    messages?: string[],
    className?: string
}) {
    const [textIndex, setTextIndex] = useState(0);
    const [displayText, setDisplayText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentMessage = messages[textIndex % messages.length];
        const typeSpeed = isDeleting ? 40 : 100; // 느리고 우아하게
        const pauseTime = 3000; // 다 쓰고 나서 3초간 머무름 (집중 유도)

        const timer = setTimeout(() => {
            if (!isDeleting && displayText === currentMessage) {
                setTimeout(() => setIsDeleting(true), pauseTime);
                return;
            }

            if (isDeleting && displayText === "") {
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
        <div className="flex h-20 items-center justify-center">
            <motion.span
                className={className}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {displayText}
                <span className="animate-pulse ml-1 inline-block w-[2px] h-[1em] bg-zen-gold align-middle" />
            </motion.span>
        </div>
    );
}
