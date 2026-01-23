"use client";

import { motion } from "framer-motion";

interface OrbBackgroundProps {
    variant?: "default" | "subtle" | "gold";
    className?: string;
}

export function OrbBackground({ variant = "default", className }: OrbBackgroundProps) {
    const orbConfigs = {
        default: {
            primary: "bg-gold-500/20",
            secondary: "bg-zen-wood/15",
        },
        subtle: {
            primary: "bg-gold-500/10",
            secondary: "bg-zen-wood/8",
        },
        gold: {
            primary: "bg-gold-500/30",
            secondary: "bg-gold-300/20",
        },
    };

    const config = orbConfigs[variant];

    return (
        <div className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none ${className || ""}`}>
            {/* Primary Orb - Gold */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 ${config.primary} blur-[100px] rounded-full`}
            />

            {/* Secondary Orb - Wood */}
            <motion.div
                animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                }}
                className={`absolute bottom-0 right-1/4 w-80 h-80 ${config.secondary} blur-[120px] rounded-full`}
            />

            {/* Tertiary Orb - Accent (only for gold variant) */}
            {variant === "gold" && (
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.15, 0.25, 0.15],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 4,
                    }}
                    className="absolute top-1/2 left-1/4 w-64 h-64 bg-gold-400/15 blur-[80px] rounded-full"
                />
            )}
        </div>
    );
}
