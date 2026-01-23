import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSubscriptionStatus, getSubscriptionPayments } from "@/app/actions/subscription-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Calendar, CreditCard, Clock, History, Gift, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { SubscriptionActions } from "@/components/membership/subscription-actions";

export default async function MembershipManagePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    const { isSubscribed, subscription, plan } = await getSubscriptionStatus();

    // 구독이 없으면 가입 페이지로
    if (!subscription) {
        return redirect("/protected/membership");
    }

    const payments = await getSubscriptionPayments(5);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    };

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString() + "원";
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
            ACTIVE: { label: "구독 중", variant: "default" },
            CANCELLED: { label: "해지 예정", variant: "secondary" },
            EXPIRED: { label: "만료됨", variant: "outline" },
            PAYMENT_FAILED: { label: "결제 실패", variant: "destructive" },
            PAUSED: { label: "일시 중지", variant: "secondary" },
            PENDING: { label: "대기 중", variant: "outline" },
        };
        return statusMap[status] || { label: status, variant: "outline" as const };
    };

    const statusInfo = getStatusBadge(subscription.status);
    const isCancelled = subscription.status === "CANCELLED";
    const periodEndDate = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
    const daysRemaining = periodEndDate ? Math.ceil((periodEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    return (
        <div className="min-h-screen py-12 px-4 md:px-6 bg-zen-bg animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-zen-text">
                            멤버십 관리
                        </h1>
                        <p className="text-zen-muted mt-1">
                            구독 상태와 결제 내역을 확인하세요.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Crown className="w-6 h-6 text-zen-gold" />
                        <Badge className={`
                            ${statusInfo.variant === "default" ? "bg-zen-gold text-white" : ""}
                            ${statusInfo.variant === "secondary" ? "bg-amber-100 text-amber-700" : ""}
                            ${statusInfo.variant === "destructive" ? "bg-red-100 text-red-700" : ""}
                            ${statusInfo.variant === "outline" ? "bg-gray-100 text-gray-600" : ""}
                            rounded-sm px-3 py-1 font-bold
                        `}>
                            {statusInfo.label}
                        </Badge>
                    </div>
                </div>

                {/* Cancellation Notice */}
                {isCancelled && periodEndDate && (
                    <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-amber-800">해지 예정</p>
                            <p className="text-sm text-amber-700">
                                {formatDate(subscription.current_period_end)}까지 모든 혜택을 이용할 수 있습니다.
                                ({daysRemaining}일 남음)
                            </p>
                        </div>
                    </div>
                )}

                {/* Subscription Info Card */}
                <Card className="bg-white border-zen-border rounded-sm shadow-sm overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-zen-gold/60 via-zen-gold to-zen-gold/60" />
                    <CardHeader className="bg-zen-bg/30">
                        <CardTitle className="font-serif font-bold text-xl text-zen-text flex items-center gap-2">
                            <Gift className="w-5 h-5 text-zen-wood" />
                            {plan?.name || "해화 멤버십"}
                        </CardTitle>
                        <CardDescription className="text-zen-muted">
                            {plan?.description || "프리미엄 멤버십 서비스"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 구독 기간 */}
                            <div className="flex items-start gap-4 p-4 bg-zen-bg/50 rounded-sm">
                                <div className="w-10 h-10 bg-zen-wood/10 rounded-sm flex items-center justify-center flex-shrink-0">
                                    <Calendar className="w-5 h-5 text-zen-wood" />
                                </div>
                                <div>
                                    <p className="text-sm text-zen-muted mb-1">현재 구독 기간</p>
                                    <p className="font-bold text-zen-text">
                                        {formatDate(subscription.current_period_start)} ~ {formatDate(subscription.current_period_end)}
                                    </p>
                                </div>
                            </div>

                            {/* 다음 결제일 */}
                            <div className="flex items-start gap-4 p-4 bg-zen-bg/50 rounded-sm">
                                <div className="w-10 h-10 bg-zen-wood/10 rounded-sm flex items-center justify-center flex-shrink-0">
                                    <CreditCard className="w-5 h-5 text-zen-wood" />
                                </div>
                                <div>
                                    <p className="text-sm text-zen-muted mb-1">
                                        {isCancelled ? "구독 종료일" : "다음 결제일"}
                                    </p>
                                    <p className="font-bold text-zen-text">
                                        {isCancelled
                                            ? formatDate(subscription.current_period_end)
                                            : formatDate(subscription.next_billing_date)
                                        }
                                    </p>
                                    {!isCancelled && plan && (
                                        <p className="text-sm text-zen-muted">
                                            {formatCurrency(plan.price)} 결제 예정
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 마지막 결제 */}
                            <div className="flex items-start gap-4 p-4 bg-zen-bg/50 rounded-sm">
                                <div className="w-10 h-10 bg-zen-wood/10 rounded-sm flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-5 h-5 text-zen-wood" />
                                </div>
                                <div>
                                    <p className="text-sm text-zen-muted mb-1">마지막 결제일</p>
                                    <p className="font-bold text-zen-text">
                                        {formatDate(subscription.last_payment_date)}
                                    </p>
                                </div>
                            </div>

                            {/* 월간 부적 */}
                            <div className="flex items-start gap-4 p-4 bg-zen-bg/50 rounded-sm">
                                <div className="w-10 h-10 bg-zen-gold/10 rounded-sm flex items-center justify-center flex-shrink-0">
                                    <span className="text-xl">🧧</span>
                                </div>
                                <div>
                                    <p className="text-sm text-zen-muted mb-1">월간 부적 지급</p>
                                    <p className="font-bold text-zen-text">
                                        매월 {plan?.talismans_per_period || 10}장
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <SubscriptionActions
                            subscriptionId={subscription.id}
                            status={subscription.status}
                            periodEnd={subscription.current_period_end}
                        />
                    </CardContent>
                </Card>

                {/* Payment History */}
                <Card className="bg-white border-zen-border rounded-sm shadow-sm">
                    <CardHeader>
                        <CardTitle className="font-serif font-bold text-xl text-zen-text flex items-center gap-2">
                            <History className="w-5 h-5 text-zen-wood" />
                            결제 내역
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {payments.length === 0 ? (
                            <p className="text-center text-zen-muted py-8">
                                결제 내역이 없습니다.
                            </p>
                        ) : (
                            <div className="divide-y divide-zen-border">
                                {payments.map((payment) => (
                                    <div key={payment.id} className="py-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-zen-text">
                                                {formatDate(payment.created_at)}
                                            </p>
                                            <p className="text-sm text-zen-muted">
                                                주문번호: {payment.order_id.slice(0, 20)}...
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-zen-text">
                                                {formatCurrency(payment.amount)}
                                            </p>
                                            <Badge
                                                variant={payment.status === "SUCCESS" ? "default" : "destructive"}
                                                className={`rounded-sm text-xs ${payment.status === "SUCCESS" ? "bg-green-100 text-green-700" : ""}`}
                                            >
                                                {payment.status === "SUCCESS" ? "완료" : "실패"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Back Link */}
                <div className="text-center">
                    <Link href="/protected" className="text-zen-muted hover:text-zen-wood transition-colors">
                        ← 대시보드로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    );
}
