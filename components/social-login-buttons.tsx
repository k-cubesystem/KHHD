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
    // 1. 기본 동작 및 버블링 원천 차단
    e.preventDefault();
    e.stopPropagation();

    if (!isMounted) {
      console.warn(`[OAuth] Attempted ${provider} login before mounting.`);
      return;
    }

    console.log(`[OAuth] 🚀 Attempting ${provider} login... (Origin: ${window.location.origin})`);

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
        console.log(`[OAuth] ${provider} redirect success, forcing navigation to:`, data.url);
        window.location.href = data.url;
        // 페이지가 이동되므로 isLoading을 false로 되돌리지 않음 (스피너 유지)
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
        className="w-full h-12 flex items-center justify-center gap-2 border-primary/20 hover:bg-primary/5 transition-all duration-300 glass hover:border-red-500/30 group"
        onClick={(e) => handleLogin(e, "google")}
      >
        <Chrome className={cn("w-5 h-5 transition-colors", isLoading === "google" ? "animate-spin" : "text-red-500 group-hover:text-red-600")} />
        <span className="font-medium">{isLoading === "google" ? "연결 중..." : "Google로 시작하기"}</span>
      </Button>

      {/* 카카오 로그인 버튼 */}
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
