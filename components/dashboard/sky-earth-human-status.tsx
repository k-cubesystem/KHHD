"use client";

import { motion } from "framer-motion";
import { Cloud, Mountain, User, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusItemProps {
    label: string;
    icon: React.ReactNode;
    status: "complete" | "pending" | "empty";
    description: string;
    delay: number;
}

function StatusItem({ label, icon, status, description, delay }: StatusItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            className={cn(
                "relative p-5 rounded-2xl border transition-all duration-300 group overflow-hidden",
                status === "complete"
                    ? "bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                    : "bg-white/5 border-white/5 opacity-60 hover:opacity-100"
            )}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={cn(
                    "p-2.5 rounded-xl transition-colors",
                    status === "complete" ? "bg-primary/20 text-primary" : "bg-white/10 text-muted-foreground"
                )}>
                    {icon}
                </div>
                {status === "complete" ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/30" />
                )}
            </div>
            <div>
                <h4 className="font-bold text-sm mb-1">{label}</h4>
                <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
            </div>

            {/* Aesthetic Highlight */}
            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-primary/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
        </motion.div>
    );
}

export function SkyEarthHumanStatus() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <StatusItem
                label="天 - 사주분석"
                icon={<Cloud className="w-5 h-5" />}
                status="complete"
                description="인생의 설계도와 선천적 기운 분석 완료."
                delay={0.1}
            />
            <StatusItem
                label="地 - 풍수분석"
                icon={<Mountain className="w-5 h-5" />}
                status="pending"
                description="거주지 및 공간의 기운 조율 대기 중."
                delay={0.2}
            />
            <StatusItem
                label="人 - 관상분석"
                icon={<User className="w-5 h-5" />}
                status="empty"
                description="손금/관상을 통한 후천적 변화 분석 전."
                delay={0.3}
            />
        </div>
    );
}
