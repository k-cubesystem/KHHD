import { createClient } from "@/lib/supabase/server";
// import { Users, DollarSign, Activity, FileText } from "lucide-react"; // Removed: Icons handled in client component
import { DashboardStats, AnimatedHeader } from "@/components/admin/dashboard-stats";

async function getStats() {
  const supabase = await createClient();

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

      {/* TODO: Recent Activity Chart or List */}
      {/* TODO: Recent Activity Chart or List */}
      <div className="rounded-2xl border border-zen-border bg-white p-12 text-center text-zen-muted border-dashed">
        <div className="flex flex-col items-center gap-2">
          <p className="font-serif text-lg">상세 통계 분석</p>
          <p className="text-sm opacity-50">차트 및 주간 리포트 기능이 준비 중입니다.</p>
        </div>
      </div>
    </>
  );
}
