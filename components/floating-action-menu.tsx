"use client";

import { useState } from "react";
import { Home, User, MessageCircle, Sun, X, Menu, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MenuItem {
    icon: any;
    label: string;
    href: string;
    color?: string;
}

export function FloatingActionMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const menuItems: MenuItem[] = [
        { icon: Home, label: "홈", href: "/protected" },
        { icon: Sun, label: "오늘의 운세", href: "/protected/saju/today", color: "text-yellow-400" },
        { icon: Sparkles, label: "천지인 분석", href: "/protected/analysis", color: "text-[#D4AF37]" },
        { icon: BookOpen, label: "비록함", href: "/protected/history" },
        { icon: User, label: "마이페이지", href: "/protected/profile" },
    ];

    const isActive = (href: string) => pathname === href;

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 md:hidden w-14 h-14 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8942D] shadow-lg shadow-[#D4AF37]/30 flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-black" />
                ) : (
                    <Menu className="w-6 h-6 text-black" />
                )}
            </button>

            {/* Mobile Expanded Menu */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 md:hidden space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
                    {menuItems.map((item, index) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl transition-all duration-200 ${
                                isActive(item.href)
                                    ? "bg-[#D4AF37] text-black"
                                    : "bg-white/10 border border-white/20 hover:bg-white/20"
                            }`}
                            style={{
                                animationDelay: `${index * 50}ms`,
                            }}
                        >
                            <item.icon className={`w-5 h-5 ${isActive(item.href) ? "text-black" : item.color || "text-white"}`} />
                            <span className="font-bold text-sm">{item.label}</span>
                        </Link>
                    ))}
                </div>
            )}

            {/* Desktop Bottom Navigation Bar */}
            <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                                isActive(item.href)
                                    ? "bg-[#D4AF37] text-black"
                                    : "hover:bg-white/10"
                            }`}
                        >
                            <item.icon className={`w-4 h-4 ${isActive(item.href) ? "text-black" : item.color || "text-white"}`} />
                            <span className={`font-bold text-sm ${isActive(item.href) ? "text-black" : "text-white"}`}>
                                {item.label}
                            </span>
                        </Link>
                    ))}

                    {/* Kakao Channel Button */}
                    <a
                        href="https://pf.kakao.com/_xYourChannelId"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FEE500] hover:bg-[#FDD800] transition-colors ml-2"
                    >
                        <MessageCircle className="w-4 h-4 text-[#3C1E1E]" />
                        <span className="font-bold text-sm text-[#3C1E1E]">카카오톡</span>
                    </a>
                </div>
            </div>

            {/* Mobile Kakao Channel Button (separate) */}
            <a
                href="https://pf.kakao.com/_xYourChannelId"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 left-6 z-50 md:hidden w-14 h-14 rounded-full bg-[#FEE500] shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
                <MessageCircle className="w-6 h-6 text-[#3C1E1E]" />
            </a>
        </>
    );
}
