"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

function FailContent() {
    const searchParams = useSearchParams();
    const message = searchParams.get("message") || "결제 중 알 수 없는 오류가 발생했습니다.";

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-6 text-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-destructive" />
            </div>

            <div className="space-y-2">
                <h2 className="text-3xl font-black text-gold">결제에 실패했습니다</h2>
                <p className="text-muted-foreground whitespace-pre-wrap max-w-md mx-auto">
                    {message}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/protected/analysis">
                    <Button variant="outline" className="rounded-full gap-2 border-white/10 glass">
                        <ArrowLeft className="w-4 h-4" /> 분석실로 돌아가기
                    </Button>
                </Link>
                <Link href="https://tosspayments.com/support" target="_blank">
                    <Button variant="ghost" className="text-muted-foreground underline-offset-4 hover:underline">
                        고객센터 문의하기
                    </Button>
                </Link>
            </div>
        </div>
    );
}

export default function PaymentFailPage() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                    <Loader2 className="w-16 h-16 animate-spin text-primary" />
                </div>
            }
        >
            <FailContent />
        </Suspense>
    );
}
