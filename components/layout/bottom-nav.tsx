"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Users, Sparkles, BookOpen, MessageCircleHeart, Calendar, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
    const pathname = usePathname();

    const NAV_ITEMS = [
        { label: "사주/궁합", icon: Home, href: "/protected/analysis" },
        { label: "가족관리", icon: Users, href: "/protected/family" },
        { label: "관상/풍수/손금", icon: Sparkles, href: "/protected/studio" },
        { label: "고민상담", icon: MessageCircleHeart, href: "/protected/ai-shaman" },
        { label: "만세력", icon: Calendar, href: "/protected/profile/manse" },
    ];

    // Hidden on non-protected pages
    if (!pathname.startsWith("/protected")) return null;

    return (
        <nav className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[480px] z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-white/10 pb-safe-area-bottom">
            <div className="flex justify-around items-center h-[60px] px-2">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-all text-white/30 hover:text-white/60",
                                isActive && "text-[#D4AF37]"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-xl transition-all duration-300",
                                isActive && "bg-[#D4AF37]/10 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                            )}>
                                <Icon
                                    className={cn(
                                        "w-5 h-5 stroke-[1.5]",
                                        isActive && "stroke-[#D4AF37] fill-[#D4AF37]/20"
                                    )}
                                />
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium tracking-tight transition-all",
                                isActive ? "text-[#D4AF37] font-bold" : "font-sans"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
