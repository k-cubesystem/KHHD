"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Cloud, History, User, BookOpen, Users, Compass, ScanFace, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
    const pathname = usePathname();

    const navItems = [
        { label: "사주풀이", href: "/protected/analysis", icon: Cloud },
        { label: "인연관리", href: "/protected/family", icon: Users },
        { label: "풍수지리", href: "/protected/saju/fengshui", icon: Compass },
        { label: "관상/손금", href: "/protected/saju/face", icon: ScanFace },
        { label: "궁합", href: "/protected/saju/compatibility", icon: Heart },
    ];

    return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-background/80 backdrop-blur-md border-t border-primary/20 pb-safe">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/protected" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-300",
                                isActive ? "text-primary" : "text-ink-light/40 hover:text-ink-light/70"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive && "fill-current")} />
                            <span className={cn("text-[10px] font-sans tracking-widest", isActive && "font-bold")}>
                                {item.label}
                            </span>
                            {isActive && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
