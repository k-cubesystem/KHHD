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
      <Card className="border-zen-border bg-white/80 backdrop-blur-md shadow-lg text-zen-text overflow-hidden group relative rounded-[var(--radius)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-zen-gold/50" />
        <CardHeader className="space-y-2 pt-10">
          <CardTitle className="text-3xl font-serif font-bold tracking-tight text-center text-zen-text">
            해화당 시작하기
          </CardTitle>
          <CardDescription className="text-center text-zen-muted font-sans tracking-wide">
            운명의 흐름을 읽는 첫 걸음
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 px-8 pb-10">
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-zen-text text-xs font-bold uppercase tracking-wider pl-1">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-zen-border focus:border-zen-gold focus:ring-zen-gold/20 transition-all h-12 text-zen-text placeholder:text-zen-muted/50 rounded-sm"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-zen-text text-xs font-bold uppercase tracking-wider pl-1">비밀번호</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-zen-wood hover:text-zen-gold transition-colors hover:underline"
                  >
                    비밀번호 찾기
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border-zen-border focus:border-zen-gold focus:ring-zen-gold/20 transition-all h-12 text-zen-text rounded-sm"
                />
              </div>
              {error && (
                <div className="p-3 rounded-sm bg-red-50 border border-red-200 text-xs text-red-600 animate-in fade-in slide-in-from-top-1 text-center">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full h-12 font-bold bg-zen-wood text-white hover:bg-[#7A604D] active:scale-[0.98] transition-all rounded-sm shadow-sm mt-2 font-serif tracking-wide"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>운명의 문을 여는 중...</span>
                  </div>
                ) : "로그인"}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zen-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-zen-muted font-bold">Or continue with</span>
                </div>
              </div>

              <SocialLoginButtons />
            </div>
            <div className="mt-8 text-center text-sm text-zen-muted font-sans">
              계정이 없으신가요?{" "}
              <Link
                href="/auth/sign-up"
                className="text-zen-wood hover:text-zen-gold underline underline-offset-4 font-bold transition-colors"
              >
                회원가입
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
