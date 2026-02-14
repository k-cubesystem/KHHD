"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTier: "SINGLE" | "FAMILY" | "BUSINESS" | null;
    limitType: "talisman" | "relationship" | "storage";
    message: string;
}

const benefits = {
    SINGLE: [
        "일일 복채 10만냥 (매일 자정 리셋)",
        "인연 등록 3명",
        "분석 결과 10개 저장",
    ],
    FAMILY: [
        "일일 복채 30만냥 (3배)",
        "인연 등록 10명",
        "분석 결과 50개 저장",
        "가족 인연 네트워크 시각화",
        "복채 15% 보너스",
    ],
    BUSINESS: [
        "일일 복채 100만냥 (무제한에 가까움)",
        "인연 등록 50명",
        "분석 결과 무제한 저장",
        "복채 20% 보너스",
        "우선 고객 지원",
    ],
};

const tierLabels = {
    SINGLE: "싱글",
    FAMILY: "패밀리",
    BUSINESS: "비즈니스",
};

/**
 * 업그레이드 유도 모달
 * 한도 초과 시 자동으로 표시되며 상위 플랜으로 업그레이드를 유도
 */
export function UpgradeModal({
    isOpen,
    onClose,
    currentTier,
    limitType,
    message,
}: UpgradeModalProps) {
    const router = useRouter();

    // 추천 플랜 결정
    const recommendedTier =
        currentTier === "SINGLE" ? "FAMILY" : currentTier === "FAMILY" ? "BUSINESS" : "BUSINESS";

    const handleUpgrade = () => {
        router.push("/protected/membership");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Crown className="w-6 h-6 text-zen-gold" />
                        한도 도달
                    </DialogTitle>
                </DialogHeader>

                {/* 메시지 */}
                <div className="py-4">
                    <p className="text-zen-text">{message}</p>
                </div>

                {/* 추천 플랜 혜택 */}
                <div className="bg-gradient-to-br from-zen-gold/10 to-zen-gold/5 border-2 border-zen-gold rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-zen-gold" />
                        <h3 className="text-lg font-bold text-zen-text">
                            {tierLabels[recommendedTier]} 추천
                        </h3>
                    </div>
                    <ul className="space-y-2">
                        {benefits[recommendedTier].map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-zen-text">
                                <Check className="w-4 h-4 text-zen-gold flex-shrink-0 mt-0.5" />
                                <span>{benefit}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 버튼 */}
                <div className="flex gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-zen-border hover:bg-zen-bg"
                    >
                        나중에
                    </Button>
                    <Button
                        onClick={handleUpgrade}
                        className="flex-1 bg-zen-gold text-white hover:bg-[#C4A661] font-bold"
                    >
                        <Crown className="w-4 h-4 mr-2" />
                        업그레이드
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
