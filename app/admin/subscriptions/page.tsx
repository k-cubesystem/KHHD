import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSubscriptions, getSubscriptionStats } from "./actions";
import { SubscriptionsTable } from "./subscriptions-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Users, XCircle, AlertTriangle, DollarSign } from "lucide-react";

export default async function AdminSubscriptionsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; status?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return redirect("/protected");
    }

    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const statusFilter = params.status || "ALL";

    const [stats, { subscriptions, total, totalPages }] = await Promise.all([
        getSubscriptionStats(),
        getSubscriptions(page, 20, statusFilter),
    ]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("ko-KR").format(amount) + "원";
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">구독 관리</h1>
                <p className="text-gray-500 mt-1">
                    멤버십 구독자 현황과 결제 상태를 관리합니다.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            활성 구독자
                        </CardTitle>
                        <Crown className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {stats.totalActive}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            해지 예정
                        </CardTitle>
                        <XCircle className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {stats.totalCancelled}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            만료됨
                        </CardTitle>
                        <Users className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {stats.totalExpired}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            결제 실패
                        </CardTitle>
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {stats.totalFailed}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-amber-700">
                            월 예상 수익
                        </CardTitle>
                        <DollarSign className="w-4 h-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-900">
                            {formatCurrency(stats.monthlyRevenue)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Subscriptions Table */}
            <SubscriptionsTable
                subscriptions={subscriptions}
                currentPage={page}
                totalPages={totalPages}
                total={total}
                statusFilter={statusFilter}
            />
        </div>
    );
}
