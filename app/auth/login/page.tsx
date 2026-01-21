import { LoginForm } from "@/components/login-form";
import { Link } from "lucide-react";
import Image from "next/image";

export default function Page() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-10 overflow-hidden bg-[#0A0A0A]">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[20%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none" />

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">

        {/* Left Column: Marketing Content (Migrated from Main Page) */}
        <div className="space-y-12 animate-in fade-in slide-in-from-left-4 duration-1000">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight">
              <span className="text-primary">운명</span>을<br />
              <span className="bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">설계하다.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
              전통 명리학과 현대 데이터 사이언스의 정교한 결합.<br />
              해화당(海華堂)이 당신의 삶에 숨겨진 패턴을 분석합니다.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="glass p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <h3 className="text-lg font-bold text-[#D4AF37] mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                The KAIST Algorithm
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                단순한 신비주의를 넘어섭니다. 데이터의 상호작용(Interaction) 분석을 통해
                성공 확률을 수치화하고 시뮬레이션합니다.
                <br />
                <span className="text-indigo-400 font-mono font-semibold text-xs mt-2 block">
                  天(Fate) + 人(Self) + 地(Environment) = Probability
                </span>
              </p>
            </div>

            <div className="glass p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <h3 className="text-lg font-bold text-[#D4AF37] mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                4대 계승자의 직관
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                4대째 이어져 온 청담해화당의 통찰력을 AI에 담았습니다.
                유려한 문체와 심도 깊은 리포트로 단순한 길흉화복을 넘어
                당신의 삶에 대한 철학적 해답을 제시합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-4 duration-1000 delay-200">
          <div className="w-full max-w-sm glass border-[#D4AF37]/20 shadow-2xl rounded-3xl p-1 relative group">
            <div className="absolute -inset-1 bg-gradient-to-br from-[#D4AF37]/30 to-transparent rounded-[1.7rem] blur-sm opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-[#0A0A0A]/90 backdrop-blur-xl rounded-2xl p-6">
              <LoginForm />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
