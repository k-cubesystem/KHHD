import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminLayoutClient } from "@/components/admin/admin-layout-client";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Bell,
  Sparkles,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Middleware에서 이미 체크하지만, Double Check for Safety
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // TEMPORARY: Admin 체크 비활성화 (RLS 무한 재귀 문제로 인해)
  // TODO: Supabase RLS 정책 수정 후 다시 활성화
  console.log("[ADMIN LAYOUT] Bypassing role check (temporary)", {
    userId: user.id,
    email: user.email,
  });

  /* 원래 코드 (RLS 정책 수정 후 복구)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect("/protected");
  }
  */

  const menuItems = [
    { href: "/admin", label: "대시보드", icon: "LayoutDashboard" },
    { href: "/admin/users", label: "회원 관리", icon: "Users" },
    { href: "/admin/payments", label: "결제 내역", icon: "CreditCard" },
    { href: "/admin/membership/plans", label: "스토어 관리", icon: "Package" },
    { href: "/admin/notifications", label: "알림 및 자동화", icon: "Bell" },
    { href: "/admin/prompts", label: "AI 프롬프트 관리", icon: "Sparkles" },
    { href: "/admin/service-control", label: "서비스 키/스위치", icon: "Power" },
  ];

  return <AdminLayoutClient menuItems={menuItems}>{children}</AdminLayoutClient>;
}
