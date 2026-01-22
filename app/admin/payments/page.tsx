import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { CreditCard, TrendingUp, Calendar } from "lucide-react";
import { PaymentManagementClient } from "./payment-management-client";

async function getPayments() {
  const supabase = await createClient();

  const { data: payments, error } = await supabase
    .from("payments")
    .select(
      `
      id,
      order_id,
      amount,
      status,
      created_at,
      profiles:user_id (id, full_name)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Admin] Error fetching payments:", error);
    return { payments: [], stats: { total: 0, completed: 0, pending: 0 } };
  }

  const allPayments = payments || [];
  const completed = allPayments.filter((p) => p.status === "completed");
  const pending = allPayments.filter((p) => p.status === "pending");

  const totalRevenue = completed.reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    payments: allPayments,
    stats: {
      total: totalRevenue,
      completed: completed.length,
      pending: pending.length,
    },
  };
}

export default async function AdminPaymentsPage() {
  const { payments, stats } = await getPayments();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black">결제 내역</h1>
        <p className="text-sm text-muted-foreground mt-1">
          전체 결제 내역과 매출 현황을 확인합니다.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white/5 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">총 매출</p>
              <p className="text-2xl font-black mt-1">
                {stats.total.toLocaleString()}원
              </p>
            </div>
            <div className="p-3 rounded-xl bg-green-400/10">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-white/5 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">완료된 결제</p>
              <p className="text-2xl font-black mt-1">{stats.completed}건</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-400/10">
              <CreditCard className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-white/5 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">대기 중</p>
              <p className="text-2xl font-black mt-1">{stats.pending}건</p>
            </div>
            <div className="p-3 rounded-xl bg-yellow-400/10">
              <Calendar className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Payments Table with Filters */}
      <Card className="p-6 bg-white/5 border-white/10">
        <h2 className="text-lg font-bold mb-4">결제 목록</h2>
        <PaymentManagementClient initialPayments={payments as any} />
      </Card>
    </div>
  );
}
