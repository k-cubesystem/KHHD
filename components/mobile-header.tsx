"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, User, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function MobileHeader() {
    const pathname = usePathname();
    const router = useRouter();



    return (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[480px]">
            <header className="h-14 bg-background/80 backdrop-blur-md border-b border-primary/10 px-4 flex items-center justify-between shrink-0">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 flex items-center justify-start text-ink-light/70 hover:text-primary transition-colors"
                    aria-label="Go back"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Title or Logo styling (Optional, keeping it subtle) */}
                <Link
                    href="/protected"
                    className="text-xs font-serif font-bold text-primary tracking-[0.2em] opacity-80 hover:opacity-100 transition-opacity"
                >
                    청담해화당
                </Link>

                {/* Home Button (Replaces Profile) */}
                <Link
                    href="/protected"
                    className="w-10 h-10 flex items-center justify-end text-ink-light/70 hover:text-primary transition-colors"
                    aria-label="Go to home"
                >
                    <Home className="w-5 h-5" />
                </Link>
            </header>
        </div>
    );
}
