import { SignUpForm } from "@/components/sign-up-form";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 overflow-hidden bg-ink-950 text-white font-serif">

      {/* 1. Background Layer (Hanok Night) */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: "url('/images/hanok-night-hero.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/60 via-ink-950/80 to-ink-950/95 z-0" />

      {/* 2. Content Container */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">

        {/* Header: Logo & Title */}
        <Link href="/" className="flex flex-col items-center gap-4 group">
          <div className="w-12 h-12 flex items-center justify-center border border-gold-500/30 bg-ink-900/50 backdrop-blur-sm rounded-lg relative overflow-hidden transition-all duration-500 group-hover:border-gold-400 group-hover:shadow-[0_0_15px_rgba(251,191,36,0.2)]">
            <span className="font-gungseo font-bold text-2xl text-gold-400 pt-1">海</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="font-gungseo font-bold text-xl md:text-2xl tracking-[0.3em] text-white drop-shadow-lg">
              청담해화당
            </span>
            <div className="flex items-center gap-2 opacity-60">
              <div className="h-px w-6 bg-gold-400/50" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-gold-200 font-sans">Sign Up</span>
              <div className="h-px w-6 bg-gold-400/50" />
            </div>
          </div>
        </Link>

        {/* Sign Up Form Card */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-xl shadow-2xl">
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-gold-400" /></div>}>
            <SignUpForm />
          </Suspense>
        </div>

        {/* Footer Links */}
        <div className="flex gap-2 text-xs text-white/40 font-sans tracking-wide">
          <span>이미 계정이 있으신가요?</span>
          <Link href="/auth/login" className="text-gold-400 hover:text-gold-300 hover:underline transition-colors font-medium">
            로그인하기
          </Link>
        </div>

      </div>
    </div>
  );
}
