"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Cloud, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
    const pathname = usePathname();

    const navItems = [
        { label: "홈", href: "/protected", icon: Home },
        { label: "분석", href: "/protected/analysis", icon: Cloud },
        { label: "비록", href: "/protected/history", icon: History },
        { label: "프로필", href: "/protected/profile", icon: User },
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-hanji/95 backdrop-blur-md border-t border-ink/10 pb-safe">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/protected" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-300",
                                isActive ? "text-cinnabar" : "text-ink/40 hover:text-ink/70"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive && "fill-current")} />
                            <span className={cn("text-[10px] font-gungseo tracking-widest", isActive && "font-bold")}>
                                {item.label}
                            </span>
                            {isActive && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-cinnabar" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
