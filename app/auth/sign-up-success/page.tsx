import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background text-foreground">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border-gold-500/30 bg-black/40 backdrop-blur-md shadow-2xl shadow-gold-900/10">
            <CardHeader className="text-center space-y-4 pt-10">
              <div className="mx-auto w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center border border-gold-500/30 mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-gold-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <CardTitle className="text-2xl font-serif text-gold-100">
                귀한 인연이 닿았습니다
              </CardTitle>
              <CardDescription className="text-zinc-400 text-sm break-keep">
                혜화당의 회원이 되신 것을 환영합니다.
                <br />
                이메일 인증을 완료하시면
                <br />
                당신의 운명을 밝히는 여정이 시작됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-10">
              <div className="flex flex-col gap-4">
                <p className="text-xs text-center text-zinc-500 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 break-keep">
                  입력하신 이메일로 인증 링크가 발송되었습니다.
                  <br />
                  확인 후 아래 버튼을 눌러 로그인해주세요.
                </p>
                <div className="pt-2">
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-semibold shadow-lg shadow-gold-900/20 active:scale-[0.98] transition-all"
                  >
                    <Link href="/auth/login">로그인하러 가기</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
