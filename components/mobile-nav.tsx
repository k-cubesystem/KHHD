"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, History, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
    const pathname = usePathname();

    const activeLink = (path: string) => pathname === path;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-t border-white/10 pb-safe-area md:hidden">
            <div className="flex justify-around items-center h-16">
                <Link href="/protected" className={cn("flex flex-col items-center gap-1 w-full", activeLink("/protected") ? "text-[#D4AF37]" : "text-muted-foreground hover:text-white")}>
                    <Home className="w-5 h-5" />
                    <span className="text-[10px] font-medium">홈</span>
                </Link>
                <Link href="/protected/analysis" className={cn("flex flex-col items-center gap-1 w-full", activeLink("/protected/analysis") ? "text-[#D4AF37]" : "text-muted-foreground hover:text-white")}>
                    <Sparkles className="w-5 h-5" />
                    <span className="text-[10px] font-medium">분석</span>
                </Link>
                <Link href="/protected/family" className={cn("flex flex-col items-center gap-1 w-full", activeLink("/protected/family") ? "text-[#D4AF37]" : "text-muted-foreground hover:text-white")}>
                    <Users className="w-5 h-5" />
                    <span className="text-[10px] font-medium">가족</span>
                </Link>
                <Link href="/protected/history" className={cn("flex flex-col items-center gap-1 w-full", activeLink("/protected/history") ? "text-[#D4AF37]" : "text-muted-foreground hover:text-white")}>
                    <History className="w-5 h-5" />
                    <span className="text-[10px] font-medium">비록</span>
                </Link>
                <Link href="/protected/profile" className={cn("flex flex-col items-center gap-1 w-full", activeLink("/protected/profile") ? "text-[#D4AF37]" : "text-muted-foreground hover:text-white")}>
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-medium">프로필</span>
                </Link>
            </div>
        </nav>
    );
}
