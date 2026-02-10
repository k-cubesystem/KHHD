"use client";

import { motion } from "framer-motion";
import { User, Hand, Compass, Sparkles } from "lucide-react";

export type AnimationType = "faceScanning" | "palmReading" | "qiFlow" | "default";

interface AnalyzingAnimationProps {
    type: AnimationType;
    message?: string;
}

export function AnalyzingAnimation({ type, message }: AnalyzingAnimationProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-6">
            {/* Face Scanning Animation */}
            {type === "faceScanning" && (
                <motion.div className="relative w-64 h-64">
                    {/* Outer orbital ring */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-2 border-[#D4AF37]/30 rounded-full"
                    />

                    {/* Inner orbital ring (opposite direction) */}
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-4 border-2 border-[#D4AF37]/20 rounded-full"
                    />

                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <User className="w-20 h-20 text-[#D4AF37]" />
                        </motion.div>
                    </div>

                    {/* Scanning line */}
                    <motion.div
                        animate={{ y: [0, 256, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50"
                    />
                </motion.div>
            )}

            {/* Palm Reading Animation */}
            {type === "palmReading" && (
                <motion.div className="relative w-64 h-64">
                    {/* Pulsing circles */}
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{
                                scale: [0, 1.5, 2],
                                opacity: [1, 0.5, 0],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.6,
                            }}
                            className="absolute inset-0 border-2 border-[#D4AF37] rounded-full"
                        />
                    ))}

                    {/* Center hand icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{
                                rotateY: [0, 180, 360],
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        >
                            <Hand className="w-20 h-20 text-[#D4AF37]" />
                        </motion.div>
                    </div>
                </motion.div>
            )}

            {/* Qi Flow Animation (Feng Shui) */}
            {type === "qiFlow" && (
                <motion.div className="w-80 space-y-6">
                    {/* Flowing particles container */}
                    <div className="relative h-32 overflow-hidden rounded-lg bg-gradient-to-r from-[#D4AF37]/5 via-[#D4AF37]/10 to-[#D4AF37]/5">
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-3 h-3 bg-[#D4AF37] rounded-full shadow-lg shadow-[#D4AF37]/50"
                                initial={{ x: -20, y: Math.random() * 100 }}
                                animate={{
                                    x: [0, 320, 340],
                                    y: [
                                        Math.random() * 100,
                                        Math.random() * 100,
                                        Math.random() * 100,
                                    ],
                                    opacity: [0, 1, 1, 0],
                                    scale: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 3 + i * 0.3,
                                    repeat: Infinity,
                                    delay: i * 0.3,
                                    ease: "easeInOut",
                                }}
                            />
                        ))}

                        {/* Center compass icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            >
                                <Compass className="w-12 h-12 text-[#D4AF37]/40" />
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Default/Generic Animation */}
            {type === "default" && (
                <motion.div className="relative w-24 h-24">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            rotate: 360,
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                        <Sparkles className="w-24 h-24 text-[#D4AF37]" />
                    </motion.div>
                </motion.div>
            )}

            {/* Loading Text */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-white/80 mt-8 text-lg font-sans"
            >
                {message ||
                    (type === "faceScanning"
                        ? "관상 특징을 분석하고 있습니다..."
                        : type === "palmReading"
                            ? "손금을 판독하고 있습니다..."
                            : type === "qiFlow"
                                ? "공간의 기 흐름을 분석하고 있습니다..."
                                : "분석 중입니다...")}
            </motion.p>

            {/* Pulsing dots */}
            <div className="flex gap-2 mt-4">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 1, 0.3],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                        }}
                        className="w-2 h-2 bg-[#D4AF37] rounded-full"
                    />
                ))}
            </div>
        </div>
    );
}
