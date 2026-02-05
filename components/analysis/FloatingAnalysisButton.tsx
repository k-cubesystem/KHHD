"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function FloatingAnalysisButton() {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Hide on scroll down, show on scroll up
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false); // Scrolling down
            } else {
                setIsVisible(true); // Scrolling up
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="fixed bottom-24 right-4 z-40"
                >
                    <Button
                        onClick={() => router.push("/protected/analysis")}
                        className="w-14 h-14 rounded-full bg-primary text-background shadow-[0_4px_20px_rgba(236,182,19,0.4)] border border-white/20 hover:scale-105 transition-transform flex items-center justify-center p-0"
                    >
                        <Sparkles className="w-6 h-6 animate-pulse" />
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
