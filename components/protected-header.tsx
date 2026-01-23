"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
    User, LogOut, LayoutDashboard, Menu, X, ChevronDown,
    Sun, BookOpen, ScanFace, Hand, Compass, CreditCard, Ticket,
    Users, Clock, Crown, Activity
} from "lucide-react";
import { getCurrentUserRole } from "@/app/actions/products";
import { UserRole } from "@/types/auth";
import { TalismanBalance } from "@/components/talisman-balance";
import { SubscriptionBadge } from "@/components/membership/subscription-badge";

export function ProtectedHeader({ user }: { user: any }) {
    const [isMounted, setIsMounted] = useState(false);
    const [userRole, setUserRole] = useState<UserRole>("user");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        setIsMounted(true);
        getCurrentUserRole().then((res) => setUserRole(res.role));
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    };

    if (!isMounted) return null;

    const userEmail = user?.email || "";
    const userName = userEmail.split("@")[0] || "User";
    const userInitial = userName[0]?.toUpperCase() || "U";
    const avatarUrl = user?.user_metadata?.avatar_url;

    return (
        <header className="fixed top-0 left-0 w-full z-[100] bg-zen-bg/95 backdrop-blur-md border-b border-zen-border transition-all duration-300">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">

                {/* Left: Logo & Navigation */}
                <div className="flex items-center gap-12">
                    {/* Logo: Zen Style */}
                    <Link href="/protected" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 flex items-center justify-center border border-zen-text rounded-sm relative overflow-hidden group-hover:bg-zen-text transition-colors duration-300">
                            <span className="font-serif font-bold text-zen-text group-hover:text-zen-bg z-10 transition-colors">海</span>
                            <div className="absolute inset-0 bg-zen-text opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h1 className="font-serif text-xl font-bold text-zen-text tracking-tight group-hover:text-zen-wood transition-colors">
                            청담해화당
                        </h1>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-8">

                        {/* 해화사주 Dropdown */}
                        <div className="relative group h-20 flex items-center">
                            <Link href="/protected" className="flex items-center gap-1.5 text-sm font-bold text-zen-text/70 hover:text-zen-wood transition-colors font-sans">
                                해화사주 <ChevronDown className="w-3 h-3 opacity-50" />
                            </Link>

                            {/* Dropdown Panel */}
                            <div className="absolute top-20 left-0 w-48 bg-white border border-zen-border rounded-sm shadow-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                                <Link href="/protected/saju/today" className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-zen-bg text-zen-text/80 hover:text-zen-wood transition-colors">
                                    <Sun className="w-4 h-4 text-zen-gold" />
                                    <span className="text-sm">오늘의 운세</span>
                                </Link>
                                <Link href="/protected/analysis" className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-zen-bg text-zen-text/80 hover:text-zen-wood transition-colors">
                                    <BookOpen className="w-4 h-4 text-zen-gold" />
                                    <span className="text-sm">사주 풀이</span>
                                </Link>
                                <Link href="/protected/saju/face" className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-zen-bg text-zen-text/80 hover:text-zen-wood transition-colors">
                                    <ScanFace className="w-4 h-4 text-zen-gold" />
                                    <span className="text-sm">관상</span>
                                </Link>
                                <Link href="/protected/saju/hand" className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-zen-bg text-zen-text/80 hover:text-zen-wood transition-colors">
                                    <Hand className="w-4 h-4 text-zen-gold" />
                                    <span className="text-sm">손금</span>
                                </Link>
                                <Link href="/protected/saju/fengshui" className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-zen-bg text-zen-text/80 hover:text-zen-wood transition-colors">
                                    <Compass className="w-4 h-4 text-zen-gold" />
                                    <span className="text-sm">풍수</span>
                                </Link>
                            </div>
                        </div>

                        <Link href="/protected/analysis" className="text-sm font-bold text-zen-text/70 hover:text-zen-wood transition-colors font-sans">
                            천지인 분석
                        </Link>
                        <Link href="/protected/family" className="text-sm font-bold text-zen-text/70 hover:text-zen-wood transition-colors font-sans">
                            인연 관리
                        </Link>
                        <Link href="/protected/history" className="text-sm font-bold text-zen-text/70 hover:text-zen-wood transition-colors font-sans">
                            비록함
                        </Link>
                    </nav>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {/* Subscription Badge */}
                    <SubscriptionBadge />

                    {/* Talisman Balance */}
                    <TalismanBalance />

                    {/* Profile */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="relative p-0.5 h-10 w-10 rounded-full border border-zen-border hover:border-zen-gold transition-colors overflow-hidden bg-white shadow-sm outline-none hidden md:block">
                                <Avatar className="h-full w-full">
                                    <AvatarImage src={avatarUrl} className="object-cover" />
                                    <AvatarFallback className="bg-zen-bg text-zen-wood font-bold text-xs font-serif">
                                        {userInitial}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-64 bg-white border-zen-border text-zen-text p-2 shadow-2xl rounded-sm mt-3 font-sans" align="end">
                            <div className="px-3 py-4 border-b border-zen-border mb-1">
                                <div className="font-serif font-bold text-zen-text text-base mb-0.5">{userName}</div>
                                <div className="text-xs text-zen-muted font-mono">{userEmail}</div>
                            </div>

                            {userRole === 'admin' && (
                                <DropdownMenuItem asChild>
                                    <Link href="/admin" className="cursor-pointer group flex items-center gap-3 p-3 rounded-sm text-zen-wood hover:bg-zen-bg mb-1 transition-colors">
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span className="font-bold text-sm text-zen-text">관리자 페이지</span>
                                    </Link>
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem asChild>
                                <Link href="/protected/profile" className="cursor-pointer flex items-center gap-3 p-3 rounded-sm hover:bg-zen-bg transition-colors">
                                    <User className="w-4 h-4 text-zen-gold" />
                                    <span className="text-sm">프로필 관리</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/protected/profile/manse" className="cursor-pointer flex items-center gap-3 p-3 rounded-sm hover:bg-zen-bg transition-colors">
                                    <BookOpen className="w-4 h-4 text-zen-gold" />
                                    <span className="text-sm">내 사주 (만세력)</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/protected/membership" className="cursor-pointer flex items-center gap-3 p-3 rounded-sm hover:bg-zen-gold/10 transition-colors">
                                    <Crown className="w-4 h-4 text-zen-gold" />
                                    <span className="text-sm font-bold text-zen-gold">멤버십</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/protected/billing" className="cursor-pointer flex items-center gap-3 p-3 rounded-sm hover:bg-zen-bg transition-colors">
                                    <CreditCard className="w-4 h-4 text-zen-gold" />
                                    <span className="text-sm font-bold">부적 충전</span>
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-zen-border my-1" />

                            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer flex items-center gap-3 p-3 rounded-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                                <LogOut className="w-4 h-4" />
                                <span className="text-sm font-bold">로그아웃</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Mobile Toggle */}
                    <button
                        className="lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-zen-text hover:bg-zen-bg rounded-sm transition-colors active:scale-95"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu (Updated Layout) */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 top-20 left-0 w-full h-[calc(100vh-5rem)] bg-zen-bg z-[90] animate-in fade-in slide-in-from-top-4 overflow-y-auto border-t border-zen-border shadow-inner">
                    <nav className="flex flex-col p-6 gap-6 font-serif pb-32">

                        {/* 1. 해화사주 Group */}
                        <div className="space-y-2">
                            <div className="text-xs font-bold text-zen-muted uppercase tracking-widest px-1">해화사주 (Haehwa Saju)</div>
                            <div className="grid grid-cols-1 gap-2">
                                <Link href="/protected/saju/today" className="p-3 text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 bg-white/50 border border-zen-border rounded-sm active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                    <Sun className="w-5 h-5 text-zen-gold" /> 오늘의 운세
                                </Link>
                                <Link href="/protected/analysis" className="p-3 text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 bg-white/50 border border-zen-border rounded-sm active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                    <BookOpen className="w-5 h-5 text-zen-gold" /> 사주 풀이
                                </Link>
                                <Link href="/protected/saju/face" className="p-3 text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 bg-white/50 border border-zen-border rounded-sm active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                    <ScanFace className="w-5 h-5 text-zen-gold" /> 관상
                                </Link>
                                <Link href="/protected/saju/hand" className="p-3 text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 bg-white/50 border border-zen-border rounded-sm active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                    <Hand className="w-5 h-5 text-zen-gold" /> 손금
                                </Link>
                                <Link href="/protected/saju/fengshui" className="p-3 text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 bg-white/50 border border-zen-border rounded-sm active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                    <Compass className="w-5 h-5 text-zen-gold" /> 풍수
                                </Link>
                            </div>
                        </div>

                        {/* 2. Main Links */}
                        <div className="space-y-2 pt-2 border-t border-zen-border/50">
                            <Link href="/protected/analysis" className="p-3 text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 rounded-sm hover:bg-zen-bg-sub" onClick={() => setMobileMenuOpen(false)}>
                                <Activity className="w-5 h-5 text-zen-muted" /> 천지인 분석
                            </Link>
                            <Link href="/protected/family" className="p-3 text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 rounded-sm hover:bg-zen-bg-sub" onClick={() => setMobileMenuOpen(false)}>
                                <Users className="w-5 h-5 text-zen-muted" /> 인연 관리
                            </Link>
                            <Link href="/protected/history" className="p-3 text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 rounded-sm hover:bg-zen-bg-sub" onClick={() => setMobileMenuOpen(false)}>
                                <Clock className="w-5 h-5 text-zen-muted" /> 비록함
                            </Link>
                        </div>

                        {/* Bottom Actions */}
                        <div className="mt-4 pt-6 border-t border-zen-border">
                            <Link href="/protected/billing" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                                <Button className="w-full h-14 bg-zen-wood text-white text-lg font-bold rounded-sm shadow-md flex items-center gap-2">
                                    <Ticket className="w-5 h-5" /> 부적 충전하기
                                </Button>
                            </Link>

                            <div className="flex items-center justify-between mt-6 px-2">
                                <Link href="/protected/profile" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-zen-text flex items-center gap-2">
                                    <User className="w-4 h-4" /> 내 프로필
                                </Link>
                                <button onClick={handleSignOut} className="text-sm font-bold text-red-500 hover:text-red-700 flex items-center gap-2">
                                    <LogOut className="w-4 h-4" /> 로그아웃
                                </button>
                            </div>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
