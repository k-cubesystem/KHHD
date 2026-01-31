import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardStats, AnimatedHeader } from "@/components/admin/dashboard-stats";
import { Users, CreditCard, Package, Sparkles, Activity } from "lucide-react";

async function getStats() {
  // Service Role을 사용하여 RLS 우회
  const supabase = createAdminClient();

  // 1. 총 회원수
  const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });

  // 2. 총 매출 (완료된 결제)
  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("status", "completed");

  const totalRevenue = payments?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

  // 3. 총 분석 건수
  const { count: recordCount } = await supabase.from("saju_records").select("*", { count: "exact", head: true });

  // 4. 최근 가입자 (오늘)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: newUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  return {
    userCount: userCount || 0,
    totalRevenue: totalRevenue || 0,
    recordCount: recordCount || 0,
    newUsers: newUsers || 0,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      label: "총 회원수",
      value: `${stats.userCount.toLocaleString()}명`,
      sub: `오늘 신규 ${stats.newUsers}명`,
      iconKey: "users",
      color: "text-blue-400",
    },
    {
      label: "누적 매출",
      value: `₩${stats.totalRevenue.toLocaleString()}`,
      sub: "결제 완료 기준",
      iconKey: "revenue",
      color: "text-[#D4AF37]",
    },
    {
      label: "생성된 비록",
      value: `${stats.recordCount.toLocaleString()}건`,
      sub: "AI 분석 완료",
      iconKey: "records",
      color: "text-purple-400",
    },
    {
      label: "시스템 상태",
      value: "정상",
      sub: "All Systems Operational",
      iconKey: "system",
      color: "text-green-400",
    },
  ];

  return (
    <>
      <AnimatedHeader title="Dashboard" subtitle="해화당 서비스 현황 개요" />

      <DashboardStats cards={cards} />

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Quick Actions */}
        <div className="bg-surface/30 border border-primary/20 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-primary" />
            <h2 className="text-xl font-serif font-bold text-ink-light">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/admin/users"
              className="p-4 bg-surface/50 border border-primary/10 hover:border-primary/30 transition-colors group"
            >
              <div className="text-primary/60 group-hover:text-primary transition-colors mb-2">
                <Users className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="text-sm font-serif text-ink-light">회원 관리</div>
            </a>
            <a
              href="/admin/payments"
              className="p-4 bg-surface/50 border border-primary/10 hover:border-primary/30 transition-colors group"
            >
              <div className="text-primary/60 group-hover:text-primary transition-colors mb-2">
                <CreditCard className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="text-sm font-serif text-ink-light">결제 내역</div>
            </a>
            <a
              href="/admin/membership/plans"
              className="p-4 bg-surface/50 border border-primary/10 hover:border-primary/30 transition-colors group"
            >
              <div className="text-primary/60 group-hover:text-primary transition-colors mb-2">
                <Package className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="text-sm font-serif text-ink-light">스토어</div>
            </a>
            <a
              href="/admin/prompts"
              className="p-4 bg-surface/50 border border-primary/10 hover:border-primary/30 transition-colors group"
            >
              <div className="text-primary/60 group-hover:text-primary transition-colors mb-2">
                <Sparkles className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="text-sm font-serif text-ink-light">AI 프롬프트</div>
            </a>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-surface/30 border border-primary/20 p-6 backdrop-blur-sm border-dashed">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-seal" />
            <h2 className="text-xl font-serif font-bold text-ink-light">Recent Activity</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="w-12 h-12 text-ink-light/20 mb-4" strokeWidth={1} />
            <p className="text-sm text-ink-light/60 font-light">실시간 활동 로그</p>
            <p className="text-xs text-ink-light/40 mt-2">곧 업데이트됩니다</p>
          </div>
        </div>
      </div>
    </>
  );
}
