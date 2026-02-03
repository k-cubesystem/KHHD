"use client";

import { useFeatureFlag, FeatureKey } from "@/hooks/use-feature-flag";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { toast } from "sonner";

interface FeatureGuardProps {
    feature: FeatureKey;
    children: React.ReactNode;
    fallback?: React.ReactNode; // 비활성 시 대체할 컴포넌트 (없으면 흐리게 처리)
    showLockIcon?: boolean;     // 자물쇠 아이콘 표시 여부
}

export function FeatureGuard({
    feature,
    children,
    fallback,
    showLockIcon = true
}: FeatureGuardProps) {
    const { isActive, loading, message } = useFeatureFlag(feature);

    if (loading) {
        // 로딩 중에는 일단 children을 흐리게 보여주거나 스켈레톤 처리
        // 여기서는 그냥 흐리게 처리
        return <div className="opacity-50 pointer-events-none">{children}</div>;
    }

    if (!isActive) {
        if (fallback) return <>{fallback}</>;

        // 기본 Fallback: 흐리게 처리하고 클릭 방지
        return (
            <div
                className="relative group cursor-not-allowed"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toast.error(message || "현재 점검 중인 기능입니다.");
                }}
            >
                <div className="opacity-40 grayscale pointer-events-none select-none filter blur-[1px]">
                    {children}
                </div>

                {showLockIcon && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="bg-black/80 text-white p-3 rounded-full backdrop-blur-md shadow-xl border border-white/10">
                            <Lock className="w-5 h-5" />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return <>{children}</>;
}
