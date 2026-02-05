import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserTierLimits, getUserLimitsSummary } from "@/app/actions/membership-limits";
import { getWalletBalance } from "@/app/actions/wallet-actions";
import { getUserFiveElements } from "@/app/actions/saju-actions";
import { DashboardStats } from "@/components/premium/dashboard-stats";
import { FiveElementsRadar } from "@/components/premium/five-elements-radar";
import { MembershipBenefits } from "@/components/premium/membership-benefits";
import { Crown, Settings } from "lucide-react";
import Link from "next/link";

const tierLabels = {
    SINGLE: "싱글 등급",
    FAMILY: "패밀리 등급",
    BUSINESS: "비즈니스 등급",
};

const tierColors = {
    SINGLE: "text-gray-400",
    FAMILY: "text-zen-gold",
    BUSINESS: "text-amber-500",
};

/**
 * 프리미엄 대시보드 페이지
 * 멤버십 등급, 사용량 통계, 오행 분포, 혜택 정보를 한눈에 표시
 */
export default async function PremiumDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // 병렬 데이터 로드
    const [limits, summary, balance, fiveElementsResult] = await Promise.all([
        getUserTierLimits(),
        getUserLimitsSummary(),
        getWalletBalance(),
        getUserFiveElements(),
    ]);

    const tier = (limits?.tier || "SINGLE") as keyof typeof tierColors;

    return (
        <div className="min-h-screen bg-background">
            {/* Hanji Overlay */}
            <div className="hanji-overlay" />

            <div className="relative container mx-auto px-4 py-8 space-y-8">
                {/* Header: 등급 배지 */}
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Crown className={`w-8 h-8 ${tierColors[tier]}`} />
                        <div>
                            <h1 className="text-2xl font-bold text-zen-text font-serif">
                                {tierLabels[tier]}
                            </h1>
                            <p className="text-sm text-zen-muted">프리미엄 대시보드</p>
                        </div>
                    </div>
                    <Link
                        href="/protected/membership/manage"
                        className="flex items-center gap-2 px-4 py-2 bg-zen-wood text-white rounded-lg hover:bg-[#7A604D] transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        플랜 관리
                    </Link>
                </header>

                {/* Stats Grid (2x2) */}
                <section>
                    <h2 className="text-xl font-bold text-zen-text mb-4">사용 현황</h2>
                    <DashboardStats
                        balance={balance}
                        summary={summary}
                        tier={tier}
                    />
                </section>

                {/* 오행 차트 */}
                <section className="bg-surface/30 rounded-xl p-6 border border-zen-border">
                    <h2 className="text-xl font-bold text-zen-text mb-4 text-center">
                        나의 오행 분포
                    </h2>
                    {fiveElementsResult.success && fiveElementsResult.data ? (
                        <>
                            <FiveElementsRadar data={fiveElementsResult.data} />
                            {fiveElementsResult.balance && (
                                <div className="mt-6 text-center">
                                    <p className="text-sm text-zen-muted bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
                                        {fiveElementsResult.balance.advice}
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-zen-muted">{fiveElementsResult.error}</p>
                            <Link
                                href="/protected/profile/edit"
                                className="inline-block mt-4 px-4 py-2 bg-zen-gold text-white rounded-lg hover:bg-[#C4A661] transition-colors"
                            >
                                프로필 설정하기
                            </Link>
                        </div>
                    )}
                </section>

                {/* 멤버십 혜택 */}
                <MembershipBenefits tier={tier} />
            </div>
        </div>
    );
}
