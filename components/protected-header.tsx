"use client";

import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    User, LogOut, CreditCard, LayoutDashboard,
    Sun, BookOpen, Scan, Hand, Compass, ChevronDown,
    Sparkles, Users, ScrollText, Menu, X
} from "lucide-react";
import { getCurrentUserRole } from "@/app/actions/products";
import { UserRole } from "@/types/auth";
import { cn } from "@/lib/utils";

const sajuMenuItems = [
    { href: "/protected/saju/today", label: "오늘의 운세", icon: Sun },
    { href: "/protected/saju/detail", label: "사주 풀이", icon: BookOpen },
    { href: "/protected/saju/face", label: "관상", icon: Scan },
    { href: "/protected/saju/hand", label: "손금", icon: Hand },
    { href: "/protected/saju/fengshui", label: "풍수", icon: Compass },
];

export function ProtectedHeader({ user }: { user: any }) {
    const [isMounted, setIsMounted] = useState(false);
    const [userRole, setUserRole] = useState<UserRole>("user");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        setIsMounted(true);
        getCurrentUserRole().then((res) => setUserRole(res.role));
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    if (!isMounted) {
        return (
            <nav className="w-full flex justify-center h-16 items-center z-50 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0">
                <div className="w-full max-w-7xl flex justify-between items-center px-6">
                    <div className="w-8 h-8 rounded-full bg-primary/20 animate-pulse" />
                    <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse" />
                </div>
            </nav>
        );
    }

    const initial = user?.email?.charAt(0).toUpperCase() || "M";
    const isSajuActive = pathname?.startsWith("/protected/saju");

    return (
        <>
            <nav className="w-full flex justify-center h-16 items-center z-50 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0">
                <div className="w-full max-w-7xl flex justify-between items-center px-6">
                    {/* Logo */}
                    <Link href="/protected" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground transition-transform group-hover:scale-110">海</div>
                        <span className="font-bold text-xl tracking-tight hidden md:block">海華堂</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        {/* 해화사주 드롭다운 */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={cn(
                                    "flex items-center gap-1 text-sm font-medium transition-colors",
                                    isSajuActive ? "text-[#D4AF37]" : "text-muted-foreground hover:text-[#D4AF37]"
                                )}>
                                    해화사주
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                                {sajuMenuItems.map((item) => (
                                    <DropdownMenuItem
                                        key={item.href}
                                        onClick={() => router.push(item.href)}
                                        className="cursor-pointer"
                                    >
                                        <item.icon className="mr-2 h-4 w-4" />
                                        <span>{item.label}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Link
                            href="/protected/analysis"
                            className={cn(
                                "text-sm font-medium transition-colors",
                                pathname?.startsWith("/protected/analysis") ? "text-[#D4AF37]" : "text-muted-foreground hover:text-[#D4AF37]"
                            )}
                        >
                            천지인 분석
                        </Link>
                        <Link
                            href="/protected/relationships"
                            className={cn(
                                "text-sm font-medium transition-colors",
                                pathname?.startsWith("/protected/relationships") ? "text-[#D4AF37]" : "text-muted-foreground hover:text-[#D4AF37]"
                            )}
                        >
                            인연 관리
                        </Link>
                        <Link
                            href="/protected/history"
                            className={cn(
                                "text-sm font-medium transition-colors",
                                pathname?.startsWith("/protected/history") ? "text-[#D4AF37]" : "text-muted-foreground hover:text-[#D4AF37]"
                            )}
                        >
                            비록함
                        </Link>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block">
                            <ThemeSwitcher />
                        </div>

                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{initial}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || "마스터"}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>

                                <DropdownMenuSeparator />

                                {/* Admin Menu Item */}
                                {userRole === "admin" && (
                                    <>
                                        <DropdownMenuItem onClick={() => router.push("/admin")} className="text-yellow-500 focus:text-yellow-600 font-bold bg-yellow-500/10 focus:bg-yellow-500/20 cursor-pointer">
                                            <LayoutDashboard className="mr-2 h-4 w-4" />
                                            <span>관리자 페이지</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}

                                <DropdownMenuItem onClick={() => router.push("/protected/profile")}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>프로필 관리</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push("/protected/profile/manse")}>
                                    <ScrollText className="mr-2 h-4 w-4" />
                                    <span>내 사주 (만세력)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push("/protected/profile?tab=subscription")}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    <span>구독 및 결제</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleSignOut} className="text-red-500 focus:text-red-500">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>로그아웃</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-x-0 top-16 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/5 animate-in slide-in-from-top-2 duration-200">
                    <div className="px-6 py-4 space-y-4">
                        {/* 해화사주 서브메뉴 */}
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">해화사주</p>
                            <div className="grid grid-cols-2 gap-2">
                                {sajuMenuItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <item.icon className="w-4 h-4 text-[#D4AF37]" />
                                        <span className="text-sm">{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-white/5" />

                        {/* 다른 메뉴 */}
                        <div className="space-y-2">
                            <Link
                                href="/protected/analysis"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                                <span>천지인 분석</span>
                            </Link>
                            <Link
                                href="/protected/relationships"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <Users className="w-5 h-5 text-[#D4AF37]" />
                                <span>인연 관리</span>
                            </Link>
                            <Link
                                href="/protected/history"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <ScrollText className="w-5 h-5 text-[#D4AF37]" />
                                <span>비록함</span>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
