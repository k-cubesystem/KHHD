"use client";

import { Home, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function FloatingActionButton() {
    const router = useRouter();

    const handleHomePress = () => router.push("/protected");

    return (
        // Locked to the centered mobile column
        <div className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[480px] z-40 pointer-events-none h-0">
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, type: "spring" }}
                className="absolute bottom-24 right-5 pointer-events-auto"
            >
                {/* Home Button */}
                <Button
                    onClick={handleHomePress}
                    size="icon"
                    className="w-14 h-14 rounded-full bg-primary hover:bg-primary-dim text-background shadow-[0_0_20px_rgba(236,182,19,0.4)] border border-white/20 relative group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Home className="w-7 h-7 relative z-10" strokeWidth={1.5} />
                </Button>
            </motion.div>
        </div>
    );
}
