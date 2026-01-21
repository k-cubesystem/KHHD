import { Hero } from "@/components/hero";
import { SiteHeader } from "@/components/site-header";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background selection:bg-primary/30">
      <div className="relative flex flex-col items-center overflow-hidden min-h-screen">
        {/* Ambient background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full -z-10" />

        <SiteHeader />

        <div className="flex-1 w-full flex flex-col items-center justify-center pb-20">
          <Hero />

          <div className="mt-12 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Link href="/auth/login">
              <Button size="lg" className="text-lg px-8 py-6 rounded-full font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                운명 분석 시작하기
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              이미 <span className="text-primary font-bold">12,403명</span>이 자신의 운명을 설계했습니다.
            </p>
          </div>
        </div>

        <footer className="w-full py-8 border-t border-border/10">
          <div className="max-w-6xl mx-auto px-6 text-center text-xs text-muted-foreground/50">
            © 2026 Haehwadang AI. Premium Fate Engineering Service.
          </div>
        </footer>
      </div>
    </main>
  );
}
