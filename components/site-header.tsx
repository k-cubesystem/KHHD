import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
    return (
        <nav className="w-full flex justify-center h-20 items-center z-50 border-b border-border/10 bg-background/50 backdrop-blur-md sticky top-0">
            <div className="w-full max-w-6xl flex justify-between items-center px-6">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground transition-transform group-hover:scale-110">海</div>
                    <span className="font-bold text-xl tracking-tight">海華堂</span>
                </Link>
                <div className="flex items-center gap-4">
                    <ThemeSwitcher />
                    <Link href="/auth/login">
                        <Button size="sm" className="font-bold">로그인</Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
