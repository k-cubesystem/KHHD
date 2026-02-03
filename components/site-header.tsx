"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, Sun, BookOpen, ScanFace, Hand, Compass, Users, Clock, Ticket, Flower2, User, LogOut, Sparkles, LayoutDashboard, ChevronLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserRole } from "@/app/actions/products";
import { getWalletBalance } from "@/app/actions/wallet-actions";
import { getUserTierLimits } from "@/app/actions/membership-limits";
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
    const [balance, setBalance] = useState(0);
    const [tier, setTier] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();

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
                    getWalletBalance().then(setBalance);
                    getUserTierLimits().then(res => setTier(res?.tier || null));
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
                "fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[100] transition-all duration-300 border-b",
                isScrolled || mobileMenuOpen
                    ? "bg-background/80 backdrop-blur-md border-primary/20 shadow-sm"
                    : "bg-background/80 backdrop-blur-md border-primary/20"
            )}
        >
            <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">

                {/* 1. Left: Navigation Action */}
                <div className="flex-1 flex justify-start">
                    {pathname === "/" ? (
                        <Link href="/" className="p-2 -ml-2 text-ink-light/80 hover:text-primary transition-colors">
                            <Home className="w-6 h-6" />
                        </Link>
                    ) : (
                        <button onClick={() => router.back()} className="p-2 -ml-2 text-ink-light/80 hover:text-primary transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* 2. Center: Logo (Absolute Center) */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
                    <Link href="/" className="flex items-center gap-2 pointer-events-auto">
                        <Image src="/logo-new.png" alt="Haehwadang" width={28} height={28} className="w-7 h-7 object-contain opacity-90" />
                        <h1 className="font-serif text-lg font-bold text-ink-light tracking-tight flex items-center text-primary-dim">
                            해화당
                        </h1>
                    </Link>
                </div>

                {/* 3. Right: User Info */}
                <div className="flex-1 flex justify-end gap-3">
                    {user ? (
                        <div className="flex items-center gap-3">
                            {/* Talisman */}
                            <Link href="/protected/membership" className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface/30 border border-primary/20">
                                <Ticket className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-bold text-ink-light">{balance}</span>
                            </Link>

                            {/* Name Only */}
                            <div className="flex flex-col items-end leading-none">
                                <span className="text-xs font-bold text-ink-light">
                                    {user.user_metadata?.full_name || "회원"}님
                                </span>
                            </div>
                        </div>
                    ) : (
                        <Link href="/auth/login" className="text-xs font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-full bg-surface/20">
                            로그인
                        </Link>
                    )}
                </div>
            </div>
        </header >
    );
}
