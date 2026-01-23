import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { Sparkles, ArrowRight, Quote, ShieldCheck, Zap, Cloud, Map, User, Scroll, Fingerprint } from "lucide-react";
import { SimpleTyping } from "@/components/ui/simple-typing";
import { ReviewMarquee } from "@/components/landing/review-marquee";
import { LiveMemberCounter } from "@/components/landing/live-member-counter";

export default function Home() {
  return (
    <div className="min-h-screen bg-zen-bg text-zen-text selection:bg-zen-gold/30 flex flex-col items-center overflow-x-hidden relative font-sans">

      {/* Background Ambience */}
      <div className="fixed inset-0 bg-hanji pointer-events-none opacity-50 z-[1]" />
      <div className="fixed top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-zen-gold/5 rounded-full blur-[150px] -z-10" />

      <SiteHeader />

      {/* 1. Hero Section */}
      <section className="relative w-full max-w-7xl px-6 pt-32 md:pt-48 pb-20 flex flex-col items-center text-center z-10">
        <div className="animate-in fade-in slide-in-from-top-4 duration-1000 flex flex-col items-center">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-zen-border mb-8 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-zen-gold" />
            <span className="text-xs font-bold text-zen-wood tracking-widest uppercase">Traditional Wisdom meets AI</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight leading-tight mb-8 text-balance">
            당신의 가장 <span className="text-zen-wood italic relative">빛나는 계절<span className="absolute bottom-1 left-0 w-full h-1/3 bg-zen-gold/20 -z-10"></span></span>을 <br />
            찾아드립니다
          </h1>

          <div className="h-16 mb-10 flex items-center justify-center">
            <SimpleTyping
              messages={[
                "운명의 흐름 속에 숨겨진 해답.",
                "해화당이 당신의 곁에서 길을 비춥니다.",
                "데이터로 읽어내는 당신만의 고유한 패턴."
              ]}
              className="text-base md:text-xl text-zen-muted font-sans font-light"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/auth/login">
              <Button className="h-14 px-8 text-lg bg-zen-wood text-white hover:bg-[#7A604D] rounded-sm font-serif font-bold shadow-lg hover:scale-[1.02] transition-all group">
                내 운명 분석 시작하기
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Live Social Proof */}
          <div className="mt-12 flex flex-col items-center gap-3 animate-in fade-in delay-500 duration-700">
            <div className="flex -space-x-4 items-center">
              <div className="w-10 h-10 rounded-full border-2 border-zen-bg bg-gray-200" />
              <div className="w-10 h-10 rounded-full border-2 border-zen-bg bg-gray-300" />
              <div className="w-10 h-10 rounded-full border-2 border-zen-bg bg-gray-400" />
              <div className="w-10 h-10 rounded-full border-2 border-zen-bg bg-zen-wood text-white flex items-center justify-center text-xs font-bold z-10">Running</div>
            </div>
            <p className="text-sm text-zen-muted font-sans">
              지금 <LiveMemberCounter />명의 마스터가 <br className="md:hidden" />자신의 운명을 개척하고 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Empathy Hook Section (Dark Theme) */}
      <section className="w-full bg-[#1A1616] py-24 px-6 text-center z-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zen-gold/30 to-transparent" />
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <Quote className="w-12 h-12 text-zen-gold/30 mx-auto mb-4" />
          <h2 className="text-2xl md:text-4xl font-serif font-medium text-white/90 leading-relaxed break-keep">
            "남들은 다 잘 살고 있는 줄 알아요.<br />
            <span className="text-zen-gold font-bold">내 속은 타들어가는데...</span>"
          </h2>
          <p className="text-white/50 text-sm md:text-base leading-loose max-w-2xl mx-auto font-light">
            불안한 미래, 반복되는 실패, 꼬여버린 인간관계.<br />
            당신의 노력이 부족해서가 아닙니다.<br />
            단지, 당신에게 맞는 <strong>'때(時)'</strong>와 <strong>'방향(方)'</strong>을 모르고 있었을 뿐입니다.
          </p>
        </div>
        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-zen-gold/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-zen-wood/20 rounded-full blur-[100px]" />
      </section>

      {/* 3. Brand Story Section */}
      <section className="w-full py-24 px-6 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

          <div className="order-2 md:order-1 relative h-[500px] bg-zen-wood/5 rounded-sm overflow-hidden border border-zen-border">
            {/* Image Placeholder (Use Generate Image tool later if needed, now abstract pattern) */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614730341194-75c6019120b1?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-80 mix-blend-multiply" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-9xl text-white opacity-20 font-bold">海</span>
            </div>
          </div>

          <div className="order-1 md:order-2 space-y-6">
            <div className="flex items-center gap-2 text-zen-wood font-bold tracking-widest text-xs uppercase">
              <Scroll className="w-4 h-4" />
              Heritage & Innovation
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-zen-text leading-tight">
              4대를 이어온 명리학,<br />
              <span className="text-zen-wood">AI를 만나다.</span>
            </h2>
            <div className="space-y-4 text-zen-muted leading-relaxed font-sans text-sm md:text-base">
              <p>
                청담해화당은 단순한 운세 앱이 아닙니다.
                조선 중기부터 이어져 온 정통 명리학의 방대한 빅데이터를
                현대적인 알고리즘으로 재해석한 <strong>'운명 공학(Fate Engineering)'</strong> 솔루션입니다.
              </p>
              <p>
                한 사람의 인생을 518,400가지의 경우의 수로 분석하여,
                두루뭉술한 위로가 아닌 <strong>구체적인 행동 지침</strong>을 제안합니다.
              </p>
            </div>
            <Link href="/auth/sign-up" className="inline-block pt-4">
              <span className="text-zen-wood font-bold border-b border-zen-wood hover:text-zen-text text-sm transition-colors">
                청담해화당 브랜드 스토리 더보기 →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Methodology Section (Cheon-Ji-In) */}
      <section className="w-full bg-white/50 py-24 border-y border-zen-border z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <span className="text-xs font-bold text-zen-gold tracking-[0.2em] uppercase">Core Technology</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-zen-text">천지인(天地人) 통합 분석 시스템</h2>
            <p className="text-zen-muted text-sm max-w-xl mx-auto">
              운명은 고정된 것이 아닙니다. 타고난 기운(天), 환경(地), 그리고 당신의 의지(人)가<br className="hidden md:block" />
              상호작용하며 만들어가는 유기적인 흐름입니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Cheon */}
            <div className="bg-white border border-zen-border p-8 rounded-sm hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-lg group">
              <div className="w-14 h-14 bg-zen-bg rounded-full flex items-center justify-center mb-6 group-hover:bg-zen-gold/10 transition-colors">
                <Cloud className="w-7 h-7 text-zen-wood group-hover:text-zen-gold" />
              </div>
              <h3 className="text-xl font-serif font-bold text-zen-text mb-3">天 (하늘의 기운)</h3>
              <p className="text-sm text-zen-muted leading-relaxed">
                태어난 연월일시(四柱)에 담긴 선천적인 에너지 패턴을 분석합니다. 당신이 어떤 그릇인지, 어떤 계절에 피어날 꽃인지 명확히 규명합니다.
              </p>
            </div>

            {/* Ji */}
            <div className="bg-white border border-zen-border p-8 rounded-sm hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-lg group">
              <div className="w-14 h-14 bg-zen-bg rounded-full flex items-center justify-center mb-6 group-hover:bg-zen-gold/10 transition-colors">
                <Map className="w-7 h-7 text-zen-wood group-hover:text-zen-gold" />
              </div>
              <h3 className="text-xl font-serif font-bold text-zen-text mb-3">地 (땅의 환경)</h3>
              <p className="text-sm text-zen-muted leading-relaxed">
                당신이 머무는 공간과 환경(풍수)이 운명에 미치는 영향을 계산합니다. 부족한 기운을 보완할 수 있는 최적의 방위와 공간을 제안합니다.
              </p>
            </div>

            {/* In */}
            <div className="bg-white border border-zen-border p-8 rounded-sm hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-lg group">
              <div className="w-14 h-14 bg-zen-bg rounded-full flex items-center justify-center mb-6 group-hover:bg-zen-gold/10 transition-colors">
                <User className="w-7 h-7 text-zen-wood group-hover:text-zen-gold" />
              </div>
              <h3 className="text-xl font-serif font-bold text-zen-text mb-3">人 (사람의 의지)</h3>
              <p className="text-sm text-zen-muted leading-relaxed">
                관상, 손금, 그리고 당신의 선택이 만드는 변화의 변수를 대입합니다. 정해진 운명을 넘어, 당신이 개척할 수 있는 최상의 시나리오를 제시합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Review Marquee Section */}
      <section className="w-full py-24 z-10 overflow-hidden">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-zen-text mb-4">
            이미 변화는 시작되었습니다
          </h2>
          <p className="text-zen-muted text-sm">
            해화당을 통해 자신의 계절을 찾은 분들의 실제 이야기
          </p>
        </div>
        <ReviewMarquee />
      </section>

      {/* 6. Closing Empathy & CTA */}
      <section className="relative w-full py-32 px-6 flex flex-col items-center text-center z-10 bg-zen-wood text-white overflow-hidden">
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />

        <div className="relative z-10 space-y-8 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-serif font-bold leading-tight">
            "이제, 당신의 차례입니다."
          </h2>
          <p className="text-white/80 text-lg leading-relaxed font-light">
            혼자 끙끙 앓던 밤들은 이제 그만두세요.<br />
            해화당이 당신의 가장 든든한 조언자가 되어드리겠습니다.
          </p>
          <div className="pt-8">
            <Link href="/auth/sign-up">
              <Button className="h-16 px-12 text-xl bg-white text-zen-wood hover:bg-zen-bg rounded-sm font-serif font-bold shadow-2xl hover:scale-[1.02] transition-all">
                내 운명 확인하기 (무료)
              </Button>
            </Link>
            <p className="mt-4 text-xs text-white/40">
              * 회원가입 시 평생 만세력 차트가 무료로 제공됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 border-t border-zen-border z-10 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1 space-y-4">
            <h2 className="font-serif font-bold text-xl text-zen-text">청담해화당</h2>
            <p className="text-xs text-zen-muted font-sans uppercase tracking-widest leading-loose">
              Premium Fortune Intelligence<br />
              Based on Oriental Wisdom
            </p>
          </div>
          <div className="col-span-1 md:col-span-3 flex flex-col md:flex-row justify-end gap-8 text-sm text-zen-muted font-sans">
            <div className="flex flex-col gap-2">
              <span className="font-bold text-zen-text mb-2">Service</span>
              <Link href="#" className="hover:text-zen-wood transition-colors">해화사주</Link>
              <Link href="#" className="hover:text-zen-wood transition-colors">천지인 분석</Link>
              <Link href="#" className="hover:text-zen-wood transition-colors">비록함</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-bold text-zen-text mb-2">Company</span>
              <Link href="#" className="hover:text-zen-wood transition-colors">브랜드 스토리</Link>
              <Link href="#" className="hover:text-zen-wood transition-colors">연구소 소개</Link>
              <Link href="#" className="hover:text-zen-wood transition-colors">채용</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-bold text-zen-text mb-2">Support</span>
              <Link href="#" className="hover:text-zen-wood transition-colors">이용약관</Link>
              <Link href="#" className="hover:text-zen-wood transition-colors">개인정보처리방침</Link>
              <Link href="#" className="hover:text-zen-wood transition-colors">고객지원</Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-zen-border/50 text-center md:text-left text-xs text-zen-muted font-mono">
          © 2026 Haehwadang AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
