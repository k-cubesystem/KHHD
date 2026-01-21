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
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push("/protected");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-primary/20 bg-black/40 backdrop-blur-xl shadow-2xl text-white overflow-hidden group">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
        <CardHeader className="space-y-1 pt-8">
          <CardTitle className="text-3xl font-bold tracking-tight text-center bg-gradient-to-b from-primary to-primary/60 bg-clip-text text-transparent">
            해화당 시작하기
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground/80">
            운명의 흐름을 읽는 첫 걸음
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 px-8 pb-10">
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-primary/80 font-medium">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-primary/10 focus:border-primary/40 focus:ring-primary/20 transition-all h-12"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password" className="text-primary/80 font-medium">비밀번호</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
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
                  className="bg-white/5 border-primary/10 focus:border-primary/40 focus:ring-primary/20 transition-all h-12"
                />
              </div>
              {error && (
                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-500 animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all active:scale-95"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>인증 중...</span>
                  </div>
                ) : "로그인"}
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-primary/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#121212] px-4 text-muted-foreground/50">또는</span>
                </div>
              </div>

              <SocialLoginButtons />
            </div>
            <div className="mt-8 text-center text-sm text-muted-foreground">
              계정이 없으신가요?{" "}
              <Link
                href="/auth/sign-up"
                className="text-primary hover:text-primary/80 underline underline-offset-4 font-medium transition-colors"
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
