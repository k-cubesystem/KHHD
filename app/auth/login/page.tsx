import { LoginForm } from "@/components/login-form";
import { Suspense } from "react";
import { Loader2, Flower } from "lucide-react";
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
        <div className="flex flex-col items-center gap-5 md:gap-8">
          {/* Welcome Label */}
          <span className="font-gungseo text-lg md:text-xl lg:text-2xl font-bold tracking-[0.5em] text-gold-400 animate-in fade-in duration-1000">
            청담해화당
          </span>

          {/* Decorative Divider */}
          <div className="flex items-center gap-3 md:gap-4 opacity-80 animate-in fade-in duration-1000 delay-100">
            <div className="h-px w-8 md:w-12 bg-gold-400/50" />
            <Flower className="w-4 h-4 md:w-5 md:h-5 text-gold-400" strokeWidth={1} />
            <div className="h-px w-8 md:w-12 bg-gold-400/50" />
          </div>
        </div>

        {/* Login Form Card */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-xl shadow-2xl">
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-gold-400" /></div>}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer Links */}
        {/* Footer Links (Redesigned) */}
        <div className="flex flex-col items-center gap-4 mt-2">

          {/* Divider Line */}
          <div className="w-full max-w-[200px] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="flex items-center justify-center gap-6 font-sans text-sm tracking-wide">
            <Link
              href="/auth/reset-password"
              className="text-white/50 hover:text-white transition-colors duration-300"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
