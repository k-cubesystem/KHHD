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
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User, LogOut, CreditCard, Sparkles } from "lucide-react";

export function ProtectedHeader({ user }: { user: any }) {
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    const initial = user?.email?.charAt(0).toUpperCase() || "M";

    return (
        <nav className="w-full flex justify-center h-16 items-center z-50 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0">
            <div className="w-full max-w-7xl flex justify-between items-center px-6">
                {/* Logo */}
                <Link href="/protected" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground transition-transform group-hover:scale-110">海</div>
                    <span className="font-bold text-xl tracking-tight hidden md:block">海華堂</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="/protected/analysis" className="text-sm font-medium text-muted-foreground hover:text-[#D4AF37] transition-colors">운명기상청</Link>
                    <Link href="/protected/history" className="text-sm font-medium text-muted-foreground hover:text-[#D4AF37] transition-colors">마스터 비록함</Link>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:block">
                        <ThemeSwitcher />
                    </div>

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
                            <DropdownMenuItem onClick={() => router.push("/protected/profile")}>
                                <User className="mr-2 h-4 w-4" />
                                <span>프로필 관리</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/protected/profile?tab=subscription")}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                <span>구독 및 결제</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/protected/analysis")}>
                                <Sparkles className="mr-2 h-4 w-4" />
                                <span>새 분석 생성</span>
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
    );
}
