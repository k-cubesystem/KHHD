"use client";

import { Home, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function FloatingActionButton() {
    const router = useRouter();

    const handleHomePress = () => router.push("/protected");
    const handleProfilePress = () => router.push("/protected/profile");

    return (
        // Locked to the centered mobile column 
        <div className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[480px] z-40 pointer-events-none h-0">
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, type: "spring" }}
                className="absolute bottom-24 right-5 pointer-events-auto flex flex-col gap-4"
            >
                {/* Profile Button */}
                <Button
                    onClick={handleProfilePress}
                    size="icon"
                    className="w-14 h-14 rounded-full bg-surface/80 hover:bg-surface text-ink-light backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.3)] border border-primary/20 relative group overflow-hidden"
                >
                    <User className="w-7 h-7" strokeWidth={1.5} />
                </Button>

                {/* Home Button */}
                <Button
                    onClick={handleHomePress}
                    size="icon"
                    className="w-14 h-14 rounded-full bg-primary hover:bg-primary-dim text-background shadow-[0_0_20px_rgba(236,182,19,0.4)] border border-white/20 relative group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Home className="w-7 h-7 relative z-10" strokeWidth={1.5} />

                    {/* Ping Animation */}
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                </Button>
            </motion.div>
        </div>
    );
}
