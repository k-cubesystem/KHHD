import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Users, CreditCard, TrendingUp, Activity } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";

async function getStats() {
  const supabase = await createClient();

  // Check Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalUsers: 0, totalRevenue: 0, todayRevenue: 0, totalAnalyses: 0, recentPayments: [] };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { totalUsers: 0, totalRevenue: 0, todayRevenue: 0, totalAnalyses: 0, recentPayments: [] };

  // Use Admin Client if available
  let dbClient = supabase;
  try {
    dbClient = createAdminClient();
  } catch (e) {
    console.warn("getStats: Fallback to standard client");
  }

  // Get total users count
  const { count: totalUsers } = await dbClient
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // Get total revenue
  const { data: payments } = await dbClient
    .from("payments")
    .select("amount")
    .eq("status", "completed");

  const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  // Get today's payments
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayPayments } = await dbClient
    .from("payments")
    .select("amount")
    .eq("status", "completed")
    .gte("created_at", today.toISOString());

  const todayRevenue = todayPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  // Get total analyses
  const { count: totalAnalyses } = await dbClient
    .from("saju_records")
    .select("*", { count: "exact", head: true });

  // Get recent payments
  const { data: recentPayments } = await dbClient
    .from("payments")
    .select(`
      id,
      amount,
      status,
      created_at,
      profiles:user_id (full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    totalUsers: totalUsers || 0,
    totalRevenue,
    todayRevenue,
    totalAnalyses: totalAnalyses || 0,
    recentPayments: (recentPayments as Payment[]) || [],
  };
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  profiles: { full_name: string }[] | null;
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const statCards = [
    {
      label: "총 회원수",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      label: "총 매출",
      value: `${stats.totalRevenue.toLocaleString()}원`,
      icon: TrendingUp,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
    },
    {
      label: "오늘 매출",
      value: `${stats.todayRevenue.toLocaleString()}원`,
      icon: CreditCard,
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10",
    },
    {
      label: "총 분석 횟수",
      value: stats.totalAnalyses.toLocaleString(),
      icon: Activity,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black">대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">
          해화당 서비스 현황을 한눈에 확인하세요.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Payments */}
      <Card className="p-6 bg-white/5 border-white/10">
        <h2 className="text-lg font-bold mb-4">최근 결제 내역</h2>
        <div className="space-y-3">
          {stats.recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              결제 내역이 없습니다.
            </p>
          ) : (
            stats.recentPayments.map((payment: Payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {payment.profiles?.[0]?.full_name || "익명"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {payment.amount?.toLocaleString()}원
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${payment.status === "completed"
                      ? "bg-green-400/20 text-green-400"
                      : payment.status === "pending"
                        ? "bg-yellow-400/20 text-yellow-400"
                        : "bg-red-400/20 text-red-400"
                      }`}
                  >
                    {payment.status === "completed"
                      ? "완료"
                      : payment.status === "pending"
                        ? "대기"
                        : "실패"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
