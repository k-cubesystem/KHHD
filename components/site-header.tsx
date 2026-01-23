"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, Sun, BookOpen, ScanFace, Hand, Compass, Users, Clock, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export function SiteHeader() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Scroll effect (Optional, but good for landing)
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "fixed top-0 left-0 w-full z-[100] transition-all duration-300 border-b",
                isScrolled || mobileMenuOpen
                    ? "bg-zen-bg/95 backdrop-blur-md border-zen-border shadow-sm"
                    : "bg-zen-bg/95 backdrop-blur-md border-zen-border" // Always consistant as requested
            )}
        >
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">

                {/* 1. Left: Logo (Same as ProtectedHeader) */}
                <div className="flex items-center gap-12">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 flex items-center justify-center border border-zen-text rounded-sm relative overflow-hidden group-hover:bg-zen-text transition-colors duration-300">
                            <span className="font-serif font-bold text-zen-text group-hover:text-zen-bg z-10 transition-colors">海</span>
                            <div className="absolute inset-0 bg-zen-text opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h1 className="font-serif text-xl font-bold text-zen-text tracking-tight group-hover:text-zen-wood transition-colors">
                            청담해화당
                        </h1>
                    </Link>

                    {/* 2. Desktop Navigation (Same structure as ProtectedHeader) */}
                    <nav className="hidden lg:flex items-center gap-8">

                        {/* 해화사주 Dropdown */}
                        <div className="relative group h-20 flex items-center">
                            <Link href="/protected" className="flex items-center gap-1.5 text-sm font-bold text-zen-text/70 hover:text-zen-wood transition-colors font-sans focus:outline-none">
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

                {/* 3. Right: Auth Actions (Login/Signup instead of UserProfile) */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-4">
                        <Link href="/auth/login">
                            <Button variant="ghost" className="text-zen-text font-serif font-bold hover:text-zen-wood hover:bg-transparent px-2">
                                로그인
                            </Button>
                        </Link>
                        <Link href="/auth/sign-up">
                            <Button className="bg-zen-wood text-white hover:bg-[#7A604D] rounded-sm font-serif font-bold px-6 shadow-sm hover:shadow transition-all">
                                무료 시작하기
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile Toggle - UX Pro Max */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-zen-text hover:bg-zen-gold/10 rounded-sm transition-colors active:bg-zen-gold/20"
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

            {/* 4. Mobile Menu Overlay - UX Pro Max AnimatePresence */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="lg:hidden fixed inset-0 top-20 left-0 w-full h-[calc(100vh-5rem)] bg-zen-bg/98 backdrop-blur-md z-[90] overflow-y-auto border-t border-zen-border shadow-inner"
                    >
                        <nav className="flex flex-col p-6 gap-6 font-serif pb-32">
                            {/* 1. 해화사주 Group with Stagger */}
                            <motion.div
                                variants={staggerContainer}
                                initial="initial"
                                animate="animate"
                                className="space-y-2"
                            >
                                <motion.div variants={fadeInUp} className="text-xs font-bold text-zen-muted uppercase tracking-widest px-1">해화사주 (Total Destiny)</motion.div>
                                <div className="grid grid-cols-1 gap-2">
                                    <motion.div variants={fadeInUp}>
                                        <Link href="/auth/login" className="p-4 min-h-[56px] text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 bg-white/50 border border-zen-border rounded-sm active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                            <Sun className="w-5 h-5 text-zen-gold flex-shrink-0" /> 오늘의 운세
                                        </Link>
                                    </motion.div>
                                    <motion.div variants={fadeInUp}>
                                        <Link href="/auth/login" className="p-4 min-h-[56px] text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 bg-white/50 border border-zen-border rounded-sm active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                            <BookOpen className="w-5 h-5 text-zen-gold flex-shrink-0" /> 사주 풀이
                                        </Link>
                                    </motion.div>
                                    <motion.div variants={fadeInUp}>
                                        <Link href="/auth/login" className="p-4 min-h-[56px] text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 bg-white/50 border border-zen-border rounded-sm active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                            <ScanFace className="w-5 h-5 text-zen-gold flex-shrink-0" /> 관상
                                        </Link>
                                    </motion.div>
                                    <motion.div variants={fadeInUp}>
                                        <Link href="/auth/login" className="p-4 min-h-[56px] text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 bg-white/50 border border-zen-border rounded-sm active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                            <Hand className="w-5 h-5 text-zen-gold flex-shrink-0" /> 손금
                                        </Link>
                                    </motion.div>
                                    <motion.div variants={fadeInUp}>
                                        <Link href="/auth/login" className="p-4 min-h-[56px] text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 bg-white/50 border border-zen-border rounded-sm active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                            <Compass className="w-5 h-5 text-zen-gold flex-shrink-0" /> 풍수
                                        </Link>
                                    </motion.div>
                                </div>
                            </motion.div>

                            {/* 2. Main Links */}
                            <motion.div
                                variants={staggerContainer}
                                initial="initial"
                                animate="animate"
                                className="space-y-2 pt-2 border-t border-zen-border/50"
                            >
                                <motion.div variants={fadeInUp}>
                                    <Link href="/auth/login" className="p-4 min-h-[56px] text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 rounded-sm hover:bg-zen-surface active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                        <span className="w-5 h-5 flex items-center justify-center text-zen-muted flex-shrink-0">地</span> 천지인 분석
                                    </Link>
                                </motion.div>
                                <motion.div variants={fadeInUp}>
                                    <Link href="/auth/login" className="p-4 min-h-[56px] text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 rounded-sm hover:bg-zen-surface active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                        <Users className="w-5 h-5 text-zen-muted flex-shrink-0" /> 인연 관리
                                    </Link>
                                </motion.div>
                                <motion.div variants={fadeInUp}>
                                    <Link href="/auth/login" className="p-4 min-h-[56px] text-lg font-bold text-zen-text hover:text-zen-wood flex items-center gap-3 rounded-sm hover:bg-zen-surface active:scale-[0.98] transition-all" onClick={() => setMobileMenuOpen(false)}>
                                        <Clock className="w-5 h-5 text-zen-muted flex-shrink-0" /> 비록함
                                    </Link>
                                </motion.div>
                            </motion.div>

                            {/* Bottom Actions */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-4 pt-6 border-t border-zen-border"
                            >
                                <Link href="/auth/sign-up" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                                    <Button className="w-full h-14 bg-zen-wood text-white text-lg font-bold rounded-sm shadow-md flex items-center gap-2">
                                        무료 시작하기
                                    </Button>
                                </Link>
                                <Link href="/auth/login" className="w-full mt-4 h-12 min-h-[44px] flex items-center justify-center text-zen-wood font-bold hover:bg-zen-bg/50 rounded-sm border border-transparent hover:border-zen-border transition-all" onClick={() => setMobileMenuOpen(false)}>
                                    로그인
                                </Link>
                            </motion.div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
