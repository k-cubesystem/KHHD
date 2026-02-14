"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import SocialLoginButtons from "@/components/social-login-buttons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL에서 OAuth 오류 메시지 확인
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/protected");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleLogin}>
        <div className="flex flex-col gap-5 outline-none focus-visible:outline-none">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-gold-100/60 text-xs font-bold uppercase tracking-wider">이메일</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent border-0 border-b border-white/20 focus:border-gold-500 focus:ring-0 focus:outline-none transition-all h-12 text-white placeholder:text-white/30 rounded-none px-0 shadow-none hover:shadow-none"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-gold-100/60 text-xs font-bold uppercase tracking-wider">비밀번호</Label>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-transparent border-0 border-b border-white/20 focus:border-gold-500 focus:ring-0 focus:outline-none transition-all h-12 text-white rounded-none px-0 shadow-none hover:shadow-none"
            />
          </div>
          {error && (
            <div className="p-3 rounded-none bg-red-500/10 border border-red-500/20 text-xs text-red-400 animate-in fade-in slide-in-from-top-1 text-center">
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full h-12 font-bold bg-gold-500 text-ink-950 hover:bg-gold-400 active:scale-[0.98] transition-all rounded-none shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:shadow-[0_0_25px_rgba(234,179,8,0.4)] mt-2 font-serif tracking-wide"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>운명의 문을 여는 중...</span>
              </div>
            ) : "로그인"}
          </Button>

          <SocialLoginButtons />
        </div>
        <div className="mt-8 text-center text-sm text-white/30 font-sans">
          계정이 없으신가요?{" "}
          <Link
            href="/auth/sign-up"
            className="text-gold-400 hover:text-gold-300 underline underline-offset-4 font-bold transition-colors"
          >
            회원가입
          </Link>
        </div>
      </form>
    </div>
  );
}
