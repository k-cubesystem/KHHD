"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, Sun, BookOpen, ScanFace, Hand, Compass, Users, Clock, Ticket, Flower2, User, LogOut, Sparkles, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserRole } from "@/app/actions/products";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SiteHeader() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>("user");
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);

        // Check Auth Status
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                try {
                    const { role } = await getCurrentUserRole();
                    setUserRole(role);
                } catch (e) {
                    console.error("Failed to fetch role", e);
                }
            }
        };
        checkUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                getCurrentUserRole().then(res => setUserRole(res.role)).catch(err => console.error(err));
            } else {
                setUserRole("user");
            }
        });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            subscription.unsubscribe();
        };
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        // Optionally redirect to home or login
        router.push('/');
    };

    return (
        <header
            className={cn(
                "fixed top-0 left-0 w-full z-[100] transition-all duration-300 border-b",
                isScrolled || mobileMenuOpen
                    ? "bg-background/80 backdrop-blur-md border-primary/20 shadow-sm"
                    : "bg-background/80 backdrop-blur-md border-primary/20"
            )}
        >
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">

                {/* 1. Left: Logo */}
                <div className="flex items-center gap-12">
                    <Link href="/" className="flex items-center gap-3 group">
                        <Flower2 className="w-6 h-6 text-primary group-hover:text-primary-light transition-colors" strokeWidth={1} />
                        <h1 className="font-serif text-xl font-bold text-ink-light tracking-tight group-hover:text-primary transition-colors">
                            청담 <span className="text-primary">해화당</span>
                        </h1>
                    </Link>

                    {/* 2. Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-8">
                        <Link href="/protected/services" className="text-sm font-bold text-ink-light/70 hover:text-primary transition-colors font-sans">
                            해화당설명
                        </Link>
                        <Link href="/protected/analysis" className="text-sm font-bold text-ink-light/70 hover:text-primary transition-colors font-sans">
                            천지인사주
                        </Link>
                        <Link href="/protected/family" className="text-sm font-bold text-ink-light/70 hover:text-primary transition-colors font-sans">
                            인연관리
                        </Link>
                        <Link href="/protected/saju/fengshui" className="text-sm font-bold text-ink-light/70 hover:text-primary transition-colors font-sans">
                            풍수지리
                        </Link>
                        <Link href="/protected/saju/detail" className="text-sm font-bold text-ink-light/70 hover:text-primary transition-colors font-sans">
                            내사주정보
                        </Link>
                    </nav>
                </div>

                {/* 3. Right: Auth Actions */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-4">
                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-transparent focus:ring-0">
                                        <Avatar className="h-10 w-10 border border-primary/30">
                                            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name} className="object-cover" />
                                            <AvatarFallback className="bg-surface text-primary font-bold">
                                                {user.email?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 bg-surface/95 backdrop-blur-xl border-primary/20 text-ink-light rounded-none p-2" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none text-primary">{user.user_metadata?.full_name || '회원님'}</p>
                                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-primary/10" />
                                    {userRole === 'admin' && (
                                        <DropdownMenuItem className="focus:bg-primary/10 focus:text-primary rounded-none cursor-pointer" asChild>
                                            <Link href="/admin">
                                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                                <span className="font-bold">관리자 대시보드</span>
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="focus:bg-primary/10 focus:text-primary rounded-none cursor-pointer" asChild>
                                        <Link href="/protected/profile">
                                            <User className="mr-2 h-4 w-4" />
                                            <span>내 정보 수정</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="focus:bg-primary/10 focus:text-primary rounded-none cursor-pointer" asChild>
                                        <Link href="/protected/saju/detail">
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            <span>내 사주 보기</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="focus:bg-primary/10 focus:text-primary rounded-none cursor-pointer" asChild>
                                        <Link href="/protected/family">
                                            <Users className="mr-2 h-4 w-4" />
                                            <span>인연 관리</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="focus:bg-primary/10 focus:text-primary rounded-none cursor-pointer" asChild>
                                        <Link href="/protected/membership">
                                            <Ticket className="mr-2 h-4 w-4" />
                                            <span>멤버쉽 결제</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-primary/10" />
                                    <DropdownMenuItem className="focus:bg-red-900/20 focus:text-red-400 text-red-400 rounded-none cursor-pointer" onClick={handleLogout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>로그아웃</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link href="/auth/login">
                                <Button variant="ghost" className="text-ink-light font-serif font-bold hover:text-primary hover:bg-transparent px-2 rounded-none">
                                    로그인
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-light hover:bg-primary/10 transition-colors active:bg-primary/20 rounded-none"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
                    >
                        <motion.div
                            initial={false}
                            animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </motion.div>
                    </motion.button>
                </div>
            </div>

            {/* 4. Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="lg:hidden fixed inset-0 top-20 left-0 w-full h-[calc(100vh-5rem)] bg-background/95 backdrop-blur-xl z-[1000] overflow-y-auto border-t border-primary/20 shadow-inner"
                    >
                        {/* Simplified Mobile Menu for brevity - keeping existing links but updating Actions */}
                        <nav className="flex flex-col p-6 gap-6 font-serif pb-32">
                            <motion.div
                                variants={staggerContainer}
                                initial="initial"
                                animate="animate"
                                className="space-y-2"
                            >
                                <motion.div variants={fadeInUp} className="text-xs font-bold text-primary-dim uppercase tracking-widest px-1">해화사주 (Total Destiny)</motion.div>
                                <div className="grid grid-cols-1 gap-2">
                                    <motion.div variants={fadeInUp}>
                                        <Link href="/protected/saju/today" className="p-4 min-h-[56px] text-lg font-bold text-ink-light hover:text-primary flex items-center gap-3 bg-surface/30 border border-primary/20 active:scale-[0.98] transition-all rounded-none" onClick={() => setMobileMenuOpen(false)}>
                                            <Sun className="w-5 h-5 text-primary flex-shrink-0" /> 오늘의 운세
                                        </Link>
                                    </motion.div>
                                    <motion.div variants={fadeInUp}>
                                        <Link href="/protected/analysis" className="p-4 min-h-[56px] text-lg font-bold text-ink-light hover:text-primary flex items-center gap-3 bg-surface/30 border border-primary/20 active:scale-[0.98] transition-all rounded-none" onClick={() => setMobileMenuOpen(false)}>
                                            <BookOpen className="w-5 h-5 text-primary flex-shrink-0" /> 사주 풀이
                                        </Link>
                                    </motion.div>
                                </div>
                            </motion.div>

                            <motion.div
                                variants={staggerContainer}
                                initial="initial"
                                animate="animate"
                                className="space-y-2 pt-2 border-t border-primary/10"
                            >
                                <motion.div variants={fadeInUp}>
                                    <Link href="/protected/family" className="p-4 min-h-[56px] text-lg font-bold text-ink-light hover:text-primary flex items-center gap-3 hover:bg-surface/20 active:scale-[0.98] transition-all rounded-none" onClick={() => setMobileMenuOpen(false)}>
                                        <Users className="w-5 h-5 text-ink-light/50 flex-shrink-0" /> 인연 관리
                                    </Link>
                                </motion.div>
                            </motion.div>

                            {/* Mobile Bottom Actions */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-4 pt-6 border-t border-primary/20"
                            >
                                {user ? (
                                    <Button
                                        className="w-full h-14 bg-red-900/20 text-red-400 hover:bg-red-900/40 text-lg font-bold border border-red-900/30 flex items-center gap-2 rounded-none"
                                        onClick={handleLogout}
                                    >
                                        로그아웃
                                    </Button>
                                ) : (
                                    <Link href="/auth/login" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                                        <Button className="w-full h-14 bg-primary text-background hover:bg-primary-light text-lg font-bold shadow-md flex items-center gap-2 rounded-none">
                                            로그인
                                        </Button>
                                    </Link>
                                )}
                            </motion.div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
