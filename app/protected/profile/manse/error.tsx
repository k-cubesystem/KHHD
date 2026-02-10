'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
            <Card className="p-8 bg-white/5 border-white/10 max-w-md text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>

                <h2 className="text-2xl font-bold mb-4">페이지 로딩 오류</h2>

                <p className="text-muted-foreground mb-6">
                    만세력 페이지를 불러오는 중 문제가 발생했습니다.
                </p>

                {process.env.NODE_ENV === 'development' && (
                    <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-left">
                        <p className="text-xs text-red-400 font-mono break-all">
                            {error.message}
                        </p>
                    </div>
                )}

                <div className="flex gap-3 justify-center">
                    <Button
                        onClick={reset}
                        className="bg-[#D4AF37] hover:bg-[#F4E4BA] text-background"
                    >
                        다시 시도
                    </Button>
                    <Button
                        onClick={() => window.location.href = '/protected'}
                        variant="outline"
                    >
                        홈으로
                    </Button>
                </div>
            </Card>
        </div>
    );
}
