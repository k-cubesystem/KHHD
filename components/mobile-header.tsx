"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function MobileHeader() {
    const pathname = usePathname();
    const router = useRouter();

    // Hide on Dashboard (Home) page as it has its own header
    if (pathname === "/protected") {
        return null;
    }

    return (
        <header className="lg:hidden sticky top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-md border-b border-primary/10 px-4 flex items-center justify-between shrink-0">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="w-10 h-10 flex items-center justify-start text-ink-light/70 hover:text-primary transition-colors"
                aria-label="Go back"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Title or Logo styling (Optional, keeping it subtle) */}
            <span className="text-xs font-serif font-bold text-primary tracking-[0.2em] opacity-80">
                청담해화당
            </span>

            {/* Home Button */}
            <Link
                href="/protected"
                className="w-10 h-10 flex items-center justify-end text-ink-light/70 hover:text-primary transition-colors"
                aria-label="Go home"
            >
                <Home className="w-5 h-5" />
            </Link>
        </header>
    );
}
