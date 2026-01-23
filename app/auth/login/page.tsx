import { LoginForm } from "@/components/login-form";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SimpleTyping } from "@/components/ui/simple-typing";
import Link from "next/link";

export default function Page() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 overflow-hidden bg-zen-bg bg-hanji text-zen-text selection:bg-zen-gold/30">

      {/* Background Decorative Elements (Zen Style) - 은은하게 유지 */}
      <div className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-zen-gold/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-zen-wood/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="z-10 w-full max-w-lg flex flex-col items-center gap-12 animate-in fade-in duration-1000">

        {/* 1. Header: Logo (Minimal) */}
        <Link href="/" className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center border border-zen-text rounded-sm relative overflow-hidden group hover:bg-zen-text transition-colors duration-500">
            <span className="font-serif font-bold text-lg text-zen-text group-hover:text-zen-bg z-10 transition-colors">海</span>
          </div>
          <span className="font-serif font-bold text-lg tracking-widest text-zen-text/80">청담해화당</span>
        </Link>

        {/* 2. Focus: Typing Message */}
        <div className="text-center py-4">
          <SimpleTyping
            messages={[
              "당신의 운명이 들려주는 이야기.",
              "가장 빛나는 계절을 찾아서.",
              "4대째 이어온 지혜, AI를 만나다."
            ]}
            className="text-2xl md:text-3xl font-serif font-medium text-zen-text leading-relaxed"
          />
        </div>

        {/* 3. Action: Login Form */}
        <div className="w-full">
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-zen-wood" /></div>}>
            <LoginForm />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
