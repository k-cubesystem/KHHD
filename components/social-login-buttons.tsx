"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Chrome, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";

export default function SocialLoginButtons() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogin = async (e: React.MouseEvent, provider: "google" | "kakao") => {
    e.preventDefault();
    e.stopPropagation();

    if (!isMounted || typeof window === "undefined") return;

    console.log(`[OAuth] 🚀 Attempting ${provider} login...`);

    try {
      setIsLoading(provider);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error(`[OAuth] ${provider} error:`, error);
        alert(`${provider} 로그인 중 오류가 발생했습니다: ${error.message}`);
        setIsLoading(null);
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        setIsLoading(null);
      }
    } catch (err) {
      console.error(`[OAuth] Unexpected exception:`, err);
      setIsLoading(null);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-3 w-full max-w-sm mx-auto opacity-50 pointer-events-none">
        <div className="w-full h-12 bg-muted animate-pulse rounded-md" />
        <div className="w-full h-12 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      <Button
        type="button"
        variant="outline"
        disabled={isLoading !== null}
        className="w-full h-12 bg-white text-black border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
        onClick={(e) => handleLogin(e, "google")}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="font-medium">{isLoading === "google" ? "연결 중..." : "Google로 시작하기"}</span>
      </Button>

      <Button
        type="button"
        disabled={isLoading !== null}
        className="w-full h-12 flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD835] text-black border-none transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
        onClick={(e) => handleLogin(e, "kakao")}
      >
        <MessageCircle className={cn("w-5 h-5 fill-current", isLoading === "kakao" && "animate-bounce")} />
        <span className="font-medium">{isLoading === "kakao" ? "카카오 연결 중..." : "카카오로 시작하기"}</span>
      </Button>
    </div>
  );
}
