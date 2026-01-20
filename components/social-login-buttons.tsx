"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Chrome, MessageCircle } from "lucide-react";

export default function SocialLoginButtons() {
  const supabase = createClient();

  const handleLogin = async (provider: "google" | "kakao") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error(`${provider} login error:`, error.message);
      alert(`${provider} 로그인 중 오류가 발생했습니다.`);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      {/* 구글 로그인 버튼 */}
      <Button
        variant="outline"
        className="w-full h-12 flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50 transition-colors"
        onClick={() => handleLogin("google")}
      >
        <Chrome className="w-5 h-5 text-red-500" />
        <span className="font-medium text-gray-700">Google로 시작하기</span>
      </Button>

      {/* 카카오 로그인 버튼 */}
      <Button
        className="w-full h-12 flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD835] text-black border-none transition-colors"
        onClick={() => handleLogin("kakao")}
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        <span className="font-medium">카카오로 시작하기</span>
      </Button>
    </div>
  );
}
