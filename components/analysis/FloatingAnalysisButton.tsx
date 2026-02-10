"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Home, X } from "lucide-react";
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
                        className="w-10 h-10 bg-transparent hover:bg-primary/10 text-primary shadow-none border-0 hover:scale-110 transition-transform flex items-center justify-center p-0"
                    >
                        <Home className="w-5 h-5" />
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
