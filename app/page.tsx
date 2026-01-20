import { Hero } from "@/components/hero";
import SocialLoginButtons from "@/components/social-login-buttons";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { EnvVarWarning } from "@/components/env-var-warning";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background selection:bg-primary/30">
      <div className="relative flex flex-col items-center overflow-hidden">
        {/* Ambient background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full -z-10" />

        <nav className="w-full flex justify-center h-20 items-center z-50">
          <div className="w-full max-w-6xl flex justify-between items-center px-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground">海</div>
              <span className="font-bold text-xl tracking-tight">海華堂</span>
            </div>
            <ThemeSwitcher />
          </div>
        </nav>

        <div className="w-full max-w-6xl flex flex-col gap-16 pb-32">
          <Hero />

          <section className="flex flex-col items-center gap-8 px-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">시작하기</h2>
              <p className="text-muted-foreground">간편한 소셜 로그인으로 당신의 운명 공학 리포트를 확인하세요.</p>
            </div>

            <div className="w-full flex flex-col items-center gap-6">
              {!hasEnvVars ? (
                <div className="w-full max-w-sm flex flex-col gap-4">
                  <EnvVarWarning />
                  <Link href="/protected/family" className="w-full">
                    <Button variant="outline" className="w-full py-6 border-primary/50 text-primary hover:bg-primary/5 font-bold">
                      데모 대시보드 먼저 체험하기 →
                    </Button>
                  </Link>
                </div>
              ) : (
                <SocialLoginButtons />
              )}
            </div>
          </section>

          {/* Features / Philosophy Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 px-6 mt-16">
            <div className="glass p-10 rounded-3xl space-y-4">
              <h3 className="text-2xl font-bold">The KAIST Algorithm</h3>
              <p className="text-muted-foreground leading-relaxed">
                단순한 신비주의를 넘어섭니다. 데이터의 상호작용(Interaction) 분석을 통해
                성공 확률을 수치화하고 시뮬레이션합니다.
                <br /><br />
                <span className="text-primary font-mono font-semibold">
                  天(Fate) + 人(Self) + 地(Environment) = Success Probability
                </span>
              </p>
            </div>
            <div className="glass p-10 rounded-3xl space-y-4">
              <h3 className="text-2xl font-bold">4대 계승자의 직관</h3>
              <p className="text-muted-foreground leading-relaxed">
                4대째 이어져 온 청담해화당의 통찰력을 AI에 담았습니다.
                유려한 문체와 심도 깊은 리포트로 단순한 길흉화복을 넘어
                당신의 삶에 대한 철학적 해답을 제시합니다.
              </p>
            </div>
          </section>
        </div>

        <footer className="w-full py-12 border-t border-border/40 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground text-center md:text-left">
            <div>
              <p className="font-semibold text-foreground">© 2026 Haehwadang AI.</p>
              <p>Premium Fate Engineering Service.</p>
            </div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="mailto:contact@haehwadang.ai" className="hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
