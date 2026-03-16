"use client";

import { useState, useEffect } from "react";

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
        const typeSpeed = isDeleting ? 40 : 100;
        const pauseTime = 3000;

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
            <span
                className={`${className} anim-fade-in-up`}
                style={{ animation: 'fade-in-up 0.5s ease-out both', '--fade-y': '0px' } as React.CSSProperties}
            >
                {displayText}
                <span className="animate-pulse ml-1 inline-block w-[2px] h-[1em] bg-zen-gold align-middle" />
            </span>
        </div>
    );
}
