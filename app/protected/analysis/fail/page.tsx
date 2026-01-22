"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function PaymentFailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const code = searchParams.get("code");
    const message = searchParams.get("message");

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
            <div className="relative">
                <div className="absolute -inset-4 bg-red-500/20 blur-xl rounded-full" />
                <AlertCircle className="w-20 h-20 text-red-500 relative animate-bounce" />
            </div>

            <div className="text-center space-y-3 max-w-md">
                <h2 className="text-3xl font-black text-white">결제에 실패했습니다</h2>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-sm text-muted-foreground mb-1">에러 코드: {code || "UNKNOWN"}</p>
                    <p className="text-base text-red-400 font-medium">{message || "알 수 없는 오류가 발생했습니다. 다시 시도해 주세요."}</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                <Link href="/protected/analysis" className="flex-1">
                    <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5">
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        분석 단계로 돌아가기
                    </Button>
                </Link>
                <Button
                    onClick={() => window.location.reload()}
                    className="flex-1 h-12 rounded-xl bg-white text-black hover:bg-white/90 font-bold"
                >
                    새로고침
                </Button>
            </div>

            <p className="text-xs text-muted-foreground/50">
                문제가 지속되면 고객센터나 관리자에게 문의해 주세요.
            </p>
        </div>
    );
}
