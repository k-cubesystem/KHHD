import { LoginForm } from "@/components/login-form";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 overflow-hidden bg-background text-foreground selection:bg-primary/30 font-serif">

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-5 pointer-events-none mix-blend-overlay" />
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="z-10 w-full max-w-lg flex flex-col items-center gap-10 animate-in fade-in duration-1000">

        {/* 1. Header: Logo */}
        <Link href="/" className="flex flex-col items-center gap-4 group">
          <div className="w-12 h-12 flex items-center justify-center border border-primary/30 bg-background/50 backdrop-blur-sm rounded-md relative overflow-hidden transition-all duration-500 group-hover:border-primary">
            <span className="font-serif font-bold text-xl text-primary">海</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-serif font-bold text-lg tracking-[0.3em] text-white">청담해화당</span>
            <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground font-sans">Cheongdam Haehwadang</span>
          </div>
        </Link>

        {/* 2. Message */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-light text-white/90">
            운명의 <span className="text-primary font-normal">결</span>을 읽다
          </h1>
          <p className="text-sm text-muted-foreground font-sans font-light">
            데이터로 마주하는 당신의 고유한 패턴
          </p>
        </div>

        {/* 3. Login Form Container */}
        <div className="w-full bg-card/50 backdrop-blur-sm border border-border p-8 rounded-lg shadow-2xl">
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>}>
            <LoginForm />
          </Suspense>
        </div>

        <div className="flex gap-6 text-xs text-muted-foreground font-sans tracking-wide">
          <Link href="/auth/reset-password">비밀번호 찾기</Link>
          <span className="text-border">|</span>
          <Link href="/auth/sign-up" className="text-primary hover:underline">회원가입</Link>
        </div>

      </div>
    </div>
  );
}
